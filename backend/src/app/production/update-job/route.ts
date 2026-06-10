import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { emptyResponse, errorResponse, jsonResponse } from "@/lib/response";

export const runtime = "nodejs";

const getWitaTime = (): Date => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
};

const formatToMysqlDateTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { no_fo, username, nama_pegawai, nama_penerima, keterangan, datetime_lanjutan } = await request.json();

    if (!no_fo || !username) {
      return jsonResponse({ message: "Parameter 'no_fo' dan 'username' wajib diisi." }, { status: 400 }, request);
    }

    // 1. Get user details
    const [userRows] = await connection.execute<RowDataPacket[]>(
      "SELECT tingkat, nm_user FROM tb_pengguna WHERE LOWER(TRIM(pengguna)) = LOWER(TRIM(?)) LIMIT 1",
      [username]
    );

    if (userRows.length === 0) {
      return jsonResponse({ message: `User '${username}' tidak ditemukan.` }, { status: 404 }, request);
    }

    const jobdesk = userRows[0].tingkat.trim();
    const namePegawai = nama_pegawai || userRows[0].nm_user || "NN";

    // 2. Fetch tb_kdfo record
    const [foRows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM tb_kdfo WHERE TRIM(no_fo) = TRIM(?) LIMIT 1",
      [no_fo]
    );

    if (foRows.length === 0) {
      return jsonResponse({ message: `Form Order '${no_fo}' tidak ditemukan.` }, { status: 404 }, request);
    }

    const fo = foRows[0];
    const Kkprs = [
      fo.no_fo,             // 0
      fo.doc_date,          // 1
      fo.pos_date,          // 2
      fo.order_date,        // 3
      fo.deadline_date,     // 4
      fo.kd_cus,            // 5
      fo.customer,          // 6
      fo.telp_cus,          // 7
      fo.sales,             // 8
      fo.desain,            // 9
      fo.qty_order,         // 10
      fo.totalrp,           // 11
      fo.uang_muka,         // 12
      fo.tgl_um,            // 13
      fo.bayar_lunas,       // 14
      fo.tgl_pelunasan,     // 15
      fo.sisa_tagihan,      // 16
      fo.ket,               // 17
      fo.jurnal,            // 18
      fo.bahan,             // 19
      fo.ket_status,        // 20
      fo.date_status,       // 21
      fo.Desain_Ready,      // 22
      fo.Start_Layout,      // 23
      fo.Layout_ReadyPrint, // 24
      fo.Start_Print,       // 25
      fo.Ambil_Kain,        // 26
      fo.Kain_ReadyPress,   // 27
      fo.Print_ReadyPress,  // 28
      fo.Start_Press,       // 29
      fo.Press_ReadyCut,    // 30
      fo.Start_Cut,         // 31
      fo.Cut_ReadyJahit,    // 32
      fo.Start_Jahit,       // 33
      fo.Jahit_ReadyQC,     // 34
      fo.Start_QC,          // 35
      fo.FinalQC_Packiing,  // 36
      fo.QC_ReadyGudang,    // 37
      fo.Final_Cust,        // 38
      fo.jenis_order        // 39
    ];

    const isNull = (val: any) => val === null || val === undefined || val === "";

    let cmbstatus = "";
    let statusprod = "";
    let errorMsg = "";

    // State machine logic matching VB6 Case
    if (jobdesk === "Tukang-PressDTF" && Kkprs[39] === "JERSEY") {
      return jsonResponse({ message: "Transaksi Ilegal, jenis orderan JERSEY!!!" }, { status: 400 }, request);
    }
    if (jobdesk === "Pengawas" && Kkprs[39] === "DTF ONLY") {
      return jsonResponse({ message: "Transaksi Ilegal, jenis orderan DTF ONLY!!!" }, { status: 400 }, request);
    }

    switch (jobdesk) {
      case "Tukang-Desain":
        if (isNull(Kkprs[22])) {
          statusprod = "DESAIN BELUM TERSEDIA";
          cmbstatus = "Desain Ready";
        } else {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana !";
        }
        break;

      case "Tukang-Layout":
        if (isNull(Kkprs[23]) && !isNull(Kkprs[22])) {
          statusprod = "Desain Ready";
          cmbstatus = "Start Layout";
        } else if (isNull(Kkprs[24]) && !isNull(Kkprs[23])) {
          statusprod = "Start Layout";
          cmbstatus = "Layout Ready";
        } else if (!isNull(Kkprs[24]) && !isNull(Kkprs[23])) {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, Terima Kasih !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      case "Pengawas":
      case "Tukang-Print":
        if (isNull(Kkprs[26]) && !isNull(Kkprs[24]) && jobdesk === "Pengawas") {
          statusprod = "Layout Ready";
          cmbstatus = "Persiapan Bahan Kain/Kaos for DTF";
        } else if (isNull(Kkprs[26]) && jobdesk === "Tukang-Print" && Kkprs[39] !== "DTF ONLY") {
          errorMsg = "KAIN/KAOS/JERSEY BELUM DIPERSIAPKAN, KOORDINASI DENGAN PENGAWAS !!!";
        } else if (isNull(Kkprs[25]) && !isNull(Kkprs[24]) && !isNull(Kkprs[26]) && Kkprs[39] !== "DTF ONLY" && jobdesk === "Tukang-Print") {
          statusprod = "Persiapan Bahan Kain/Kaos for DTF";
          cmbstatus = "Start PrintOut";
        } else if (isNull(Kkprs[25]) && !isNull(Kkprs[24]) && Kkprs[39] === "DTF ONLY" && jobdesk === "Tukang-Print") {
          statusprod = "Layout Desain DTF Selesai";
          cmbstatus = "Start PrintOut";
        } else if (isNull(Kkprs[27]) && !isNull(Kkprs[26]) && jobdesk === "Pengawas") {
          statusprod = "Persiapan Bahan Kain/Kaos for DTF";
          cmbstatus = "Bahan Kain/Kaos DTF Ready";
        } else if (isNull(Kkprs[28]) && !isNull(Kkprs[25]) && Kkprs[39] !== "DTF ONLY" && jobdesk === "Tukang-Print") {
          statusprod = "Start Printout";
          cmbstatus = "PrintOut Ready";
        } else if (isNull(Kkprs[28]) && !isNull(Kkprs[25]) && Kkprs[39] === "DTF ONLY" && jobdesk === "Tukang-Print") {
          statusprod = "Start Printout";
          cmbstatus = "Printout DTF Selesai";
        } else if (!isNull(Kkprs[25]) && !isNull(Kkprs[28]) && jobdesk === "Tukang-Print") {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      case "Tukang-Press":
      case "Tukang-PressDTF":
        if ((isNull(Kkprs[28]) && jobdesk === "Tukang-Press") || (isNull(Kkprs[28]) && Kkprs[39] !== "JERSEY" && jobdesk === "Tukang-PressDTF")) {
          errorMsg = "Cek apakah kain/kaos dan printout sublime/dtf sudah siap atau sesi sebelumnya belum UPDATE ???, lapor pengawas !!!";
        } else if (isNull(Kkprs[29]) && !isNull(Kkprs[27]) && !isNull(Kkprs[28])) {
          if (jobdesk === "Tukang-Press") {
            statusprod = "PrintOut & Kain Ready";
            cmbstatus = "Start Press";
          } else {
            statusprod = "PrintOut & Kaos Ready";
            cmbstatus = "Start Press";
          }
        } else if (isNull(Kkprs[30]) && !isNull(Kkprs[29])) {
          if (jobdesk === "Tukang-Press") {
            statusprod = "Start Press";
            cmbstatus = "Kain Ready Cutting";
          } else {
            statusprod = "Start Press";
            cmbstatus = "Kaos/Jersey Siap QC";
          }
        } else if (!isNull(Kkprs[29]) && !isNull(Kkprs[30]) && jobdesk === "Tukang-Press") {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else if (!isNull(Kkprs[34]) && !isNull(Kkprs[35]) && jobdesk === "Tukang-PressDTF") {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      case "Tukang-Cutting":
        if (isNull(Kkprs[31]) && !isNull(Kkprs[30])) {
          statusprod = "Kain Ready Cutting";
          cmbstatus = "Start Cutting";
        } else if (isNull(Kkprs[32]) && !isNull(Kkprs[31])) {
          statusprod = "Start Cutting";
          cmbstatus = "Kain Ready Jahit";
        } else if (!isNull(Kkprs[31]) && !isNull(Kkprs[32])) {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      case "Tukang-QC":
        if (isNull(Kkprs[33]) && !isNull(Kkprs[32])) {
          statusprod = "Kain Ready Jahit";
          cmbstatus = "Start Jahit";
        } else if (isNull(Kkprs[34]) && !isNull(Kkprs[33])) {
          statusprod = "Start Jahit";
          cmbstatus = "Produk Ready QC";
        } else if (isNull(Kkprs[35]) && !isNull(Kkprs[34])) {
          statusprod = "Produk Ready QC";
          cmbstatus = "Start QC";
        } else if (isNull(Kkprs[36]) && !isNull(Kkprs[35])) {
          statusprod = "Start QC";
          cmbstatus = "Siap Packing";
        } else if (isNull(Kkprs[37]) && !isNull(Kkprs[36])) {
          statusprod = "Siap Packing";
          cmbstatus = "Selesai Packing, Siap diAmbil";
        } else if (!isNull(Kkprs[34]) && !isNull(Kkprs[35]) && !isNull(Kkprs[36]) && !isNull(Kkprs[37])) {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      case "Tukang-LayaniCS":
        if (isNull(Kkprs[38]) && !isNull(Kkprs[37])) {
          statusprod = "Selesai Packing, Siap diAmbil";
          cmbstatus = "Produk diterima Customer";
        } else if (!isNull(Kkprs[38])) {
          errorMsg = "Tugas Anda pada FO ini sdh terlaksana, TERIMA KASIH !";
        } else {
          errorMsg = "Tahapan pengerjaan sebelumnya belum siap!";
        }
        break;

      default:
        errorMsg = `Role '${jobdesk}' tidak berwenang memperbarui pekerjaan.`;
    }

    if (errorMsg) {
      return jsonResponse({ message: errorMsg }, { status: 400 }, request);
    }

    if (!cmbstatus) {
      return jsonResponse({ message: "Tidak ada status lanjutan yang dapat diproses." }, { status: 400 }, request);
    }

    if (cmbstatus === "Produk diterima Customer" && (!nama_penerima || !nama_penerima.trim())) {
      return jsonResponse({ message: "Nama Penerima wajib diisi." }, { status: 400 }, request);
    }

    // Begin SQL Transaction
    await connection.beginTransaction();

    const actualNowStr = formatToMysqlDateTime(getWitaTime());

    let witaNowStr = "";
    if (datetime_lanjutan) {
      witaNowStr = String(datetime_lanjutan).replace("T", " ");
      if (witaNowStr.length === 16) {
        witaNowStr += ":00";
      }
    } else {
      witaNowStr = actualNowStr;
    }

    let ket_status = "";
    let updateFields: Record<string, string> = {
      date_status: witaNowStr
    };

    switch (cmbstatus) {
      case "Desain Ready":
        ket_status = "FINAL DESAIN";
        updateFields.Desain_Ready = witaNowStr;
        break;
      case "Start Layout":
        ket_status = "PROSES SUSUN LAYOUT PRINTING";
        updateFields.Start_Layout = witaNowStr;
        break;
      case "Layout Ready":
        ket_status = "LAYOUT DESAIN SUDAH SIAP UTK DI PRINTOUT";
        updateFields.Layout_ReadyPrint = witaNowStr;
        break;
      case "Start PrintOut":
        if (isNull(Kkprs[27])) {
          ket_status = "DALAM PROSES PRINTING DAN PERSIAPAN BAHAN KAIN";
        } else {
          ket_status = "DALAM PROSES PRINTING DAN BAHAN KAIN SUDAH SIAP";
        }
        updateFields.Start_Print = witaNowStr;
        break;
      case "Persiapan Bahan Kain/Kaos for DTF":
        ket_status = "PROSES PERSIAPAN KAIN/KAOS/JERSEY ";
        updateFields.Ambil_Kain = witaNowStr;
        break;
      case "Bahan Kain/Kaos DTF Ready":
        if (isNull(Kkprs[25])) {
          ket_status = "BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT BELUM PROSES";
        } else if (isNull(Kkprs[28]) && !isNull(Kkprs[25])) {
          ket_status = "BAHAN KAIN/KAOS/JERSEY READY, PRINTOUT LAGI DIPROSES";
        } else {
          ket_status = "BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS SUBLIME";
        }
        updateFields.Kain_ReadyPress = witaNowStr;
        break;
      case "PrintOut Ready":
        if (isNull(Kkprs[27])) {
          ket_status = "PRINTOUT READY, LAGI PERSIAPAN BAHAN KAIN/KAOS/JERSEY";
        } else {
          ket_status = "BAHAN KAIN/KAOS/JERSEY DAN PRINTOUT READY, SIAP UTK DIPRESS";
        }
        updateFields.Print_ReadyPress = witaNowStr;
        break;
      case "Printout DTF Selesai":
        ket_status = "PRINT DTF SELESAI, READY DIGUDANG ";
        updateFields = {
          ...updateFields,
          Ambil_Kain: witaNowStr,
          Kain_ReadyPress: witaNowStr,
          Print_ReadyPress: witaNowStr,
          Start_Press: witaNowStr,
          Press_ReadyCut: witaNowStr,
          Start_Cut: witaNowStr,
          Cut_ReadyJahit: witaNowStr,
          Start_Jahit: witaNowStr,
          Jahit_ReadyQC: witaNowStr,
          Start_QC: witaNowStr,
          FinalQC_Packiing: witaNowStr,
          QC_ReadyGudang: witaNowStr
        };
        break;
      case "Start Press":
        ket_status = "PROSES PRESS SUBLIME/DTF";
        updateFields.Start_Press = witaNowStr;
        break;
      case "Kain Ready Cutting":
        ket_status = "KAIN SUBLIME READY CUTTING";
        updateFields.Press_ReadyCut = witaNowStr;
        break;
      case "Kaos/Jersey Siap QC":
        ket_status = "PRESS DTF SELESAI, PERIKSA KWALITASNYA ";
        updateFields = {
          ...updateFields,
          Press_ReadyCut: witaNowStr,
          Start_Cut: witaNowStr,
          Cut_ReadyJahit: witaNowStr,
          Start_Jahit: witaNowStr,
          Jahit_ReadyQC: witaNowStr
        };
        break;
      case "Start Cutting":
        ket_status = "PROSES CUTTING KAIN SUBLIME";
        updateFields.Start_Cut = witaNowStr;
        break;
      case "Kain Ready Jahit":
        ket_status = "READY UNTUK DIJAHIT";
        updateFields.Cut_ReadyJahit = witaNowStr;
        break;
      case "Start Jahit":
        ket_status = "PROSES JAHIT PRODUK";
        updateFields.Start_Jahit = witaNowStr;
        break;
      case "Produk Ready QC":
        ket_status = "READY UNTUK DI QC, PRODUK SELESAI DIJAHIT";
        updateFields.Jahit_ReadyQC = witaNowStr;
        break;
      case "Start QC":
        ket_status = "PROSES QUALITY CONTROL";
        updateFields.Start_QC = witaNowStr;
        break;
      case "Siap Packing":
        ket_status = "SIAP DIPACKING, SELESAI DIPERIKSA";
        updateFields.FinalQC_Packiing = witaNowStr;
        break;
      case "Selesai Packing, Siap diAmbil":
        ket_status = "PRODUK READY DIGUDANG, SELESAI DIPACKING";
        updateFields.QC_ReadyGudang = witaNowStr;
        break;
      case "Produk diterima Customer":
        ket_status = "PRODUK SUDAH DITERIMA CUSTOMER";
        updateFields.Final_Cust = witaNowStr;
        break;
    }

    updateFields.ket_status = ket_status;

    // Build UPDATE query
    const setClauses = Object.keys(updateFields).map((col) => `${col} = :${col}`).join(", ");
    await connection.execute(
      `UPDATE tb_kdfo SET ${setClauses} WHERE TRIM(no_fo) = TRIM(:no_fo)`,
      { ...updateFields, no_fo }
    );

    // 3. Insert tracking record into tb_control
    // Generate no_job
    const [[maxRow]] = await connection.execute<any[]>("SELECT MAX(id) as maxId FROM tb_control");
    const nextId = (maxRow?.maxId || 0) + 1;
    const noJob = `ATI.MPH-${String(nextId).padStart(8, "0")}`;

    // Get previous state datetime based on VB6 DTPicker3 logic
    let previousDate = Kkprs[21]; // default fallback (date_status)
    switch (cmbstatus) {
      case "Desain Ready":
        previousDate = Kkprs[1]; // doc_date
        break;
      case "Start Layout":
        previousDate = Kkprs[22]; // Desain_Ready
        break;
      case "Layout Ready":
        previousDate = Kkprs[23]; // Start_Layout
        break;
      case "Persiapan Bahan Kain/Kaos for DTF":
        previousDate = Kkprs[24]; // Layout_ReadyPrint
        break;
      case "Start PrintOut":
        previousDate = Kkprs[26]; // Ambil_Kain
        break;
      case "Bahan Kain/Kaos DTF Ready":
        previousDate = Kkprs[26]; // Ambil_Kain
        break;
      case "PrintOut Ready":
      case "Printout DTF Selesai":
        previousDate = Kkprs[25]; // Start_Print
        break;
      case "Start Press":
        previousDate = Kkprs[28]; // Print_ReadyPress
        break;
      case "Kain Ready Cutting":
      case "Kaos/Jersey Siap QC":
        previousDate = Kkprs[29]; // Start_Press
        break;
      case "Start Cutting":
        previousDate = Kkprs[30]; // Press_ReadyCut
        break;
      case "Kain Ready Jahit":
        previousDate = Kkprs[21]; // date_status
        break;
      case "Start Jahit":
        previousDate = Kkprs[32]; // Cut_ReadyJahit
        break;
      case "Produk Ready QC":
        previousDate = Kkprs[33]; // Start_Jahit
        break;
      case "Start QC":
        previousDate = Kkprs[34]; // Jahit_ReadyQC
        break;
      case "Siap Packing":
        previousDate = Kkprs[35]; // Start_QC
        break;
      case "Selesai Packing, Siap diAmbil":
        previousDate = Kkprs[36]; // FinalQC_Packiing
        break;
      case "Produk diterima Customer":
        previousDate = Kkprs[37]; // QC_ReadyGudang
        break;
      case "KOMPLIT":
        previousDate = Kkprs[38]; // Final_Cust
        break;
    }

    if (datetime_lanjutan) {
      const todayObj = new Date(actualNowStr);
      const selectedDateObj = new Date(datetime_lanjutan);

      const minDate = new Date(todayObj);
      minDate.setDate(minDate.getDate() - 1);
      minDate.setHours(0, 0, 0, 0);

      const maxDate = new Date(todayObj);
      maxDate.setDate(maxDate.getDate() + 1);
      maxDate.setHours(23, 59, 59, 999);

      if (selectedDateObj < minDate || selectedDateObj > maxDate) {
        return jsonResponse({ message: `Waktu pengerjaan harus antara H-1 s/d H+1 dari hari ini.` }, { status: 400 }, request);
      }
    }

    const controlData = {
      no_job: noJob,
      doc_date: actualNowStr,
      no_fo: fo.no_fo,
      order_date: fo.order_date ? formatToMysqlDateTime(new Date(fo.order_date)) : null,
      deposit_date: fo.tgl_um ? formatToMysqlDateTime(new Date(fo.tgl_um)) : (fo.order_date ? formatToMysqlDateTime(new Date(fo.order_date)) : null),
      customer: fo.customer,
      qty_order: fo.qty_order,
      status_awal: statusprod,
      datetime_awal: previousDate ? formatToMysqlDateTime(new Date(previousDate)) : null,
      status_lanjutan: cmbstatus,
      datetime_lanjutan: witaNowStr,
      nama_pegawai: namePegawai,
      username: username,
      jobdesk: jobdesk,
      ket: (keterangan !== undefined && keterangan !== null) ? keterangan : null
    };

    await connection.execute(
      `INSERT INTO tb_control (
        no_job, doc_date, no_fo, order_date, deposit_date, customer, qty_order,
        status_awal, datetime_awal, status_lanjutan, datetime_lanjutan,
        nama_pegawai, username, jobdesk, ket
      ) VALUES (
        :no_job, :doc_date, :no_fo, :order_date, :deposit_date, :customer, :qty_order,
        :status_awal, :datetime_awal, :status_lanjutan, :datetime_lanjutan,
        :nama_pegawai, :username, :jobdesk, :ket
      )`,
      controlData
    );

    await connection.commit();

    // Trigger WhatsApp notification
    if (cmbstatus === "Selesai Packing, Siap diAmbil" || cmbstatus === "Produk diterima Customer") {
      const phone = fo.telp_cus;
      const customer = fo.customer;
      if (phone && phone !== "-" && phone.trim() !== "") {
        let formattedPhone = String(phone).replace(/[^0-9]/g, "");
        if (formattedPhone.startsWith("0")) {
          formattedPhone = "62" + formattedPhone.slice(1);
        } else if (!formattedPhone.startsWith("62")) {
          formattedPhone = "62" + formattedPhone;
        }

        // Only send if we have a valid formatted number
        if (formattedPhone.length >= 10) {
          let message = "";
          if (cmbstatus === "Selesai Packing, Siap diAmbil") {
            message = `Halo kak *${customer}* 🎉

Dengan senang hati kami informasikan bahwa pesanan jerseynya telah selesai dikerjakan dengan hasil yang memuaskan dan siap untuk Anda ambil. ✨

📋 *DETAIL PESANAN*
✅ Nomor Form Order (FO): ${no_fo}
✅ Pengambilan: Kapan saja sesuai jam operasional
✅ Lokasi: https://maps.app.goo.gl/NbhMbU7j1nRqUmCw8

🎁 *PENAWARAN SPESIAL UNTUK ANDA*
Jangan lewatkan kesempatan emas ini:
💰 Order 6+ jersey → Dapatkan harga promo bulanan/tahunan (hemat banyak!)
🎨 Konsultasi desain GRATIS untuk pemesanan berikutnya

---

📍 *LOKASI TOKO KAMI*
*Allstar Apparel*
Jalan Pelita No.61 C, Sungai Pinang Dalam
*(Lokasi strategis: Berada di antara Indomaret dan Ghufta Computer)*

📞 Hubungi Kami:
WhatsApp/Telepon: 0852-5709-1894

Terima kasih telah mempercayai Allstar Apparel untuk hasil terbaik! Ditunggu kedatangan Anda 🙏🏻✨

*CS: SAFA & PUSPA* 💪`;
          } else {
            message = `Thank you kak  🙏🏻✨ 
Senang banget mengabarkan jerseynya sudah diterima oleh *${nama_penerima}*! Semoga hasil dan kualitasnya memuaskan 🎊

📸 *SHARE PENGALAMAN ANDA BERSAMA KAMI!*
 Udah nyoba jerseynya? Jangan lupa: 
✅ Follow IG kami: @allstar_apparel_samarinda 
✅ Tag kami di stories/post anda (biar kami repost!) 
✅ Drop review di Google Maps (review bintang 5 are appreciated 🌟) 

💬 Feedback & saran dari anda sangat berharga buat kami! Bisa DM kami melalui Instagram 🙏🏻

🎁 *PENAWARAN SPESIAL UNTUK PEMBELIAN BERIKUTNYA*
 Jangan hanya sekali berbelanja, repeat order dan dapet keuntungan: 
💰 Order 6+ jersey bulan ini dapat harga promo
🎨 Konsultasi desain GRATIS untuk pemesanan berikutnya 


🏪 *WELCOME BACK ANYTIME* 
*Allstar Apparel* 
Jl. Pelita No.61 C, Sungai Pinang Dalam 
📍 Ruko bagian tengah Antara Indomaret & Ghufta Computer 

Untuk pemesanan selanjutnya, silakan hubungi kami:
📱 WhatsApp/Telepon: 0852-5709-1894 

Thanks for the love! See you soon kak 🙌✨ 

*${username}* 💪`;
          }

          fetch("http://localhost:8011/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: formattedPhone, message })
          }).catch(err => console.error("Failed to send WhatsApp message:", err));
        }
      }
    }

    return jsonResponse({
      message: `Pekerjaan berhasil diperbarui ke status: '${ket_status}'`,
      nextStatus: cmbstatus,
      ketStatus: ket_status
    }, {}, request);

  } catch (error) {
    await connection.rollback();
    return errorResponse(error, request);
  } finally {
    connection.release();
  }
}

export async function OPTIONS(request: Request) {
  return emptyResponse({ status: 204 }, request);
}
