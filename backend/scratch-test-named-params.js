import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createPool({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati',
    namedPlaceholders: true
  });

  const username = "yohand";
  const search = "";
  const searchPattern = "%%";
  const filterType = "all";
  
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
        AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(:username))
      )
    ),
    (
      SELECT MAX(tc_user.datetime_lanjutan)
      FROM tb_control tc_user
      WHERE TRIM(tc_user.no_fo) = TRIM(unique_fo.no_fo)
      AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(:username))
    )
  )`;

  const dateClause = "1=1";

  const searchWhereClause = `(
    :search = ''
    OR unique_fo.no_fo LIKE :searchPattern
    OR unique_fo.customer LIKE :searchPattern
  )
  AND EXISTS (
    SELECT 1 FROM tb_control tc_user
    WHERE TRIM(tc_user.no_fo) = TRIM(unique_fo.no_fo)
    AND LOWER(TRIM(tc_user.username)) = LOWER(TRIM(:username))
  )
  AND NOT (
    LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username))
    AND unique_fo.status_lanjutan LIKE 'Start%'
  )
  AND (${completedDateExpr}) IS NOT NULL
  AND (${dateClause})`;

  const params = {
    username,
    search,
    searchPattern
  };

  try {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total FROM (${uniqueFoSql}) AS unique_fo WHERE ${searchWhereClause}`,
      params
    );
    console.log("Count result using named parameters:", rows);
  } catch (err) {
    console.error("Named query error:", err);
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
