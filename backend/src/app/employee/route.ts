import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const createEmployeeSchema = z.object({
  nm_karyawan: z.string().min(1, "Nama karyawan tidak boleh kosong"),
  dept: z.string().min(1, "Departemen tidak boleh kosong"),
  jabatan: z.string().min(1, "Jabatan tidak boleh kosong"),
});

const updateEmployeeSchema = z.object({
  id_karyawan: z.string().min(1, "NIP tidak boleh kosong"),
  nm_karyawan: z.string().min(1, "Nama karyawan tidak boleh kosong"),
  dept: z.string().min(1, "Departemen tidak boleh kosong"),
  jabatan: z.string().min(1, "Jabatan tidak boleh kosong"),
});

type EmployeeRow = RowDataPacket & {
  id: number;
  id_karyawan: string;
  nm_karyawan: string;
  dept: string;
  jabatan: string;
};

type DeptCountRow = RowDataPacket & {
  dept: string;
  total: number;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const dept = url.searchParams.get("dept") || "";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam === "all" ? 100000 : parseInt(limitParam || "5", 10);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const offset = (page - 1) * limit;

    let whereClause = " WHERE 1=1";
    const params: Record<string, any> = {};

    if (search) {
      whereClause += " AND (id_karyawan LIKE :search OR nm_karyawan LIKE :search)";
      params.search = `%${search}%`;
    }

    if (dept) {
      whereClause += " AND dept = :dept";
      params.dept = dept;
    }

    // Execute queries in parallel for maximum speed
    const deptCountsPromise = pool.execute<DeptCountRow[]>(
      `SELECT dept, COUNT(*) as total FROM tb_karyawan GROUP BY dept`
    );

    const totalCountPromise = pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM tb_karyawan${whereClause}`,
      params
    );

    const rowsPromise = pool.execute<EmployeeRow[]>(
      `SELECT id, id_karyawan, nm_karyawan, dept, jabatan FROM tb_karyawan${whereClause} ORDER BY id ASC LIMIT ${offset}, ${limit}`,
      params
    );

    const [[deptRows], [countRows], [rows]] = await Promise.all([
      deptCountsPromise,
      totalCountPromise,
      rowsPromise,
    ]);

    const departmentCounts: Record<string, number> = {
      OFFICE: 0,
      MARKETING: 0,
      PRODUKSI: 0,
      TOTAL: 0,
    };

    deptRows.forEach((r) => {
      const upperDept = (r.dept || "").toUpperCase();
      departmentCounts[upperDept] = Number(r.total);
      departmentCounts.TOTAL += Number(r.total);
    });

    const totalCount = countRows[0]?.count || 0;

    return jsonResponse(
      {
        items: rows.map((r) => ({
          id: r.id,
          id_karyawan: r.id_karyawan,
          nm_karyawan: r.nm_karyawan,
          dept: r.dept,
          jabatan: r.jabatan,
        })),
        departmentCounts,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      {},
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createEmployeeSchema.parse(await request.json());

    // Generate NIP (id_karyawan) with prefix 'ALL' and 4 digits (e.g. ALL0031)
    const [lastRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id_karyawan FROM tb_karyawan WHERE id_karyawan LIKE 'ALL%' ORDER BY LENGTH(id_karyawan) DESC, id_karyawan DESC LIMIT 1`
    );

    let nextNum = 1;
    if (lastRows.length > 0) {
      const lastId = lastRows[0].id_karyawan;
      const match = lastId.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const id_karyawan = `ALL${String(nextNum).padStart(4, "0")}`;

    await pool.execute(
      `INSERT INTO tb_karyawan (id_karyawan, nm_karyawan, dept, jabatan)
       VALUES (:id_karyawan, :nm_karyawan, :dept, :jabatan)`,
      {
        id_karyawan,
        nm_karyawan: payload.nm_karyawan.trim().toUpperCase(),
        dept: payload.dept.trim().toUpperCase(),
        jabatan: payload.jabatan.trim().toUpperCase(),
      }
    );

    return jsonResponse(
      {
        message: "Karyawan berhasil ditambahkan.",
        id_karyawan,
      },
      { status: 201 },
      request
    );
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = updateEmployeeSchema.parse(await request.json());

    // Check if employee exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id_karyawan FROM tb_karyawan WHERE id_karyawan = :id_karyawan LIMIT 1`,
      { id_karyawan: payload.id_karyawan }
    );

    if (existing.length === 0) {
      throw new HttpError(404, `Karyawan dengan NIP ${payload.id_karyawan} tidak ditemukan.`);
    }

    await pool.execute(
      `UPDATE tb_karyawan
       SET nm_karyawan = :nm_karyawan, dept = :dept, jabatan = :jabatan
       WHERE id_karyawan = :id_karyawan`,
      {
        id_karyawan: payload.id_karyawan,
        nm_karyawan: payload.nm_karyawan.trim().toUpperCase(),
        dept: payload.dept.trim().toUpperCase(),
        jabatan: payload.jabatan.trim().toUpperCase(),
      }
    );

    return jsonResponse({ message: "Data karyawan berhasil diperbarui." }, {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
