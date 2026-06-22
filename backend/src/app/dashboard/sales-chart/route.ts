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
        dateFormatSql = "CONCAT(YEAR(pos_date), '-W', LPAD(WEEK(pos_date, 1), 2, '0')) as date_label";
        groupBySql = "YEAR(pos_date), WEEK(pos_date, 1)";
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

    const paddedData = [];
    const now = new Date();

    const parseRow = (r: any, defaultLabel: string) => {
      if (r) {
        return {
          date_label: r.date_label,
          total: Number(r.total || 0),
          omset: Number(r.omset || 0),
        };
      }
      return { date_label: defaultLabel, total: 0, omset: 0 };
    };

    if (range === "1y") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const label = `${yyyy}-${mm}`;
        paddedData.push(parseRow(rows.find((r) => r.date_label === label), label));
      }
    } else if (range === "6m") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const label = `${yyyy}-${mm}`;
        paddedData.push(parseRow(rows.find((r) => r.date_label === label), label));
      }
    } else if (range === "3m") {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const label = `${yyyy}-${mm}`;
        paddedData.push(parseRow(rows.find((r) => r.date_label === label), label));
      }
    } else if (range === "1w") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const label = `${yyyy}-${mm}-${dd}`;
        paddedData.push(parseRow(rows.find((r) => r.date_label === label), label));
      }
    } else if (range === "1m") {
      // Return as-is for 1m (usually 4-5 weeks, padding weeks manually can cause mismatch with MySQL WEEK(1))
      rows.forEach((r) => {
        paddedData.push(parseRow(r, r.date_label));
      });
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const label = `${yyyy}-${mm}-${dd}`;
        paddedData.push(parseRow(rows.find((r) => r.date_label === label), label));
      }
    }

    return jsonResponse({ data: paddedData }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
