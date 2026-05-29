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

  const [rows] = await connection.execute("SELECT DISTINCT tingkat FROM tb_pengguna");
  console.log("Distinct roles (tingkat) in tb_pengguna:");
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
