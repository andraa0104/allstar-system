import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MonitoringStaffCountRow = RowDataPacket & {
  total: number;
};

type MonitoringStaffRow = RowDataPacket & {
  no_job: string;
  no_fo: string;
  order_date: Date | string | null;
  customer: string | null;
  qty_order: number | null;
  nama_pegawai: string | null;
  pcs_count: number;
  stel_count: number;
  datetime_lanjutan: Date | string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const nama_pegawai = url.searchParams.get("nama_pegawai")?.trim() ?? "";
    const dateFilter = url.searchParams.get("date_filter")?.trim() ?? "today";
    const startDate = url.searchParams.get("start_date")?.trim() ?? "";
    const endDate = url.searchParams.get("end_date")?.trim() ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const jobFilter = url.searchParams.get("job_filter")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    
    const isAllData = rawLimit === "all";
    const limit = isAllData ? null : Math.min(Math.max(Number(rawLimit) || 5, 1), 500);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    let filterWhereClause = "c.no_fo IS NOT NULL AND TRIM(c.no_fo) <> ''";
    const params: any = {};

    if (nama_pegawai && nama_pegawai !== "all") {
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

    if (jobFilter && jobFilter !== "all") {
      filterWhereClause += " AND TRIM(c.jobdesk) = :job_filter";
      params.job_filter = jobFilter;
    }

    if (search) {
      filterWhereClause += " AND (c.no_job LIKE :searchPattern OR c.no_fo LIKE :searchPattern)";
      params.searchPattern = `%${search}%`;
    }

    const uniqueJobSql = `
      SELECT 
        c.no_job,
        c.no_fo,
        c.order_date,
        c.doc_date,
        c.customer,
        c.qty_order,
        c.nama_pegawai,
        c.datetime_lanjutan
      FROM tb_control c
      INNER JOIN (
        SELECT MAX(id) AS max_id
        FROM tb_control
        WHERE no_fo IS NOT NULL AND TRIM(no_fo) <> ''
        GROUP BY TRIM(no_fo), TRIM(nama_pegawai)
      ) mx ON c.id = mx.max_id
      WHERE ${filterWhereClause}
    `;

    const [countRows] = await pool.execute<MonitoringStaffCountRow[]>(
      `SELECT COUNT(*) AS total FROM (${uniqueJobSql}) AS base`,
      params
    );

    const [sumRows] = await pool.execute<any[]>(
      `SELECT 
        COALESCE(SUM(base.qty_order), 0) AS total_qty,
        COALESCE(SUM(detail.stel_qty), 0) AS total_stel
       FROM (${uniqueJobSql}) AS base
       LEFT JOIN (
         SELECT TRIM(no_fo) AS no_fo, SUM(qty) AS stel_qty
         FROM tb_kdfodetail
         WHERE produk LIKE '%SETELAN%'
         GROUP BY TRIM(no_fo)
       ) AS detail ON base.no_fo = detail.no_fo`,
      params
    );

    const total = Number(countRows[0]?.total ?? 0);
    const totalQty = Number(sumRows[0]?.total_qty ?? 0);
    const totalStel = Number(sumRows[0]?.total_stel ?? 0);
    const totalPcs = Math.max(0, totalQty - totalStel);

    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";

    const [items] = await pool.execute<MonitoringStaffRow[]>(
      `SELECT 
        base.no_job,
        base.no_fo,
        base.order_date,
        base.customer,
        base.qty_order,
        base.nama_pegawai,
        base.datetime_lanjutan,
        COALESCE(detail.stel_qty, 0) AS stel_count,
        GREATEST(0, COALESCE(base.qty_order, 0) - COALESCE(detail.stel_qty, 0)) AS pcs_count
       FROM (${uniqueJobSql}) AS base
       LEFT JOIN (
         SELECT TRIM(no_fo) AS no_fo, SUM(qty) AS stel_qty
         FROM tb_kdfodetail
         WHERE produk LIKE '%SETELAN%'
         GROUP BY TRIM(no_fo)
       ) AS detail ON base.no_fo = detail.no_fo
       ORDER BY base.doc_date DESC, base.no_job DESC
       ${paginationSql}`,
      params
    );

    return jsonResponse(
      {
        count: total,
        totalQty,
        totalStel,
        totalPcs,
        items,
        page,
        limit: isAllData ? "all" : limit,
        totalPages: limit ? Math.max(Math.ceil(total / limit), 1) : 1,
      },
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
