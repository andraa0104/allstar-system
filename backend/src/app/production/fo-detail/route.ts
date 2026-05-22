import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const noFo = url.searchParams.get("no_fo")?.trim() ?? "";

    if (!noFo) {
      return jsonResponse(
        { message: "Parameter 'no_fo' diperlukan." },
        { status: 400 },
        request,
      );
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         TRIM(c.no_fo) AS no_fo,
         c.doc_date,
         c.order_date,
         c.deposit_date,
         c.customer,
         c.qty_order,
         k.ket AS remark,
         k.deadline_date,
         k.pos_date,
         k.QC_ReadyGudang,
         k.sales,
         k.desain,
         k.totalrp,
         k.uang_muka,
         k.tgl_um,
         k.sisa_tagihan,
         k.bayar_lunas,
         k.tgl_pelunasan,
         k.telp_cus,
         k.Desain_Ready,
         k.Start_Layout,
         k.Layout_ReadyPrint AS Layout_Ready
       FROM tb_control c
       LEFT JOIN tb_kdfo k ON TRIM(c.no_fo) = TRIM(k.no_fo)
       WHERE TRIM(c.no_fo) = :noFo
       ORDER BY c.doc_date DESC, c.id DESC
       LIMIT 1`,
      { noFo },
    );

    if (rows.length === 0) {
      return jsonResponse(
        { message: `Order dengan No FO '${noFo}' tidak ditemukan.` },
        { status: 404 },
        request,
      );
    }

    return jsonResponse(rows[0], {}, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
