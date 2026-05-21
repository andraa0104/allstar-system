import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

type OrderStatus = "pending" | "active" | "completed";

const statusMap: Record<string, OrderStatus> = {
  "pending-inquiries": "pending",
  "active-deadlines": "active",
  "completed-archives": "completed",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ bucket: string }> },
) {
  try {
    const { bucket } = await context.params;
    const status = statusMap[bucket];

    if (!status) {
      return jsonResponse(
        { message: "Pipeline tidak ditemukan." },
        { status: 404 },
        request,
      );
    }

    const [orders] = await pool.execute<RowDataPacket[]>(
      `SELECT id, order_number, customer, product, quantity, deadline, status,
              progress, notes, created_at, updated_at
       FROM production_orders
       WHERE status = :status
       ORDER BY
         CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
         deadline ASC,
         updated_at DESC`,
      { status },
    );

    return jsonResponse(orders, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
