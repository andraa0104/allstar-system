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

  const [columns] = await connection.execute("DESCRIBE tb_control");
  console.log("Columns of tb_control:");
  console.log(columns);

  const [sample] = await connection.execute("SELECT * FROM tb_control ORDER BY id DESC LIMIT 2");
  console.log("Sample rows:");
  console.log(sample);

  await connection.end();
}

main().catch(console.error);
