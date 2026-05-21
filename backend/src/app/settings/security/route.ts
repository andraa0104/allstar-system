import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const passwordSchema = z.object({
  id: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

type UserPasswordRow = RowDataPacket & {
  id: number;
  password_hash: string;
};

export async function PUT(request: Request) {
  try {
    const payload = passwordSchema.parse(await request.json());
    const [rows] = await pool.execute<UserPasswordRow[]>(
      `SELECT id, password_hash FROM users WHERE id = :id AND is_active = 1`,
      { id: payload.id },
    );

    const user = rows[0];
    if (!user) {
      throw new HttpError(404, "User tidak ditemukan.");
    }

    const passwordValid = await bcrypt.compare(
      payload.currentPassword,
      user.password_hash,
    );
    if (!passwordValid) {
      throw new HttpError(401, "Password saat ini tidak sesuai.");
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await pool.execute(
      `UPDATE users SET password_hash = :passwordHash WHERE id = :id`,
      { passwordHash, id: payload.id },
    );

    return jsonResponse({ message: "Password berhasil diperbarui." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
