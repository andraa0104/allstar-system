import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, HttpError, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const salaryUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  basic_salary: z.coerce.number().min(0).default(0),
  salary_period: z.enum(["hari", "minggu", "bulan"]).default("bulan"),
  salary_operator: z.enum(["kali", "bagi"]).default("bagi"),
  salary_factor: z.coerce.number().min(0.01).default(26),

  makan_nominal: z.coerce.number().min(0).default(0),
  makan_period: z.enum(["hari", "minggu", "bulan"]).default("hari"),
  makan_operator: z.enum(["kali", "bagi"]).default("kali"),
  makan_factor: z.coerce.number().min(0.01).default(26),

  transport_nominal: z.coerce.number().min(0).default(0),
  transport_period: z.enum(["hari", "minggu", "bulan"]).default("hari"),
  transport_operator: z.enum(["kali", "bagi"]).default("kali"),
  transport_factor: z.coerce.number().min(0.01).default(26),

  salary_notes: z.string().optional().nullable(),
});

type KaryawanRow = RowDataPacket & {
  id: number;
  id_karyawan: string;
  nm_karyawan: string;
  dept: string;
  jabatan: string;
  basic_salary: number | string;
  salary_period: "hari" | "minggu" | "bulan";
  salary_operator: "kali" | "bagi";
  salary_factor: number | string;
  makan_nominal: number | string;
  makan_period: "hari" | "minggu" | "bulan";
  makan_operator: "kali" | "bagi";
  makan_factor: number | string;
  transport_nominal: number | string;
  transport_period: "hari" | "minggu" | "bulan";
  transport_operator: "kali" | "bagi";
  transport_factor: number | string;
  salary_notes: string | null;
};

export function calculateRates(nominal: number, period: string, operator: string, factor: number) {
  const f = factor > 0 ? factor : 26;
  let daily = 0;
  let monthly = 0;

  if (period === "bulan") {
    if (operator === "bagi") {
      daily = nominal / f;
      monthly = nominal;
    } else {
      monthly = nominal * f;
      daily = monthly / 26;
    }
  } else if (period === "hari") {
    if (operator === "kali") {
      daily = nominal;
      monthly = nominal * f;
    } else {
      daily = nominal / f;
      monthly = daily * 26;
    }
  } else if (period === "minggu") {
    if (operator === "kali") {
      monthly = nominal * f;
      daily = monthly / 26;
    } else {
      daily = nominal / f;
      monthly = daily * 26;
    }
  }

  return {
    daily: Math.round(daily * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const dept = url.searchParams.get("dept")?.trim() || "";
    const sortBy = url.searchParams.get("sort_by")?.trim() || "id";
    const sortOrder = url.searchParams.get("sort_order")?.toLowerCase() === "desc" ? "DESC" : "ASC";
    const limitParam = url.searchParams.get("limit");
    const isAllData = limitParam === "all";
    const limit = isAllData ? null : Math.min(Math.max(Number(limitParam) || 10, 1), 500);
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    const allowedSortColumns = ["id", "id_karyawan", "nm_karyawan", "dept", "jabatan", "basic_salary"];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "id";

    let whereClause = "1=1";
    const params: Record<string, any> = {};

    if (search) {
      whereClause += " AND (nm_karyawan LIKE :searchPattern OR id_karyawan LIKE :searchPattern OR jabatan LIKE :searchPattern OR dept LIKE :searchPattern)";
      params.searchPattern = `%${search}%`;
    }

    if (dept && dept !== "all") {
      whereClause += " AND dept = :dept";
      params.dept = dept;
    }

    // Get total count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM tb_karyawan WHERE ${whereClause}`,
      params,
    );
    const totalCount = Number(countRows[0]?.count ?? 0);

    // Get all matching rows for summary totals
    const [allMatchingRows] = await pool.execute<KaryawanRow[]>(
      `SELECT * FROM tb_karyawan WHERE ${whereClause}`,
      params,
    );

    let sumBasicMonthly = 0;
    let sumMakanMonthly = 0;
    let sumTransportMonthly = 0;
    let sumTotalMonthly = 0;

    for (const r of allMatchingRows) {
      const basic = calculateRates(Number(r.basic_salary) || 0, r.salary_period, r.salary_operator, Number(r.salary_factor) || 26);
      const makan = calculateRates(Number(r.makan_nominal) || 0, r.makan_period, r.makan_operator, Number(r.makan_factor) || 26);
      const transport = calculateRates(Number(r.transport_nominal) || 0, r.transport_period, r.transport_operator, Number(r.transport_factor) || 26);

      sumBasicMonthly += basic.monthly;
      sumMakanMonthly += makan.monthly;
      sumTransportMonthly += transport.monthly;
      sumTotalMonthly += (basic.monthly + makan.monthly + transport.monthly);
    }

    // Paginated query
    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const querySql = `
      SELECT *
      FROM tb_karyawan
      WHERE ${whereClause}
      ORDER BY ${validSortBy} ${sortOrder}
      ${paginationSql}
    `;

    const [rows] = await pool.execute<KaryawanRow[]>(querySql, params);

    const items = rows.map((r) => {
      const basic = calculateRates(Number(r.basic_salary) || 0, r.salary_period, r.salary_operator, Number(r.salary_factor) || 26);
      const makan = calculateRates(Number(r.makan_nominal) || 0, r.makan_period, r.makan_operator, Number(r.makan_factor) || 26);
      const transport = calculateRates(Number(r.transport_nominal) || 0, r.transport_period, r.transport_operator, Number(r.transport_factor) || 26);

      return {
        id: Number(r.id),
        id_karyawan: r.id_karyawan,
        nm_karyawan: r.nm_karyawan,
        dept: r.dept,
        jabatan: r.jabatan,

        basic_salary: Number(r.basic_salary) || 0,
        salary_period: r.salary_period,
        salary_operator: r.salary_operator,
        salary_factor: Number(r.salary_factor) || 26,

        makan_nominal: Number(r.makan_nominal) || 0,
        makan_period: r.makan_period,
        makan_operator: r.makan_operator,
        makan_factor: Number(r.makan_factor) || 26,

        transport_nominal: Number(r.transport_nominal) || 0,
        transport_period: r.transport_period,
        transport_operator: r.transport_operator,
        transport_factor: Number(r.transport_factor) || 26,

        salary_notes: r.salary_notes || "",

        calculated: {
          daily_basic: basic.daily,
          monthly_basic: basic.monthly,
          daily_makan: makan.daily,
          monthly_makan: makan.monthly,
          daily_transport: transport.daily,
          monthly_transport: transport.monthly,
          daily_total: Math.round((basic.daily + makan.daily + transport.daily) * 100) / 100,
          monthly_total: Math.round((basic.monthly + makan.monthly + transport.monthly) * 100) / 100,
        },
      };
    });

    return jsonResponse(
      {
        count: totalCount,
        items,
        page,
        limit: isAllData ? "all" : limit,
        totalPages: limit ? Math.max(Math.ceil(totalCount / limit), 1) : 1,
        summary: {
          total_employees: totalCount,
          total_basic_payroll: Math.round(sumBasicMonthly),
          total_makan_payroll: Math.round(sumMakanMonthly),
          total_transport_payroll: Math.round(sumTransportMonthly),
          total_monthly_payroll: Math.round(sumTotalMonthly),
        },
      },
      {},
      request,
    );
  } catch (error) {
    console.error("GET KARYAWAN SALARY ERROR:", error);
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const payload = salaryUpdateSchema.parse(body);

    const [exists] = await pool.execute<RowDataPacket[]>(
      "SELECT id, nm_karyawan FROM tb_karyawan WHERE id = :id LIMIT 1",
      { id: payload.id }
    );

    if (exists.length === 0) {
      throw new HttpError(404, "Data karyawan tidak ditemukan.");
    }

    await pool.execute(
      `UPDATE tb_karyawan
       SET 
         basic_salary = :basic_salary,
         salary_period = :salary_period,
         salary_operator = :salary_operator,
         salary_factor = :salary_factor,

         makan_nominal = :makan_nominal,
         makan_period = :makan_period,
         makan_operator = :makan_operator,
         makan_factor = :makan_factor,

         transport_nominal = :transport_nominal,
         transport_period = :transport_period,
         transport_operator = :transport_operator,
         transport_factor = :transport_factor,

         salary_notes = :salary_notes
       WHERE id = :id`,
      {
        id: payload.id,
        basic_salary: payload.basic_salary,
        salary_period: payload.salary_period,
        salary_operator: payload.salary_operator,
        salary_factor: payload.salary_factor,

        makan_nominal: payload.makan_nominal,
        makan_period: payload.makan_period,
        makan_operator: payload.makan_operator,
        makan_factor: payload.makan_factor,

        transport_nominal: payload.transport_nominal,
        transport_period: payload.transport_period,
        transport_operator: payload.transport_operator,
        transport_factor: payload.transport_factor,

        salary_notes: payload.salary_notes ?? null,
      }
    );

    return jsonResponse(
      {
        message: `Konfigurasi gaji untuk ${exists[0].nm_karyawan} berhasil disimpan.`,
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
