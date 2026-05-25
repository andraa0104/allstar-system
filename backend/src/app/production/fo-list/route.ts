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
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 500);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    const baseWhereClause = `c.no_fo IS NOT NULL AND TRIM(c.no_fo) <> ''`;

    const uniqueFoSql = `
      SELECT
        TRIM(c.no_fo) AS no_fo,
        c.order_date AS order_date,
        c.doc_date AS doc_date,
        c.datetime_lanjutan AS datetime_lanjutan,
        c.customer AS customer,
        c.qty_order AS qty_order,
        c.status_lanjutan AS status_lanjutan,
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
        k.Final_Cust AS Final_Cust
      FROM tb_control c
      INNER JOIN (
        SELECT MAX(id) AS max_id
        FROM tb_control
        WHERE no_fo IS NOT NULL AND TRIM(no_fo) <> ''
        GROUP BY TRIM(no_fo)
      ) latest ON c.id = latest.max_id
      LEFT JOIN tb_kdfo k ON TRIM(c.no_fo) = TRIM(k.no_fo)
    `;

    let statusClause = "1=1";
    switch (Number(statusCategory)) {
      case 1: // FO DP - Antrian
        statusClause = "unique_fo.uang_muka > 0 AND unique_fo.FinalQC_Packiing IS NULL";
        break;
      case 2: // FO DP + Non DP Antrian
        statusClause = "unique_fo.FinalQC_Packiing IS NULL";
        break;
      case 3: // FO Belum DP
        statusClause = "unique_fo.uang_muka = 0 AND unique_fo.sisa_tagihan = unique_fo.totalrp";
        break;
      case 4: // DP - Belum KLaim
        statusClause = "unique_fo.jurnal IS NULL AND unique_fo.uang_muka > 0";
        break;
      case 5: // Belum KLaim - FinalQC
        statusClause = "unique_fo.jurnal IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        break;
      case 6: // Proses Desain
        statusClause = "unique_fo.uang_muka IS NOT NULL AND unique_fo.Desain_Ready IS NULL";
        break;
      case 7: // Desain Ready
        statusClause = "unique_fo.Start_Layout IS NULL AND unique_fo.Desain_Ready IS NOT NULL";
        break;
      case 8: // Proses Susun Layout
        statusClause = "unique_fo.Start_Layout IS NOT NULL AND unique_fo.Layout_ReadyPrint IS NULL";
        break;
      case 9: // Layout Print Ready
        statusClause = "unique_fo.Layout_ReadyPrint IS NOT NULL AND unique_fo.Start_Print IS NULL";
        break;
      case 10: // Proses Persiapan Bahan Kain
        statusClause = "unique_fo.Kain_ReadyPress IS NULL AND unique_fo.Ambil_Kain IS NOT NULL";
        break;
      case 11: // Proses Printing
        statusClause = "(unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NULL) OR (unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NULL)";
        break;
      case 12: // Ready to Press
        statusClause = "unique_fo.Start_Press IS NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NOT NULL";
        break;
      case 13: // Proses Press
        statusClause = "unique_fo.Start_Press IS NOT NULL AND unique_fo.Press_ReadyCut IS NULL";
        break;
      case 14: // Kain Ready Cutting
        statusClause = "unique_fo.Start_Cut IS NULL AND unique_fo.Press_ReadyCut IS NOT NULL";
        break;
      case 15: // Proses Cutting
        statusClause = "unique_fo.Start_Cut IS NOT NULL AND unique_fo.Cut_ReadyJahit IS NULL";
        break;
      case 16: // Ready Jahit
        statusClause = "unique_fo.Start_Jahit IS NULL AND unique_fo.Cut_ReadyJahit IS NOT NULL";
        break;
      case 17: // Proses Jahit
        statusClause = "unique_fo.Start_Jahit IS NOT NULL AND unique_fo.Jahit_ReadyQC IS NULL";
        break;
      case 18: // Ready QC
        statusClause = "unique_fo.Start_QC IS NULL AND unique_fo.Jahit_ReadyQC IS NOT NULL";
        break;
      case 19: // Proses QC
        statusClause = "unique_fo.Start_QC IS NOT NULL AND unique_fo.FinalQC_Packiing IS NULL";
        break;
      case 20: // Ready Packing
        statusClause = "unique_fo.QC_ReadyGudang IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        break;
      case 21: // Packing Selesai
        statusClause = "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NULL";
        break;
      case 22: // Final Cust
        statusClause = "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NOT NULL";
        break;
      default:
        statusClause = "1=1";
    }

    let filterWhereClause = statusClause;
    const params: any = {};

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
      `SELECT no_fo, order_date, doc_date, deadline_date, datetime_lanjutan, customer, qty_order, status_lanjutan
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${filterWhereClause}
       ORDER BY 
         CASE 
           WHEN unique_fo.status_lanjutan = 'Produk diterima Customer' OR unique_fo.status_lanjutan = 'Selesai Packing, Siap diAmbil' THEN 2
           ELSE 1
         END ASC,
         CASE 
           WHEN unique_fo.status_lanjutan = 'Produk diterima Customer' OR unique_fo.status_lanjutan = 'Selesai Packing, Siap diAmbil' THEN NULL
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
