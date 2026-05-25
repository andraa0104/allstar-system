import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DetailItemRow = RowDataPacket & {
  id: number;
  no_fo: string;
  detail_item: string;
  qty: number;
  produk: string | null;
  model: string | null;
  bahan: string | null;
  size: string | null;
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
      whereClause += " AND detail_item LIKE :searchPattern";
      params.searchPattern = `%${search}%`;
    }

    // Query count of items
    const [countRows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS total FROM tb_kdfodetail WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    // Query actual item details
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const [items] = await pool.execute<DetailItemRow[]>(
      `SELECT id, TRIM(no_fo) AS no_fo, detail_item, qty, produk, model, bahan, size 
       FROM tb_kdfodetail 
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
