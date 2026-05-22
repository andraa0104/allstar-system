import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

type DeadlineSummaryRow = RowDataPacket & {
  count: number;
};

export async function GET(request: Request) {
  try {
    const [rows] = await pool.execute<DeadlineSummaryRow[]>(
      `SELECT COUNT(DISTINCT no_job) AS count
       FROM tb_control
       WHERE no_job IS NOT NULL
       AND TRIM(no_job) <> ''
       AND datetime_lanjutan IS NOT NULL
       AND DATE(datetime_lanjutan) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
       AND DATE(datetime_lanjutan) <= CURDATE()
       AND (status_lanjutan IS NULL OR status_lanjutan <> :completedStatus)`,
      { completedStatus: "Produk diterima Customer" },
    );

    const count = Number(rows[0]?.count ?? 0);

    return jsonResponse({ count }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
