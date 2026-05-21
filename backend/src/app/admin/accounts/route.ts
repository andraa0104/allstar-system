import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const accountSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().default(""),
  username: z.string().min(1),
  password: z.string().min(6),
  level: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = accountSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(payload.password, 12);

    await pool.execute(
      `INSERT INTO users (name, phone, username, password_hash, level)
       VALUES (:name, :phone, :username, :passwordHash, :level)`,
      {
        name: payload.name,
        phone: payload.phone,
        username: payload.username,
        passwordHash,
        level: payload.level,
      },
    );

    return jsonResponse({ message: "Akun berhasil dibuat." }, { status: 201 }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
