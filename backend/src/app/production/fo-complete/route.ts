import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CompleteCountRow = RowDataPacket & {
  total: number;
};

type CompleteRow = RowDataPacket & {
  no_fo: string;
  doc_date: Date | string | null;
  customer: string | null;
  status: string | null;
  status_lanjutan: string | null;
  QC_ReadyGudang: Date | string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const filterType = url.searchParams.get("filter_type")?.trim() ?? "today";
    const startDate = url.searchParams.get("start_date")?.trim() ?? "";
    const endDate = url.searchParams.get("end_date")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const username = url.searchParams.get("username")?.trim() ?? "";
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 100);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

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

    const uniqueFoSql = `
      SELECT
        TRIM(k.no_fo) AS no_fo,
        k.order_date AS doc_date,
        k.customer AS customer,
        k.ket_status AS status_lanjutan,
        k.QC_ReadyGudang AS QC_ReadyGudang,
        k.Final_Cust AS Final_Cust,
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
        k.QC_ReadyGudang AS QC_ReadyGudang_Check,
        k.Final_Cust AS Final_Cust_Check,
        NULL AS username
      FROM tb_kdfo k
      WHERE k.no_fo IS NOT NULL AND TRIM(k.no_fo) <> ''
    `;

    // Completion date is overall FO completion dates or fallback to doc_date
    const completedDateExpr = "COALESCE(unique_fo.Final_Cust, unique_fo.QC_ReadyGudang, unique_fo.doc_date)";

    let dateClause = "1=1";
    const params: any = {
      search,
      searchPattern: `%${search}%`,
    };
    if (username) {
      params.username = username;
    }

    if (filterType === "today") {
      dateClause = `DATE(${completedDateExpr}) = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "this_week") {
      dateClause = `YEARWEEK(${completedDateExpr}, 1) = YEARWEEK(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR), 1)`;
    } else if (filterType === "this_month") {
      dateClause = `YEAR(${completedDateExpr}) = YEAR(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)) AND MONTH(${completedDateExpr}) = MONTH(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "this_year") {
      dateClause = `YEAR(${completedDateExpr}) = YEAR(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "date_range" && startDate && endDate) {
      dateClause = `DATE(${completedDateExpr}) >= :startDate AND DATE(${completedDateExpr}) <= :endDate`;
      params.startDate = startDate;
      params.endDate = endDate;
    }

    let statusWhereClause = "1=1";
    if (username && userRole) {
      if (userRole === "tukang-desain") {
        statusWhereClause = "unique_fo.status_lanjutan = 'FINAL DESAIN'";
      } else if (userRole === "tukang-layout") {
        statusWhereClause = "unique_fo.status_lanjutan = 'LAYOUT DESAIN SUDAH SIAP UTK DI PRINTOUT'";
      } else if (userRole === "pengawas") {
        statusWhereClause = "unique_fo.status_lanjutan IN ('BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT BELUM PROSES', 'BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT LAGI DIPROSES', 'BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS SUBLIME')";
      } else if (userRole === "tukang-print") {
        statusWhereClause = "unique_fo.status_lanjutan IN ('PRINTOUT READY, LAGI PERSIAPAN BAHAN KAIN/KAOS/JERSEY', 'BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS')";
      } else if (userRole === "tukang-press") {
        statusWhereClause = "unique_fo.status_lanjutan = 'KAIN SUBLIME READY CUTTING' AND EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%')";
      } else if (userRole === "tukang-pressdtf") {
        statusWhereClause = "unique_fo.status_lanjutan = 'PRESS DTF SELESAI, PERIKSA KWALITASNYA' AND NOT EXISTS (SELECT 1 FROM tb_kdfodetail det WHERE TRIM(det.no_fo) = TRIM(unique_fo.no_fo) AND det.produk LIKE '%JERSEY%')";
      } else if (userRole === "tukang-cutting") {
        statusWhereClause = "unique_fo.status_lanjutan = 'READY UNTUK DIJAHIT'";
      } else if (userRole === "tukang-qc") {
        statusWhereClause = "unique_fo.status_lanjutan = 'PRODUK READY DIGUDANG, SELESAI DIPACKING'";
      } else if (userRole === "tukang-layanics") {
        statusWhereClause = "unique_fo.status_lanjutan = 'PRODUK SUDAH DITERIMA CUSTOMER'";
      }
    } else {
      statusWhereClause = "unique_fo.status_lanjutan IN ('PRODUK READY DIGUDANG, SELESAI DIPACKING', 'PRODUK SUDAH DITERIMA CUSTOMER')";
    }

    const searchWhereClause = `(
      :search = ''
      OR unique_fo.no_fo LIKE :searchPattern
      OR unique_fo.customer LIKE :searchPattern
    )
    AND (${statusWhereClause})
    AND (${dateClause})`;

    const countSql = `SELECT COUNT(*) AS total
                      FROM (${uniqueFoSql}) AS unique_fo
                      WHERE ${searchWhereClause}`;

    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const querySql = `SELECT unique_fo.no_fo, unique_fo.doc_date, unique_fo.customer, 
                             unique_fo.status_lanjutan, unique_fo.status_lanjutan AS status,
                             unique_fo.QC_ReadyGudang, unique_fo.Final_Cust
                      FROM (${uniqueFoSql}) AS unique_fo
                      WHERE ${searchWhereClause}
                      ORDER BY unique_fo.no_fo DESC, unique_fo.doc_date DESC
                      ${paginationSql}`;

    const [countRows] = await pool.execute<CompleteCountRow[]>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    const [items] = await pool.execute<CompleteRow[]>(querySql, params);

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
