import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const passwordSchema = z.object({
  id: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

type UserPasswordRow = RowDataPacket & {
  kd_user: string;
  pass: string;
};

export async function PUT(request: Request) {
  try {
    const payload = passwordSchema.parse(await request.json());
    const [rows] = await pool.execute<UserPasswordRow[]>(
      `SELECT kd_user, pass FROM tb_pengguna WHERE kd_user = :id`,
      { id: payload.id },
    );

    const user = rows[0];
    if (!user) {
      throw new HttpError(404, "User tidak ditemukan.");
    }

    if (payload.currentPassword !== user.pass) {
      throw new HttpError(401, "Password saat ini tidak sesuai.");
    }

    if (payload.newPassword === user.pass) {
      throw new HttpError(400, "Password baru tidak boleh sama dengan password lama.");
    }

    await pool.execute(
      `UPDATE tb_pengguna SET pass = :newPassword WHERE kd_user = :id`,
      { newPassword: payload.newPassword, id: payload.id },
    );

    return jsonResponse({ message: "Password berhasil diubah." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
