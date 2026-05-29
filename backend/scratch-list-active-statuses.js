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
    `SELECT c1.status_lanjutan, COUNT(*) AS count
     FROM tb_control c1
     INNER JOIN (
       SELECT MAX(id) AS max_id
       FROM tb_control
       GROUP BY no_fo
     ) c2 ON c1.id = c2.max_id
     WHERE c1.status_lanjutan NOT IN ('Produk diterima Customer', 'Selesai Packing, Siap diAmbil')
     GROUP BY c1.status_lanjutan`
  );

  console.log("Latest statuses of active FOs:");
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
