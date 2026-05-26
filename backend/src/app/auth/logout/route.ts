import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const logoutSchema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = logoutSchema.parse(await request.json());

    // Update LastOnline utilizing SQL to precisely target WITA (UTC+8) time format yyyy-mm-dd hh:mm:ss
    await pool.execute(
      `UPDATE tb_pengguna
       SET LastOnline = DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR), '%Y-%m-%d %H:%i:%s')
       WHERE kd_user = :id OR pengguna = :id`,
      { id: payload.id },
    );

    return jsonResponse({ message: "Logout status updated." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
