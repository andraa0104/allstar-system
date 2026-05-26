import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const accountCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  level: z.string().min(1),
});

const accountUpdateSchema = z.object({
  kd_user: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  username: z.string().min(1),
  level: z.string().min(1),
});

type UserRow = RowDataPacket & {
  kd_user: string;
  nm_user: string;
  no_hp: string;
  pengguna: string;
  tingkat: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const role = url.searchParams.get("role") || "";
    const sortBy = url.searchParams.get("sort_by") || "kd_user";
    const sortOrder = url.searchParams.get("sort_order") === "desc" ? "DESC" : "ASC";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam === "all" ? 100000 : parseInt(limitParam || "10", 10);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const offset = (page - 1) * limit;

    // Validate sort column to avoid SQL injection
    const allowedSortColumns = ["kd_user", "nm_user", "tingkat", "pengguna"];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "kd_user";

    let query = `
      SELECT kd_user, nm_user, no_hp, pengguna, tingkat, LastOnline
      FROM tb_pengguna
      WHERE 1=1
    `;
    const params: any = {};

    if (search) {
      query += ` AND (nm_user LIKE :search OR pengguna LIKE :search OR kd_user LIKE :search)`;
      params.search = `%${search}%`;
    }

    if (role) {
      query += ` AND tingkat = :role`;
      params.role = role;
    }

    // Get total count first
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM (${query}) as temp`,
      params,
    );
    const totalCount = countRows[0].count;

    // Add sorting and pagination safely using validated integer interpolation
    query += ` ORDER BY ${validSortBy} ${sortOrder} LIMIT ${offset}, ${limit}`;

    const [rows] = await pool.execute<UserRow[]>(query, params);

    return jsonResponse(
      {
        count: totalCount,
        items: rows.map(r => ({
          kd_user: r.kd_user,
          nm_user: r.nm_user,
          no_hp: r.no_hp,
          pengguna: r.pengguna,
          tingkat: r.tingkat,
          LastOnline: r.LastOnline,
        })),
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      {},
      request,
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const payload = accountCreateSchema.parse(await request.json());

    // Check unique username
    const [usernameCheck] = await pool.execute<RowDataPacket[]>(
      `SELECT kd_user FROM tb_pengguna WHERE pengguna = :username LIMIT 1`,
      { username: payload.username },
    );
    if (usernameCheck.length > 0) {
      throw new HttpError(400, "Username sudah digunakan.");
    }

    // Auto-generate kd_user format: USR0001
    const [lastUserRows] = await pool.execute<RowDataPacket[]>(
      `SELECT kd_user FROM tb_pengguna WHERE kd_user LIKE 'USR%' ORDER BY kd_user DESC LIMIT 1`,
    );

    let nextNum = 1;
    if (lastUserRows.length > 0) {
      const lastKd = lastUserRows[0].kd_user;
      const numPart = lastKd.replace("USR", "");
      nextNum = parseInt(numPart, 10) + 1;
    }
    const kd_user = `USR${String(nextNum).padStart(4, "0")}`;

    await pool.execute(
      `INSERT INTO tb_pengguna (kd_user, nm_user, no_hp, pengguna, pass, tingkat, Sesi)
       VALUES (:kd_user, :nm_user, :no_hp, :pengguna, :pass, :tingkat, 'T')`,
      {
        kd_user,
        nm_user: payload.name,
        no_hp: payload.phone,
        pengguna: payload.username,
        pass: payload.password,
        tingkat: payload.level,
      },
    );

    return jsonResponse({ message: "User berhasil ditambahkan." }, { status: 201 }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = accountUpdateSchema.parse(await request.json());

    // Check unique username (exclude current user)
    const [usernameCheck] = await pool.execute<RowDataPacket[]>(
      `SELECT kd_user FROM tb_pengguna WHERE pengguna = :username AND kd_user != :kd_user LIMIT 1`,
      { username: payload.username, kd_user: payload.kd_user },
    );
    if (usernameCheck.length > 0) {
      throw new HttpError(400, "Username sudah digunakan oleh user lain.");
    }

    await pool.execute(
      `UPDATE tb_pengguna
       SET nm_user = :name, no_hp = :phone, pengguna = :username, tingkat = :level
       WHERE kd_user = :kd_user`,
      {
        kd_user: payload.kd_user,
        name: payload.name,
        phone: payload.phone,
        username: payload.username,
        level: payload.level,
      },
    );

    return jsonResponse({ message: "Data user berhasil diubah." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
