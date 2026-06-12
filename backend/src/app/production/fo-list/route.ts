import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FoListCountRow = RowDataPacket & {
  total: number;
};

type FoListRow = RowDataPacket & {
  no_fo: string;
  order_date: Date | string | null;
  doc_date: Date | string | null;
  deadline_date: Date | string | null;
  datetime_lanjutan: Date | string | null;
  customer: string | null;
  qty_order: number | null;
  status_lanjutan: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const searchBy = url.searchParams.get("search_by")?.trim() ?? "no_fo";
    const statusCategory = url.searchParams.get("status_category") ?? "0";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const username = url.searchParams.get("username")?.trim() ?? "";
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 500);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    const baseWhereClause = `c.no_fo IS NOT NULL AND TRIM(c.no_fo) <> ''`;

    const uniqueFoSql = `
      SELECT
        TRIM(k.no_fo) AS no_fo,
        k.order_date AS order_date,
        k.doc_date AS doc_date,
        k.date_status AS datetime_lanjutan,
        k.customer AS customer,
        k.qty_order AS qty_order,
        k.ket_status AS status_lanjutan,
        k.deadline_date AS deadline_date,
        k.uang_muka AS uang_muka,
        k.sisa_tagihan AS sisa_tagihan,
        k.totalrp AS totalrp,
        k.jurnal AS jurnal,
        k.FinalQC_Packiing AS FinalQC_Packiing,
        k.Desain_Ready AS Desain_Ready,
        k.Start_Layout AS Start_Layout,
        k.Layout_ReadyPrint AS Layout_ReadyPrint,
        k.Start_Print AS Start_Print,
        k.Kain_ReadyPress AS Kain_ReadyPress,
        k.Ambil_Kain AS Ambil_Kain,
        k.Print_ReadyPress AS Print_ReadyPress,
        k.Start_Press AS Start_Press,
        k.Press_ReadyCut AS Press_ReadyCut,
        k.Start_Cut AS Start_Cut,
        k.Cut_ReadyJahit AS Cut_ReadyJahit,
        k.Start_Jahit AS Start_Jahit,
        k.Jahit_ReadyQC AS Jahit_ReadyQC,
        k.Start_QC AS Start_QC,
        k.QC_ReadyGudang AS QC_ReadyGudang,
        k.Final_Cust AS Final_Cust,
        NULL AS username
      FROM tb_kdfo k
      WHERE k.no_fo IS NOT NULL AND TRIM(k.no_fo) <> ''
    `;

    const getCategoryClause = (cat: number): string => {
      switch (cat) {
        case 1: // FO DP - Antrian
          return "unique_fo.uang_muka > 0 AND unique_fo.FinalQC_Packiing IS NULL";
        case 2: // FO DP + Non DP Antrian
          return "unique_fo.FinalQC_Packiing IS NULL";
        case 3: // FO Belum DP
          return "unique_fo.uang_muka = 0 AND unique_fo.sisa_tagihan = unique_fo.totalrp";
        case 4: // DP - Belum KLaim
          return "unique_fo.jurnal IS NULL AND unique_fo.uang_muka > 0";
        case 5: // Belum KLaim - FinalQC
          return "unique_fo.jurnal IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        case 6: // Proses Desain
          return "unique_fo.uang_muka IS NOT NULL AND unique_fo.Desain_Ready IS NULL";
        case 7: // Desain Ready
          return "unique_fo.Start_Layout IS NULL AND unique_fo.Desain_Ready IS NOT NULL";
        case 8: // Proses Susun Layout
          return "unique_fo.Start_Layout IS NOT NULL AND unique_fo.Layout_ReadyPrint IS NULL";
        case 9: // Layout Print Ready
          return "unique_fo.Layout_ReadyPrint IS NOT NULL AND unique_fo.Start_Print IS NULL";
        case 10: // Proses Persiapan Bahan Kain
          return "unique_fo.Kain_ReadyPress IS NULL AND unique_fo.Ambil_Kain IS NOT NULL";
        case 11: // Proses Printing
          return "(unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NULL) OR (unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NULL)";
        case 12: // Ready to Press
          return "unique_fo.Start_Press IS NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NOT NULL";
        case 13: // Proses Press
          return "unique_fo.Start_Press IS NOT NULL AND unique_fo.Press_ReadyCut IS NULL";
        case 14: // Kain Ready Cutting
          return "unique_fo.Start_Cut IS NULL AND unique_fo.Press_ReadyCut IS NOT NULL";
        case 15: // Proses Cutting
          return "unique_fo.Start_Cut IS NOT NULL AND unique_fo.Cut_ReadyJahit IS NULL";
        case 16: // Ready Jahit
          return "unique_fo.Start_Jahit IS NULL AND unique_fo.Cut_ReadyJahit IS NOT NULL";
        case 17: // Proses Jahit
          return "unique_fo.Start_Jahit IS NOT NULL AND unique_fo.Jahit_ReadyQC IS NULL";
        case 18: // Ready QC
          return "unique_fo.Start_QC IS NULL AND unique_fo.Jahit_ReadyQC IS NOT NULL";
        case 19: // Proses QC
          return "unique_fo.Start_QC IS NOT NULL AND unique_fo.FinalQC_Packiing IS NULL";
        case 20: // Ready Packing
          return "unique_fo.QC_ReadyGudang IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        case 21: // Packing Selesai
          return "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NULL";
        case 22: // Final Cust
          return "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NOT NULL";
        default:
          return "1=1";
      }
    };

    let userRole = "";
    if (username) {
      const [userRows] = await pool.execute<any[]>(
        "SELECT tingkat FROM tb_pengguna WHERE LOWER(TRIM(pengguna)) = LOWER(TRIM(?)) LIMIT 1",
        [username]
      );
      if (userRows && userRows.length > 0) {
        userRole = userRows[0].tingkat.toLowerCase().trim();
      }
    }

    let statusClause = "1=1";
    const selectedCat = Number(statusCategory);
    if (selectedCat > 0) {
      statusClause = getCategoryClause(selectedCat);
      if (username && userRole) {
        if (userRole === "tukang-press") {
          statusClause = `(${statusClause} AND EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
        } else if (userRole === "tukang-pressdtf") {
          statusClause = `(${statusClause} AND NOT EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
        }
      }
    } else if (username && userRole) {
      if (userRole === "tukang-desain") {
        statusClause = getCategoryClause(6);
      } else if (userRole === "tukang-layout") {
        statusClause = `(${getCategoryClause(7)} OR ${getCategoryClause(8)})`;
      } else if (userRole === "pengawas") {
        statusClause = `(${getCategoryClause(9)} OR ${getCategoryClause(14)} OR ${getCategoryClause(10)} OR ${getCategoryClause(11)})`;
      } else if (userRole === "tukang-print") {
        statusClause = `(${getCategoryClause(9)} OR ${getCategoryClause(11)})`;
      } else if (userRole === "tukang-press") {
        statusClause = `((${getCategoryClause(12)} OR ${getCategoryClause(13)}) AND EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
      } else if (userRole === "tukang-pressdtf") {
        statusClause = `((${getCategoryClause(12)} OR ${getCategoryClause(13)}) AND NOT EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
      } else if (userRole === "tukang-cutting") {
        statusClause = `(${getCategoryClause(14)} OR ${getCategoryClause(15)})`;
      } else if (userRole === "tukang-qc") {
        statusClause = `(${getCategoryClause(16)} OR ${getCategoryClause(17)} OR ${getCategoryClause(18)} OR ${getCategoryClause(19)} OR ${getCategoryClause(20)})`;
      } else if (userRole === "tukang-layanics") {
        statusClause = getCategoryClause(21);
      }
    }

    let filterWhereClause = statusClause;
    const params: any = {};
    if (username) {
      params.username = username;
    }

    if (search) {
      let searchClause = "1=1";
      if (searchBy === "no_fo") {
        searchClause = `unique_fo.no_fo LIKE :searchPattern`;
        params.searchPattern = `%${search}%`;
      } else if (searchBy === "customer") {
        searchClause = `unique_fo.customer LIKE :searchPattern`;
        params.searchPattern = `%${search}%`;
      } else if (searchBy === "post_date") {
        searchClause = `DATE(unique_fo.doc_date) = :search`;
        params.search = search;
      } else if (searchBy === "deadline_date") {
        searchClause = `DATE(unique_fo.deadline_date) = :search`;
        params.search = search;
      }
      filterWhereClause = `(${statusClause}) AND (${searchClause})`;
    }

    const [countRows] = await pool.execute<FoListCountRow[]>(
      `SELECT COUNT(*) AS total
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${filterWhereClause}`,
      params,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const [items] = await pool.execute<FoListRow[]>(
      `SELECT no_fo, order_date, doc_date, deadline_date, datetime_lanjutan, customer, qty_order, status_lanjutan, uang_muka, sisa_tagihan, totalrp
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${filterWhereClause}
       ORDER BY 
         CASE 
           WHEN unique_fo.status_lanjutan = 'PRODUK SUDAH DITERIMA CUSTOMER' OR unique_fo.status_lanjutan = 'PRODUK READY DIGUDANG, SELESAI DIPACKING' THEN 2
           ELSE 1
         END ASC,
         CASE 
           WHEN unique_fo.status_lanjutan = 'PRODUK SUDAH DITERIMA CUSTOMER' OR unique_fo.status_lanjutan = 'PRODUK READY DIGUDANG, SELESAI DIPACKING' THEN NULL
           WHEN unique_fo.deadline_date IS NULL THEN '9999-12-31'
           ELSE unique_fo.deadline_date
         END ASC,
         unique_fo.no_fo DESC
       ${paginationSql}`,
      params,
    );

    return jsonResponse(
      {
        count: total,
        items,
        page,
        limit: isAllData ? "all" : limit,
        totalPages: limit ? Math.max(Math.ceil(total / limit), 1) : 1,
      },
      {},
      request,
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
