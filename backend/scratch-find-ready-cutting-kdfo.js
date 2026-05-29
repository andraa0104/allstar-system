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
    `SELECT no_fo, order_date, customer, Start_Cut, Press_ReadyCut, deadline_date
     FROM tb_kdfo
     WHERE Start_Cut IS NULL AND Press_ReadyCut IS NOT NULL`
  );

  console.log("FOs ready for cutting (Start_Cut IS NULL AND Press_ReadyCut IS NOT NULL):");
  console.log(rows.length);
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
