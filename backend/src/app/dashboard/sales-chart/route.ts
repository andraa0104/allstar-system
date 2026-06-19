import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "1w"; // 1w, 1m, 3m, 6m, 1y

    let intervalSql = "";
    let dateFormatSql = "";
    let groupBySql = "";

    switch (range) {
      case "1w":
        intervalSql = "INTERVAL 7 DAY";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m-%d') as date_label";
        groupBySql = "DATE(pos_date)";
        break;
      case "1m":
        intervalSql = "INTERVAL 1 MONTH";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m-%d') as date_label";
        groupBySql = "DATE(pos_date)";
        break;
      case "3m":
        intervalSql = "INTERVAL 3 MONTH";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m') as date_label";
        groupBySql = "YEAR(pos_date), MONTH(pos_date)";
        break;
      case "6m":
        intervalSql = "INTERVAL 6 MONTH";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m') as date_label";
        groupBySql = "YEAR(pos_date), MONTH(pos_date)";
        break;
      case "1y":
        intervalSql = "INTERVAL 1 YEAR";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m') as date_label";
        groupBySql = "YEAR(pos_date), MONTH(pos_date)";
        break;
      default:
        intervalSql = "INTERVAL 7 DAY";
        dateFormatSql = "DATE_FORMAT(pos_date, '%Y-%m-%d') as date_label";
        groupBySql = "DATE(pos_date)";
    }

    const query = `
      SELECT 
        ${dateFormatSql},
        COUNT(no_fo) as total,
        SUM(totalrp) as omset
      FROM tb_kdfo
      WHERE pos_date IS NOT NULL
        AND pos_date >= DATE_SUB(CURDATE(), ${intervalSql})
      GROUP BY date_label
      ORDER BY date_label ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query);

    return jsonResponse({ data: rows }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
