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
    `SELECT k.no_fo, k.order_date, k.customer, c.status_lanjutan, k.deadline_date
     FROM tb_kdfo k
     LEFT JOIN (
       SELECT c1.*
       FROM tb_control c1
       INNER JOIN (
         SELECT MAX(id) AS max_id
         FROM tb_control
         GROUP BY no_fo
       ) c2 ON c1.id = c2.max_id
     ) c ON TRIM(k.no_fo) = TRIM(c.no_fo)
     WHERE k.uang_muka > 0 AND k.FinalQC_Packiing IS NULL
     AND EXISTS (
       SELECT 1 FROM tb_control tc_user
       WHERE TRIM(tc_user.no_fo) = TRIM(k.no_fo)
       AND LOWER(TRIM(tc_user.username)) = 'yohand'
     )`
  );

  console.log("FOs in category 1 (FO DP - Antrian) for yohand:");
  console.log(rows.length);
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
