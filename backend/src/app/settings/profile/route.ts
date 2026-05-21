import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional().default(""),
  username: z.string().min(1),
});

export async function PUT(request: Request) {
  try {
    const payload = profileSchema.parse(await request.json());

    await pool.execute(
      `UPDATE users
       SET name = :name, phone = :phone, username = :username
       WHERE id = :id AND is_active = 1`,
      payload,
    );

    return jsonResponse({ message: "Profil berhasil diperbarui." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
