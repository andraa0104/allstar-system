import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const completedStatus = "Produk diterima Customer";
const packingReadyStatus = "Selesai Packing, Siap diAmbil";

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
        c.status_lanjutan AS status_lanjutan,
        c.datetime_lanjutan AS latest_datetime_lanjutan,
        k.deadline_date AS deadline_date
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

    let filterWhereClause = `(
      :search = ''
      OR unique_fo.no_fo LIKE :searchPattern
      OR unique_fo.customer LIKE :searchPattern
    )
    AND (
      unique_fo.status_lanjutan IS NULL
      OR (
        unique_fo.status_lanjutan <> :completedStatus
        AND unique_fo.status_lanjutan <> :packingReadyStatus
      )
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

    const params = {
      completedStatus,
      packingReadyStatus,
      search,
      searchPattern: `%${search}%`,
    };

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
              deadline_date
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