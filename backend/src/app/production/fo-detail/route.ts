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

    let [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         TRIM(c.no_fo) AS no_fo,
         k.doc_date AS doc_date,
         k.order_date AS order_date,
         k.tgl_um AS deposit_date,
         COALESCE(c.customer, k.customer) AS customer,
         k.qty_order AS qty_order,
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
         k.Layout_ReadyPrint AS Layout_Ready,
         k.Start_Print,
         k.Print_ReadyPress,
         k.Ambil_Kain,
         k.Kain_ReadyPress,
         k.Start_Press,
         k.Press_ReadyCut,
         k.Start_Cut,
         k.Cut_ReadyJahit,
         k.Start_Jahit,
         k.Jahit_ReadyQC,
         k.Start_QC,
         k.FinalQC_Packiing,
         k.QC_ReadyGudang,
         k.Final_Cust,
         c.status_lanjutan AS status_lanjutan,
         c.datetime_lanjutan AS datetime_lanjutan,
         k.jenis_order AS jenis_order
       FROM tb_control c
       LEFT JOIN tb_kdfo k ON TRIM(c.no_fo) = TRIM(k.no_fo)
       WHERE TRIM(c.no_fo) = :noFo
       ORDER BY c.doc_date DESC, c.id DESC
       LIMIT 1`,
      { noFo },
    );

    if (rows.length === 0) {
      const [fallbackRows] = await pool.execute<RowDataPacket[]>(
        `SELECT 
           TRIM(k.no_fo) AS no_fo,
           k.doc_date AS doc_date,
           k.order_date AS order_date,
           k.tgl_um AS deposit_date,
           COALESCE(c.customer, k.customer) AS customer,
           k.qty_order AS qty_order,
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
           k.Layout_ReadyPrint AS Layout_Ready,
           k.Start_Print,
           k.Print_ReadyPress,
           k.Ambil_Kain,
           k.Kain_ReadyPress,
           k.Start_Press,
           k.Press_ReadyCut,
           k.Start_Cut,
           k.Cut_ReadyJahit,
           k.Start_Jahit,
           k.Jahit_ReadyQC,
           k.Start_QC,
           k.FinalQC_Packiing,
           k.QC_ReadyGudang,
           k.Final_Cust,
           c.status_lanjutan AS status_lanjutan,
           c.datetime_lanjutan AS datetime_lanjutan,
           k.jenis_order AS jenis_order
         FROM tb_kdfo k
         LEFT JOIN tb_control c ON TRIM(k.no_fo) = TRIM(c.no_fo)
         WHERE TRIM(k.no_fo) = :noFo
         LIMIT 1`,
        { noFo },
      );
      rows = fallbackRows;
    }

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
