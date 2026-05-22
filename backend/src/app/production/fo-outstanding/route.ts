import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

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
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 100);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    const baseWhereClause = `no_fo IS NOT NULL AND TRIM(no_fo) <> ''`;

    const uniqueFoSql = `
      SELECT
        TRIM(no_fo) AS no_fo,
        MAX(order_date) AS doc_date,
        SUBSTRING_INDEX(
          GROUP_CONCAT(customer ORDER BY order_date DESC, id DESC SEPARATOR '|||'),
          '|||',
          1
        ) AS customer,
        SUBSTRING_INDEX(
          GROUP_CONCAT(status_lanjutan ORDER BY order_date DESC, id DESC SEPARATOR '|||'),
          '|||',
          1
        ) AS status_lanjutan
      FROM tb_control
      WHERE ${baseWhereClause}
      GROUP BY TRIM(no_fo)
    `;

    const searchWhereClause = `(
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
    )`;

    const params = {
      completedStatus,
      packingReadyStatus,
      search,
      searchPattern: `%${search}%`,
    };

    const [countRows] = await pool.execute<OutstandingCountRow[]>(
      `SELECT COUNT(*) AS total
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${searchWhereClause}`,
      params,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const [items] = await pool.execute<OutstandingRow[]>(
      `SELECT no_fo, doc_date, customer, status_lanjutan, status_lanjutan AS status
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${searchWhereClause}
       ORDER BY unique_fo.doc_date DESC, unique_fo.no_fo DESC
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
