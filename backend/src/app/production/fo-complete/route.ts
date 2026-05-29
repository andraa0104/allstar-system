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

    const uniqueFoSql = `
      SELECT
        TRIM(k.no_fo) AS no_fo,
        k.order_date AS doc_date,
        k.customer AS customer,
        c.status_lanjutan AS status_lanjutan,
        k.QC_ReadyGudang AS QC_ReadyGudang,
        k.Final_Cust AS Final_Cust,
        c.username AS username
      FROM tb_kdfo k
      LEFT JOIN (
        SELECT c1.*
        FROM tb_control c1
        INNER JOIN (
          SELECT MAX(id) AS max_id
          FROM tb_control
          WHERE no_fo IS NOT NULL AND TRIM(no_fo) <> ''
          GROUP BY TRIM(no_fo)
        ) c2 ON c1.id = c2.max_id
      ) c ON TRIM(k.no_fo) = TRIM(c.no_fo)
      WHERE k.no_fo IS NOT NULL AND TRIM(k.no_fo) <> ''
    `;

    // Completion date is either next step's datetime_awal (if user is provided) or overall FO completion dates
    const completedDateExpr = username
      ? "ucj.completed_date"
      : "COALESCE(unique_fo.Final_Cust, unique_fo.QC_ReadyGudang)";

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

    let querySql = "";
    let countSql = "";

    if (username) {
      const ucjJoinSql = `
        INNER JOIN (
          SELECT 
            um.no_fo,
            COALESCE(MIN(tc_next.datetime_awal), um.max_user_datetime) AS completed_date
          FROM (
            SELECT 
              TRIM(no_fo) AS no_fo,
              MAX(id) AS max_user_id,
              MAX(datetime_lanjutan) AS max_user_datetime
            FROM tb_control
            WHERE LOWER(TRIM(username)) = LOWER(TRIM(:username))
            GROUP BY TRIM(no_fo)
          ) um
          LEFT JOIN tb_control tc_next ON TRIM(tc_next.no_fo) = um.no_fo AND tc_next.id > um.max_user_id
          GROUP BY um.no_fo, um.max_user_datetime
        ) ucj ON TRIM(unique_fo.no_fo) = ucj.no_fo
      `;

      const searchWhereClause = `(
        :search = ''
        OR unique_fo.no_fo LIKE :searchPattern
        OR unique_fo.customer LIKE :searchPattern
      )
      AND NOT (
        LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username))
        AND unique_fo.status_lanjutan LIKE 'Start%'
      )
      AND ucj.completed_date IS NOT NULL
      AND (${dateClause})`;

      countSql = `SELECT COUNT(*) AS total
                  FROM (${uniqueFoSql}) AS unique_fo
                  ${ucjJoinSql}
                  WHERE ${searchWhereClause}`;

      const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
      querySql = `SELECT unique_fo.no_fo, unique_fo.doc_date, unique_fo.customer, 
                         unique_fo.status_lanjutan, unique_fo.status_lanjutan AS status,
                         unique_fo.QC_ReadyGudang, unique_fo.Final_Cust
                  FROM (${uniqueFoSql}) AS unique_fo
                  ${ucjJoinSql}
                  WHERE ${searchWhereClause}
                  ORDER BY unique_fo.no_fo DESC, unique_fo.doc_date DESC
                  ${paginationSql}`;
    } else {
      const searchWhereClause = `(
        :search = ''
        OR unique_fo.no_fo LIKE :searchPattern
        OR unique_fo.customer LIKE :searchPattern
      )
      AND (
        unique_fo.status_lanjutan = 'Selesai Packing, Siap diAmbil'
        OR unique_fo.status_lanjutan = 'Produk diterima Customer'
      )
      AND (${dateClause})`;

      countSql = `SELECT COUNT(*) AS total
                  FROM (${uniqueFoSql}) AS unique_fo
                  WHERE ${searchWhereClause}`;

      const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
      querySql = `SELECT no_fo, doc_date, customer, status_lanjutan, status_lanjutan AS status,
                         QC_ReadyGudang, Final_Cust
                  FROM (${uniqueFoSql}) AS unique_fo
                  WHERE ${searchWhereClause}
                  ORDER BY no_fo DESC, doc_date DESC
                  ${paginationSql}`;
    }

    const [countRows] = await pool.execute<CompleteCountRow[]>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
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
