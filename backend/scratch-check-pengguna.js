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

  const [columns] = await connection.execute("DESCRIBE tb_pengguna");
  console.log("Columns of tb_pengguna:");
  console.log(columns);

  const [rows] = await connection.execute(
    `SELECT * FROM tb_pengguna WHERE LOWER(TRIM(pengguna)) = 'yohand'`
  );
  console.log("User YOHAND details:");
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
