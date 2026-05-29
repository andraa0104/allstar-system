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
    `SELECT c1.no_fo, c1.status_lanjutan, k.deadline_date
     FROM tb_control c1
     INNER JOIN (
       SELECT MAX(id) AS max_id
       FROM tb_control
       GROUP BY no_fo
     ) c2 ON c1.id = c2.max_id
     INNER JOIN tb_kdfo k ON TRIM(c1.no_fo) = TRIM(k.no_fo)
     WHERE LOWER(TRIM(c1.username)) = 'yohand'
     AND c1.status_lanjutan = 'Kain Ready Jahit'`
  );

  console.log("FOs where yohand's latest step is Kain Ready Jahit and no one else has started the next step:");
  console.log(rows.length);
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
