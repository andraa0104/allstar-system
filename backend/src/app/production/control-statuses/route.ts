import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StatusRow = RowDataPacket & {
  status_lanjutan: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const nama_pegawai = url.searchParams.get("nama_pegawai")?.trim() ?? "";
    const dateFilter = url.searchParams.get("date_filter")?.trim() ?? "today";
    const startDate = url.searchParams.get("start_date")?.trim() ?? "";
    const endDate = url.searchParams.get("end_date")?.trim() ?? "";

    if (!nama_pegawai) {
      return jsonResponse({ statuses: [] }, {}, request);
    }

    let filterWhereClause = "c.no_fo IS NOT NULL AND TRIM(c.no_fo) <> '' AND c.status_lanjutan IS NOT NULL AND TRIM(c.status_lanjutan) <> ''";
    const params: any = {};

    if (nama_pegawai !== "all") {
      filterWhereClause += " AND TRIM(c.nama_pegawai) = :nama_pegawai";
      params.nama_pegawai = nama_pegawai;
    }

    if (dateFilter === "today") {
      filterWhereClause += " AND DATE(c.datetime_lanjutan) = CURDATE()";
    } else if (dateFilter === "range" && startDate && endDate) {
      filterWhereClause += " AND DATE(c.datetime_lanjutan) >= :start_date AND DATE(c.datetime_lanjutan) <= :end_date";
      params.start_date = startDate;
      params.end_date = endDate;
    }

    const sql = `
      SELECT DISTINCT c.status_lanjutan
      FROM tb_control c
      INNER JOIN (
        SELECT MAX(id) AS max_id
        FROM tb_control
        WHERE no_fo IS NOT NULL AND TRIM(no_fo) <> ''
        GROUP BY TRIM(no_fo), TRIM(nama_pegawai)
      ) mx ON c.id = mx.max_id
      WHERE ${filterWhereClause}
      ORDER BY c.status_lanjutan ASC
    `;

    const [rows] = await pool.execute<StatusRow[]>(sql, params);

    const statuses = rows.map((r) => r.status_lanjutan.trim());

    return jsonResponse(
      { statuses },
      {},
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
