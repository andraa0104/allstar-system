import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function calculateRateLocal(
  nominal: number,
  period: string,
  operator: string,
  factor: number
) {
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

  const weekly = daily * 6;

  return {
    daily: Math.round(daily * 100) / 100,
    weekly: Math.round(weekly * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get("username")?.trim() || "";
    const kd_user = url.searchParams.get("kd_user")?.trim() || "";

    if (!username && !kd_user) {
      return jsonResponse(
        {
          karyawan: null,
          message: "Parameter username atau kd_user diperlukan.",
        },
        {},
        request
      );
    }

    // Step 1: Find user in tb_pengguna
    let userRow: any = null;
    if (kd_user || username) {
      const [users] = await pool.execute<RowDataPacket[]>(
        `SELECT kd_user, nm_user, pengguna, tingkat 
         FROM tb_pengguna 
         WHERE kd_user = :param OR LOWER(TRIM(pengguna)) = LOWER(TRIM(:param)) OR LOWER(TRIM(nm_user)) = LOWER(TRIM(:param)) 
         LIMIT 1`,
        { param: kd_user || username }
      );
      if (users.length > 0) {
        userRow = users[0];
      }
    }

    const searchNm = userRow ? userRow.nm_user : username;
    const searchPengguna = userRow ? userRow.pengguna : username;

    // Step 2: Match with tb_karyawan
    const [empRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         id, id_karyawan, nm_karyawan, dept, jabatan,
         basic_salary, salary_period, salary_operator, salary_factor,
         makan_nominal, makan_period, makan_operator, makan_factor,
         transport_nominal, transport_period, transport_operator, transport_factor,
         salary_notes
       FROM tb_karyawan
       WHERE 
         LOWER(TRIM(nm_karyawan)) = LOWER(TRIM(:exactNm))
         OR LOWER(TRIM(nm_karyawan)) = LOWER(TRIM(:exactPengguna))
         OR LOWER(TRIM(nm_karyawan)) LIKE CONCAT('%', LOWER(TRIM(:searchNm)), '%')
         OR LOWER(TRIM(:searchNm)) LIKE CONCAT('%', LOWER(TRIM(nm_karyawan)), '%')
       ORDER BY 
         (LOWER(TRIM(nm_karyawan)) = LOWER(TRIM(:exactNm))) DESC,
         (LOWER(TRIM(nm_karyawan)) = LOWER(TRIM(:exactPengguna))) DESC
       LIMIT 1`,
      {
        exactNm: searchNm,
        exactPengguna: searchPengguna,
        searchNm: searchNm,
      }
    );

    if (empRows.length === 0) {
      return jsonResponse(
        {
          karyawan: null,
          user: userRow || { username },
          message: "Data karyawan untuk akun ini belum terdaftar di data master tb_karyawan.",
        },
        {},
        request
      );
    }

    const emp = empRows[0];
    const basicNominal = Number(emp.basic_salary) || 0;
    const makanNominal = Number(emp.makan_nominal) || 0;
    const transportNominal = Number(emp.transport_nominal) || 0;

    const basicRates = calculateRateLocal(
      basicNominal,
      emp.salary_period || "bulan",
      emp.salary_operator || "bagi",
      Number(emp.salary_factor) || 26
    );

    const makanRates = calculateRateLocal(
      makanNominal,
      emp.makan_period || "hari",
      emp.makan_operator || "kali",
      Number(emp.makan_factor) || 26
    );

    const transportRates = calculateRateLocal(
      transportNominal,
      emp.transport_period || "hari",
      emp.transport_operator || "kali",
      Number(emp.transport_factor) || 26
    );

    const breakdown = {
      daily: {
        basic: basicRates.daily,
        makan: makanRates.daily,
        transport: transportRates.daily,
        total: Math.round((basicRates.daily + makanRates.daily + transportRates.daily) * 100) / 100,
      },
      weekly: {
        basic: basicRates.weekly,
        makan: makanRates.weekly,
        transport: transportRates.weekly,
        total: Math.round((basicRates.weekly + makanRates.weekly + transportRates.weekly) * 100) / 100,
      },
      monthly: {
        basic: basicRates.monthly,
        makan: makanRates.monthly,
        transport: transportRates.monthly,
        total: Math.round((basicRates.monthly + makanRates.monthly + transportRates.monthly) * 100) / 100,
      },
    };

    return jsonResponse(
      {
        karyawan: {
          id: emp.id,
          id_karyawan: emp.id_karyawan,
          nm_karyawan: emp.nm_karyawan,
          dept: emp.dept,
          jabatan: emp.jabatan,
          config: {
            basic_salary: basicNominal,
            salary_period: emp.salary_period || "bulan",
            salary_operator: emp.salary_operator || "bagi",
            salary_factor: Number(emp.salary_factor) || 26,

            makan_nominal: makanNominal,
            makan_period: emp.makan_period || "hari",
            makan_operator: emp.makan_operator || "kali",
            makan_factor: Number(emp.makan_factor) || 26,

            transport_nominal: transportNominal,
            transport_period: emp.transport_period || "hari",
            transport_operator: emp.transport_operator || "kali",
            transport_factor: Number(emp.transport_factor) || 26,

            salary_notes: emp.salary_notes || "",
          },
          breakdown,
        },
        user: userRow || { username },
      },
      {},
      request
    );
  } catch (error) {
    console.error("GET EMPLOYEE SALARY ERROR:", error);
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
