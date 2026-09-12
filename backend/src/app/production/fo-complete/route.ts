import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CompleteCountRow = RowDataPacket & {
  total: number;
};

type CompleteRow = RowDataPacket & {
  no_fo: string;
  doc_date: Date | string | null;
  customer: string | null;
  qty_order: number | null;
  status: string | null;
  status_lanjutan: string | null;
  QC_ReadyGudang: Date | string | null;
  Final_Cust: Date | string | null;
  uang_muka: number | string | null;
  sisa_tagihan: number | string | null;
  totalrp: number | string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const filterType = url.searchParams.get("filter_type")?.trim() ?? "today";
    const startDate = url.searchParams.get("start_date")?.trim() ?? "";
    const endDate = url.searchParams.get("end_date")?.trim() ?? "";
    const rawLimit = url.searchParams.get("limit") ?? "5";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const username = url.searchParams.get("username")?.trim() ?? "";
    const isAllData = rawLimit === "all";
    const limit = isAllData
      ? null
      : Math.min(Math.max(Number(rawLimit) || 5, 1), 100);
    const page = Math.max(requestedPage || 1, 1);
    const offset = limit ? (page - 1) * limit : 0;

    let userRole = "";
    let namaUser = "";
    let pengguna = "";
    if (username) {
      const [userRows] = await pool.execute<any[]>(
        "SELECT tingkat, nm_user, pengguna FROM tb_pengguna WHERE LOWER(TRIM(pengguna)) = LOWER(TRIM(?)) LIMIT 1",
        [username]
      );
      if (userRows && userRows.length > 0) {
        userRole = userRows[0].tingkat ? String(userRows[0].tingkat).toLowerCase().trim() : "";
        namaUser = userRows[0].nm_user ? String(userRows[0].nm_user).trim() : "";
        pengguna = userRows[0].pengguna ? String(userRows[0].pengguna).trim() : "";
      }
    }

    const isUserSpecific = Boolean(username && userRole && userRole !== "admin");

    const params: Record<string, any> = {
      search,
      searchPattern: `%${search}%`,
    };

    let baseSql = "";
    let dateCol = "base.sort_date";
    let subWhereClause = "1=1";

    if (isUserSpecific) {
      params.username = username;
      params.pengguna = pengguna || username;
      params.namaUser = namaUser || username;

      let roleStatusCondition = "1=1";
      if (userRole === "tukang-desain") {
        roleStatusCondition = "c.status_lanjutan IN ('FINAL DESAIN', 'Desain Ready')";
      } else if (userRole === "tukang-layout") {
        roleStatusCondition = "c.status_lanjutan IN ('LAYOUT DESAIN SUDAH SIAP UTK DI PRINTOUT', 'Layout Ready')";
      } else if (userRole === "pengawas") {
        roleStatusCondition = `c.status_lanjutan IN (
          'BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT BELUM PROSES',
          'BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT LAGI DIPROSES',
          'BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS SUBLIME',
          'Bahan Kain/Kaos DTF Ready',
          'Persiapan Bahan Kain/Kaos for DTF'
        )`;
      } else if (userRole === "tukang-print") {
        roleStatusCondition = `c.status_lanjutan IN (
          'PRINTOUT READY, LAGI PERSIAPAN BAHAN KAIN/KAOS/JERSEY',
          'BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS',
          'PrintOut Ready',
          'Printout DTF Selesai'
        )`;
      } else if (userRole === "tukang-press") {
        roleStatusCondition = "c.status_lanjutan IN ('KAIN SUBLIME READY CUTTING', 'Kain Ready Cutting')";
      } else if (userRole === "tukang-pressdtf") {
        roleStatusCondition = "c.status_lanjutan IN ('PRESS DTF SELESAI, PERIKSA KWALITASNYA', 'Kaos/Jersey Siap QC')";
      } else if (userRole === "tukang-cutting") {
        roleStatusCondition = "c.status_lanjutan IN ('READY UNTUK DIJAHIT', 'Kain Ready Jahit')";
      } else if (userRole === "tukang-qc") {
        roleStatusCondition = "c.status_lanjutan IN ('PRODUK READY DIGUDANG, SELESAI DIPACKING', 'Selesai Packing, Siap diAmbil')";
      } else if (userRole === "tukang-layanics") {
        roleStatusCondition = "c.status_lanjutan IN ('PRODUK SUDAH DITERIMA CUSTOMER', 'Produk diterima Customer')";
      }

      baseSql = `
        SELECT
          TRIM(k.no_fo) AS no_fo,
          c.datetime_lanjutan AS doc_date,
          k.customer AS customer,
          k.qty_order AS qty_order,
          c.status_lanjutan AS status_lanjutan,
          c.status_lanjutan AS status,
          k.uang_muka AS uang_muka,
          k.sisa_tagihan AS sisa_tagihan,
          k.totalrp AS totalrp,
          k.QC_ReadyGudang AS QC_ReadyGudang,
          k.Final_Cust AS Final_Cust,
          c.datetime_lanjutan AS sort_date
        FROM tb_control c
        JOIN tb_kdfo k ON TRIM(k.no_fo) = TRIM(c.no_fo)
      `;

      subWhereClause = `
        (
          LOWER(TRIM(c.username)) = LOWER(TRIM(:username))
          OR LOWER(TRIM(c.nama_pegawai)) = LOWER(TRIM(:pengguna))
          OR LOWER(TRIM(c.nama_pegawai)) = LOWER(TRIM(:namaUser))
        )
        AND (${roleStatusCondition})
      `;
    } else {
      baseSql = `
        SELECT
          TRIM(k.no_fo) AS no_fo,
          k.date_status AS doc_date,
          k.customer AS customer,
          k.qty_order AS qty_order,
          k.ket_status AS status_lanjutan,
          k.ket_status AS status,
          k.uang_muka AS uang_muka,
          k.sisa_tagihan AS sisa_tagihan,
          k.totalrp AS totalrp,
          k.QC_ReadyGudang AS QC_ReadyGudang,
          k.Final_Cust AS Final_Cust,
          k.date_status AS sort_date
        FROM tb_kdfo k
        WHERE k.no_fo IS NOT NULL AND TRIM(k.no_fo) <> ''
      `;

      subWhereClause = "k.ket_status IN ('PRODUK READY DIGUDANG, SELESAI DIPACKING', 'PRODUK SUDAH DITERIMA CUSTOMER')";
    }

    let dateClause = "1=1";
    if (filterType === "today") {
      dateClause = `DATE(${dateCol}) = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "this_week") {
      dateClause = `YEARWEEK(${dateCol}, 1) = YEARWEEK(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR), 1)`;
    } else if (filterType === "this_month") {
      dateClause = `YEAR(${dateCol}) = YEAR(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)) AND MONTH(${dateCol}) = MONTH(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "this_year") {
      dateClause = `YEAR(${dateCol}) = YEAR(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`;
    } else if (filterType === "date_range" && startDate && endDate) {
      dateClause = `DATE(${dateCol}) >= :startDate AND DATE(${dateCol}) <= :endDate`;
      params.startDate = startDate;
      params.endDate = endDate;
    }

    let searchWhereClause = `(
      :search = ''
      OR base.no_fo LIKE :searchPattern
      OR base.customer LIKE :searchPattern
    )
    AND (${dateClause})`;

    const innerQuery = isUserSpecific
      ? `${baseSql} WHERE ${subWhereClause}`
      : `${baseSql} AND ${subWhereClause}`;

    const countSql = `SELECT COUNT(*) AS total
                      FROM (${innerQuery}) AS base
                      WHERE ${searchWhereClause}`;

    const paginationSql = limit ? `LIMIT ${limit} OFFSET ${offset}` : "";
    const querySql = `SELECT base.no_fo, base.doc_date, base.customer, base.qty_order, 
                             base.status_lanjutan, base.status,
                             base.QC_ReadyGudang, base.Final_Cust,
                             base.uang_muka, base.sisa_tagihan, base.totalrp
                      FROM (${innerQuery}) AS base
                      WHERE ${searchWhereClause}
                      ORDER BY base.sort_date DESC, base.no_fo DESC
                      ${paginationSql}`;

    const [countRows] = await pool.execute<CompleteCountRow[]>(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);

    const [items] = await pool.execute<CompleteRow[]>(querySql, params);

    return jsonResponse(
      {
        count: total,
        items,
        page,
        limit: isAllData ? "all" : limit,
        totalPages: limit ? Math.max(Math.ceil(total / limit), 1) : 1,
      },
      {},
      request,
    );
  } catch (error) {
    console.error("FO-COMPLETE ERROR:", error);
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
