import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "202.155.95.118",
    port: 3306,
    user: "root",
    password: "terserah",
    database: "dbati",
    namedPlaceholders: true
  });

  const [rows] = await connection.execute(
    `SELECT c1.no_fo, c1.status_lanjutan, k.deadline_date, DATEDIFF(k.deadline_date, CURDATE()) AS deadline_days
     FROM tb_control c1
     INNER JOIN (
       SELECT MAX(id) AS max_id
       FROM tb_control
       GROUP BY no_fo
     ) c2 ON c1.id = c2.max_id
     INNER JOIN tb_kdfo k ON TRIM(c1.no_fo) = TRIM(k.no_fo)
     WHERE c1.status_lanjutan NOT IN ('Produk diterima Customer', 'Selesai Packing, Siap diAmbil')
     AND EXISTS (
       SELECT 1 FROM tb_control tc_user
       WHERE TRIM(tc_user.no_fo) = TRIM(c1.no_fo)
       AND LOWER(TRIM(tc_user.username)) = 'yohand'
     )`
  );

  console.log("Total active FOs where yohand has worked on them:");
  console.log(rows.length);
  console.log("Details:");
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
