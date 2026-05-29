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
    `SELECT id, no_job, no_fo, status_lanjutan, username, datetime_awal, datetime_lanjutan
     FROM tb_control
     WHERE TRIM(no_fo) = 'ATI/FO/00002667'
     ORDER BY id ASC`
  );

  console.log(rows);

  await connection.end();
}

main().catch(console.error);
