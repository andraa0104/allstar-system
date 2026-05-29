import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati'
  });

  const username = "yohand";
  const search = "";
  const searchPattern = "%%";
  const filterType = "all"; // let's test all
  
  const uniqueFoSql = `
    SELECT
      TRIM(k.no_fo) AS no_fo,
      k.order_date AS doc_date,
      k.customer AS customer,
      c.status_lanjutan AS status_lanjutan,
      k.QC_ReadyGudang AS QC_ReadyGudang,
      k.Final_Cust AS Final_Cust,
      c.username AS username
    FROM tb_kdfo k
    LEFT JOIN (
      SELECT c1.*
      FROM tb_control c1
      INNER JOIN (
        SELECT MAX(id) AS max_id
        FROM tb_control
        WHERE no_fo IS NOT NULL AND TRIM(no_fo) <> ''
        GROUP BY TRIM(no_fo)
      ) c2 ON c1.id = c2.max_id
    ) c ON TRIM(k.no_fo) = TRIM(c.no_fo)
    WHERE k.no_fo IS NOT NULL AND TRIM(k.no_fo) <> ''
  `;

  const completedDateExpr = `COALESCE(
    (
      SELECT MIN(tc_next.datetime_awal)
      FROM tb_control tc_next
      WHERE TRIM(tc_next.no_fo) = TRIM(unique_fo.no_fo)
      AND tc_next.id > (
        SELECT MAX(tc_user.id)
        FROM tb_control tc_user
        WHERE TRIM(tc_user.no_fo) = TRIM(unique_fo.no_fo)
        AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(?))
      )
    ),
    (
      SELECT MAX(tc_user.datetime_lanjutan)
      FROM tb_control tc_user
      WHERE TRIM(tc_user.no_fo) = TRIM(unique_fo.no_fo)
      AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(?))
    )
  )`;

  const dateClause = "1=1"; // all data

  const searchWhereClause = `(
    ? = ''
    OR unique_fo.no_fo LIKE ?
    OR unique_fo.customer LIKE ?
  )
  AND EXISTS (
    SELECT 1 FROM tb_control tc_user
    WHERE TRIM(tc_user.no_fo) = TRIM(unique_fo.no_fo)
    AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(?))
  )
  AND NOT (
    LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(?))
    AND unique_fo.status_lanjutan LIKE 'Start%'
  )
  AND (${completedDateExpr}) IS NOT NULL
  AND (${dateClause})`;

  const params = [
    username, username, // for completedDateExpr
    search, searchPattern, searchPattern, // for search clauses
    username, // for EXISTS
    username, // for NOT
    username, username // for completedDateExpr inside searchWhereClause
  ];

  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS total FROM (${uniqueFoSql}) AS unique_fo WHERE ${searchWhereClause}`,
      params
    );
    console.log("Count result for all:", rows);

    const [items] = await connection.query(
      `SELECT no_fo, doc_date, customer, status_lanjutan, status_lanjutan AS status,
              QC_ReadyGudang, Final_Cust, (${completedDateExpr}) AS completed_date
       FROM (${uniqueFoSql}) AS unique_fo
       WHERE ${searchWhereClause}
       LIMIT 5`,
      params
    );
    console.log("Items result for all:", items);
  } catch (err) {
    console.error("Query error:", err);
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
