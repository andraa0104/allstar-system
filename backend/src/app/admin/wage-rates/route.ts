import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Validation Schemas ────────────────────────────────────────────────────

const createSchema = z.object({
  kategori_id: z.coerce.number().int().positive(),
  jobdesk: z.string().min(1).max(100).trim(),
  harga: z.coerce.number().min(0),
  keterangan: z.string().optional().nullable(),
});

const updateSchema = z.object({
  id: z.coerce.number().int().positive(),
  harga: z.coerce.number().min(0),
  keterangan: z.string().optional().nullable(),
});

// ─── GET: List wage rates (optionally filtered by kategori_id or jobdesk) ─

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kategoriId = url.searchParams.get("kategori_id");
    const jobdesk = url.searchParams.get("jobdesk")?.trim() || "";
    const search = url.searchParams.get("search")?.trim() || "";

    const conditions: string[] = [];
    const params: any[] = [];

    if (kategoriId) {
      conditions.push("t.kategori_id = ?");
      params.push(parseInt(kategoriId));
    }
    if (jobdesk) {
      conditions.push("t.jobdesk = ?");
      params.push(jobdesk);
    }
    if (search) {
      conditions.push("(t.jobdesk LIKE ? OR k.nama LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         t.id,
         t.kategori_id,
         t.jobdesk,
         t.harga,
         t.keterangan,
         t.created_at,
         t.updated_at,
         k.nama AS kategori_nama,
         k.parent_id AS kategori_parent_id
       FROM tb_tarif_upah t
       INNER JOIN tb_kategori_pakaian k ON t.kategori_id = k.id
       ${whereClause}
       ORDER BY k.nama ASC, t.jobdesk ASC`,
      params
    );

    // Fetch distinct jobdesk list from tb_pengguna for dropdown population
    const [jobdeskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT tingkat FROM tb_pengguna WHERE tingkat IS NOT NULL AND TRIM(tingkat) != '' ORDER BY tingkat ASC`
    );

    return jsonResponse(
      {
        items: rows,
        jobdesk_options: jobdeskRows.map((r) => r.tingkat as string),
        count: rows.length,
      },
      {},
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── POST: Create new wage rate ───────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((e: any) => e.message).join(", "));
    }
    const { kategori_id, jobdesk, harga, keterangan } = parsed.data;

    // Validate category exists
    const [catCheck] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_kategori_pakaian WHERE id = ? LIMIT 1`,
      [kategori_id]
    );
    if (catCheck.length === 0) {
      throw new HttpError(404, `Kategori dengan id ${kategori_id} tidak ditemukan.`);
    }

    // Check unique constraint (kategori_id + jobdesk)
    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_tarif_upah WHERE kategori_id = ? AND LOWER(TRIM(jobdesk)) = LOWER(TRIM(?)) LIMIT 1`,
      [kategori_id, jobdesk]
    );
    if (dup.length > 0) {
      throw new HttpError(409, `Tarif untuk jobdesk "${jobdesk}" di kategori ini sudah ada.`);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO tb_tarif_upah (kategori_id, jobdesk, harga, keterangan) VALUES (?, ?, ?, ?)`,
      [kategori_id, jobdesk, harga, keterangan ?? null]
    );

    return jsonResponse(
      { message: "Tarif upah berhasil ditambahkan.", id: result.insertId },
      { status: 201 },
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── PUT: Update wage rate ────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((e: any) => e.message).join(", "));
    }
    const { id, harga, keterangan } = parsed.data;

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_tarif_upah WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      throw new HttpError(404, "Tarif upah tidak ditemukan.");
    }

    await pool.execute(
      `UPDATE tb_tarif_upah SET harga = ?, keterangan = ? WHERE id = ?`,
      [harga, keterangan ?? null, id]
    );

    return jsonResponse({ message: "Tarif upah berhasil diperbarui." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── DELETE: Remove wage rate ─────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "");
    if (!id || isNaN(id)) {
      throw new HttpError(400, "Parameter id diperlukan.");
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_tarif_upah WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      throw new HttpError(404, "Tarif upah tidak ditemukan.");
    }

    await pool.execute(`DELETE FROM tb_tarif_upah WHERE id = ?`, [id]);

    return jsonResponse({ message: "Tarif upah berhasil dihapus." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
