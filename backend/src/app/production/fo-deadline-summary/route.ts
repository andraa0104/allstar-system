import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const completedStatus = "PRODUK SUDAH DITERIMA CUSTOMER";
const packingReadyStatus = "PRODUK READY DIGUDANG, SELESAI DIPACKING";

type OutstandingCountRow = RowDataPacket & {
  total: number;
};

type OutstandingRow = RowDataPacket & {
  no_fo: string;
  doc_date: Date | string | null;
  customer: string | null;
  status: string | null;
  status_lanjutan: string | null;
  datetime_lanjutan: Date | string | null;
  deadline_days: number;
  deadline_date: Date | string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const deadlineType = url.searchParams.get("deadline_type")?.trim() ?? "";
    const username = url.searchParams.get("username")?.trim() ?? "";
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 100);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    const baseWhereClause = `c.no_fo IS NOT NULL AND TRIM(c.no_fo) <> ''`;

    const uniqueFoSql = `
      SELECT
        TRIM(k.no_fo) AS no_fo,
        k.order_date AS doc_date,
        k.customer AS customer,
        k.ket_status AS status_lanjutan,
        k.order_date AS latest_datetime_lanjutan,
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

    let filterWhereClause = `(
      :search = ''
      OR unique_fo.no_fo LIKE :searchPattern
      OR unique_fo.customer LIKE :searchPattern
    )
    AND (
      unique_fo.deadline_date IS NOT NULL
      AND unique_fo.deadline_date >= CURDATE()
      AND DATEDIFF(unique_fo.deadline_date, CURDATE()) <= 4
    )`;

    if (deadlineType === "singkat") {
      filterWhereClause += ` AND DATEDIFF(unique_fo.deadline_date, CURDATE()) <= 2`;
    } else if (deadlineType === "lama") {
      filterWhereClause += ` AND DATEDIFF(unique_fo.deadline_date, CURDATE()) > 2`;
    }

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

    const getCategoryClause = (cat: number): string => {
      switch (cat) {
        case 1: return "unique_fo.uang_muka > 0 AND unique_fo.FinalQC_Packiing IS NULL";
        case 2: return "unique_fo.FinalQC_Packiing IS NULL";
        case 3: return "unique_fo.uang_muka = 0 AND unique_fo.sisa_tagihan = unique_fo.totalrp";
        case 4: return "unique_fo.jurnal IS NULL AND unique_fo.uang_muka > 0";
        case 5: return "unique_fo.jurnal IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        case 6: return "unique_fo.uang_muka IS NOT NULL AND unique_fo.Desain_Ready IS NULL";
        case 7: return "unique_fo.Start_Layout IS NULL AND unique_fo.Desain_Ready IS NOT NULL";
        case 8: return "unique_fo.Start_Layout IS NOT NULL AND unique_fo.Layout_ReadyPrint IS NULL";
        case 9: return "unique_fo.Layout_ReadyPrint IS NOT NULL AND unique_fo.Start_Print IS NULL";
        case 10: return "unique_fo.Kain_ReadyPress IS NULL AND unique_fo.Ambil_Kain IS NOT NULL";
        case 11: return "(unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NULL) OR (unique_fo.Start_Print IS NOT NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NULL)";
        case 12: return "unique_fo.Start_Press IS NULL AND unique_fo.Print_ReadyPress IS NOT NULL AND unique_fo.Kain_ReadyPress IS NOT NULL";
        case 13: return "unique_fo.Start_Press IS NOT NULL AND unique_fo.Press_ReadyCut IS NULL";
        case 14: return "unique_fo.Start_Cut IS NULL AND unique_fo.Press_ReadyCut IS NOT NULL";
        case 15: return "unique_fo.Start_Cut IS NOT NULL AND unique_fo.Cut_ReadyJahit IS NULL";
        case 16: return "unique_fo.Start_Jahit IS NULL AND unique_fo.Cut_ReadyJahit IS NOT NULL";
        case 17: return "unique_fo.Start_Jahit IS NOT NULL AND unique_fo.Jahit_ReadyQC IS NULL";
        case 18: return "unique_fo.Start_QC IS NULL AND unique_fo.Jahit_ReadyQC IS NOT NULL";
        case 19: return "unique_fo.Start_QC IS NOT NULL AND unique_fo.FinalQC_Packiing IS NULL";
        case 20: return "unique_fo.QC_ReadyGudang IS NULL AND unique_fo.FinalQC_Packiing IS NOT NULL";
        case 21: return "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NULL";
        case 22: return "unique_fo.QC_ReadyGudang IS NOT NULL AND unique_fo.Final_Cust IS NOT NULL";
        default: return "1=1";
      }
    };

    const params: any = {
      completedStatus,
      packingReadyStatus,
      search,
      searchPattern: `%${search}%`,
    };

    if (username && userRole) {
      let activeClause = "1=1";
      if (userRole === "tukang-desain") {
        activeClause = getCategoryClause(6);
      } else if (userRole === "tukang-layout") {
        activeClause = `(${getCategoryClause(7)} OR ${getCategoryClause(8)})`;
      } else if (userRole === "pengawas") {
        activeClause = `(${getCategoryClause(9)} OR ${getCategoryClause(14)} OR ${getCategoryClause(10)} OR ${getCategoryClause(11)})`;
      } else if (userRole === "tukang-print") {
        activeClause = `(${getCategoryClause(9)} OR ${getCategoryClause(11)})`;
      } else if (userRole === "tukang-press") {
        activeClause = `((${getCategoryClause(12)} OR ${getCategoryClause(13)}) AND EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
      } else if (userRole === "tukang-pressdtf") {
        activeClause = `((${getCategoryClause(12)} OR ${getCategoryClause(13)}) AND NOT EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%'))`;
      } else if (userRole === "tukang-cutting") {
        activeClause = `(${getCategoryClause(14)} OR ${getCategoryClause(15)})`;
      } else if (userRole === "tukang-qc") {
        activeClause = `(${getCategoryClause(16)} OR ${getCategoryClause(17)} OR ${getCategoryClause(18)} OR ${getCategoryClause(19)} OR ${getCategoryClause(20)})`;
      } else if (userRole === "tukang-layanics") {
        activeClause = getCategoryClause(21);
      }
      filterWhereClause += ` AND (${activeClause})`;
      params.username = username;
    } else {
      filterWhereClause += `
        AND unique_fo.status_lanjutan IS NOT NULL
        AND TRIM(unique_fo.status_lanjutan) <> ''
        AND TRIM(unique_fo.status_lanjutan) <> '-'
        AND unique_fo.status_lanjutan <> :completedStatus
        AND unique_fo.status_lanjutan <> :packingReadyStatus
      `;
    }

    const [countRows] = await pool.execute<OutstandingCountRow[]>(
      `SELECT COUNT(*) AS total
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${filterWhereClause}`,
      params,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    
    const [items] = await pool.execute<OutstandingRow[]>(
      `SELECT no_fo, doc_date, customer, status_lanjutan, status_lanjutan AS status, 
              latest_datetime_lanjutan AS datetime_lanjutan,
              DATEDIFF(deadline_date, CURDATE()) AS deadline_days,
              deadline_date, uang_muka, sisa_tagihan, totalrp
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${filterWhereClause}
       ORDER BY deadline_date ASC, unique_fo.no_fo DESC
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