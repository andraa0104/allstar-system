import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type UserRow = RowDataPacket & {
  id?: number | string;
  id_pengguna?: number | string;
  nama?: string;
  name?: string;
  no_hp?: string | null;
  phone?: string | null;
  pengguna: string;
  pass: string;
  level?: string;
  role?: string;
  hak_akses?: string;
  status?: number | string;
  aktif?: number | string;
};

async function verifyPassword(inputPassword: string, storedPassword: string) {
  const looksHashed =
    storedPassword.startsWith("$2a$") ||
    storedPassword.startsWith("$2b$") ||
    storedPassword.startsWith("$2y$");

  if (looksHashed) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return inputPassword === storedPassword;
}

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT *
       FROM tb_pengguna
       WHERE pengguna = :username
       LIMIT 1`,
      { username: payload.username },
    );

    const user = rows[0];
    if (!user) {
      throw new HttpError(401, "Username atau password salah.");
    }

    const isInactive =
      String(user.status ?? user.aktif ?? "1").toLowerCase() === "0" ||
      String(user.status ?? "").toLowerCase() === "nonaktif";
    if (isInactive) {
      throw new HttpError(401, "Akun tidak aktif.");
    }

    const passwordValid = await verifyPassword(payload.password, user.pass);
    if (!passwordValid) {
      throw new HttpError(401, "Username atau password salah.");
    }

    const role = String(user.level ?? user.role ?? user.hak_akses ?? "staff").toLowerCase();

    return jsonResponse(
      {
        id: String(user.id_pengguna ?? user.id ?? user.pengguna),
        name: String(user.nama ?? user.name ?? user.pengguna),
        phone: user.no_hp ?? user.phone ?? "",
        username: user.pengguna,
        role,
        level: role,
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
