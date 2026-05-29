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

  const [columns] = await connection.execute("DESCRIBE tb_kdfodetail");
  console.log("Columns of tb_kdfodetail:");
  console.log(columns);

  const [sample] = await connection.execute("SELECT * FROM tb_kdfodetail LIMIT 3");
  console.log("Sample rows from tb_kdfodetail:");
  console.log(sample);

  await connection.end();
}

main().catch(console.error);
