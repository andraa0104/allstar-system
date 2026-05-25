import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JobDetailRow = RowDataPacket & {
  id: number;
  no_job: string;
  no_fo: string;
  datetime_awal: Date | string | null;
  status_awal: string | null;
  datetime_lanjutan: Date | string | null;
  username: string | null;
  jobdesk: string | null;
  ket: string | null;
  status_lanjutan: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const noFo = url.searchParams.get("no_fo")?.trim() ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");

    if (!noFo) {
      return jsonResponse(
        { message: "Parameter 'no_fo' diperlukan." },
        { status: 400 },
        request,
      );
    }

    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 500);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    let whereClause = "TRIM(no_fo) = TRIM(:noFo)";
    const params: any = { noFo };

    if (search) {
      whereClause += ` AND (
        no_job LIKE :searchPattern OR 
        username LIKE :searchPattern OR 
        jobdesk LIKE :searchPattern OR 
        status_awal LIKE :searchPattern OR 
        ket LIKE :searchPattern
      )`;
      params.searchPattern = `%${search}%`;
    }

    // Query count
    const [countRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS total FROM tb_control WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    // Query actual job rows
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const [items] = await pool.execute<JobDetailRow[]>(
      `SELECT 
        id, 
        TRIM(no_job) AS no_job, 
        TRIM(no_fo) AS no_fo, 
        datetime_awal, 
        status_awal, 
        datetime_lanjutan, 
        status_lanjutan, 
        username, 
        jobdesk, 
        ket 
       FROM tb_control 
       WHERE ${whereClause} 
       ORDER BY id ASC 
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
