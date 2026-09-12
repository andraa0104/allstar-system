import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Validation Schemas ────────────────────────────────────────────────────

const createSchema = z.object({
  parent_id: z.coerce.number().int().positive().nullable().optional().default(null),
  nama: z.string().min(1).max(100).trim(),
});

const updateSchema = z.object({
  id: z.coerce.number().int().positive(),
  nama: z.string().min(1).max(100).trim(),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
});

// ─── GET: List all categories (flat with parent_id) OR suggest by name ────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const suggest = url.searchParams.get("suggest")?.trim() || "";
    const parentId = url.searchParams.get("parent_id");

    // Autocomplete mode: return distinct names matching the query
    if (suggest) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT DISTINCT nama FROM tb_kategori_pakaian
         WHERE nama LIKE CONCAT('%', ?, '%')
         ORDER BY nama ASC
         LIMIT 20`,
        [suggest]
      );
      return jsonResponse({ suggestions: rows.map((r) => r.nama) }, {}, request);
    }

    // Full tree or filtered by parent
    if (parentId !== null) {
      const pid = parentId === "null" || parentId === "" ? null : parseInt(parentId);
      let rows: RowDataPacket[];
      if (pid === null) {
        [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT id, parent_id, nama, created_at, updated_at FROM tb_kategori_pakaian
           WHERE parent_id IS NULL ORDER BY nama ASC`
        );
      } else {
        [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT id, parent_id, nama, created_at, updated_at FROM tb_kategori_pakaian
           WHERE parent_id = ? ORDER BY nama ASC`,
          [pid]
        );
      }
      return jsonResponse({ items: rows }, {}, request);
    }

    // Return all categories flat (for tree building on frontend)
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, parent_id, nama, created_at, updated_at FROM tb_kategori_pakaian
       ORDER BY parent_id ASC, nama ASC`
    );

    return jsonResponse({ items: rows }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── POST: Create new category ────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((e: any) => e.message).join(", "));
    }
    const { parent_id, nama } = parsed.data;

    // Validate parent exists if provided
    if (parent_id !== null && parent_id !== undefined) {
      const [check] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM tb_kategori_pakaian WHERE id = ? LIMIT 1`,
        [parent_id]
      );
      if (check.length === 0) {
        throw new HttpError(404, `Kategori induk dengan id ${parent_id} tidak ditemukan.`);
      }
    }

    // Check for duplicate name under same parent
    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_kategori_pakaian
       WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) AND (parent_id <=> ?) LIMIT 1`,
      [nama, parent_id ?? null]
    );
    if (dup.length > 0) {
      throw new HttpError(409, `Kategori "${nama}" sudah ada di level yang sama.`);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO tb_kategori_pakaian (parent_id, nama) VALUES (?, ?)`,
      [parent_id ?? null, nama]
    );

    return jsonResponse(
      { message: "Kategori berhasil ditambahkan.", id: result.insertId },
      { status: 201 },
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── PUT: Rename category ────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((e: any) => e.message).join(", "));
    }
    const { id, nama, parent_id } = parsed.data;

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id, parent_id FROM tb_kategori_pakaian WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      throw new HttpError(404, "Kategori tidak ditemukan.");
    }

    const effectiveParentId = parent_id !== undefined ? parent_id : existing[0].parent_id;

    // Check duplicate name sibling
    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_kategori_pakaian
       WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) AND (parent_id <=> ?) AND id != ? LIMIT 1`,
      [nama, effectiveParentId ?? null, id]
    );
    if (dup.length > 0) {
      throw new HttpError(409, `Kategori "${nama}" sudah ada di level yang sama.`);
    }

    await pool.execute(
      `UPDATE tb_kategori_pakaian SET nama = ? WHERE id = ?`,
      [nama, id]
    );

    return jsonResponse({ message: "Kategori berhasil diperbarui." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

// ─── DELETE: Delete category (cascades to children + tarif) ──────────────

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "");
    if (!id || isNaN(id)) {
      throw new HttpError(400, "Parameter id diperlukan.");
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM tb_kategori_pakaian WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      throw new HttpError(404, "Kategori tidak ditemukan.");
    }

    await pool.execute(`DELETE FROM tb_kategori_pakaian WHERE id = ?`, [id]);

    return jsonResponse(
      {
        message: "Kategori beserta seluruh subkategori dan tarif terkait berhasil dihapus.",
      },
      {},
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
