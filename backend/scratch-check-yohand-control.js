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
    `SELECT id, no_fo, status_lanjutan, username, datetime_awal, datetime_lanjutan
     FROM tb_control
     WHERE LOWER(TRIM(username)) = 'yohand'
     ORDER BY id DESC`
  );

  console.log("Total records found for yohand:", rows.length);
  console.log("Latest 5 records:", rows.slice(0, 5));

  // Find all FOs where yohand has a record
  const fos = [...new Set(rows.map(r => r.no_fo))];
  console.log("FOs yohand worked on:", fos.length);

  await connection.end();
}

main().catch(console.error);
