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

  const username = "yohand";
  const search = "";
  const searchPattern = "%%";

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

  // 1. OLD Query Performance
  console.time("Old Query Time");
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

  let oldWhere = `(
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
  AND (${completedDateExpr}) IS NOT NULL`;

  const [oldRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM (${uniqueFoSql}) AS unique_fo WHERE ${oldWhere}`,
    { search, searchPattern, username }
  );
  console.timeEnd("Old Query Time");
  console.log("Old Query Count:", oldRows[0].total);

  // 2. NEW Query Performance
  console.time("New Query Time");
  const newSql = `
    SELECT COUNT(*) AS total
    FROM (${uniqueFoSql}) AS unique_fo
    INNER JOIN (
      SELECT 
        um.no_fo,
        COALESCE(MIN(tc_next.datetime_awal), um.max_user_datetime) AS completed_date
      FROM (
        SELECT 
          TRIM(no_fo) AS no_fo,
          MAX(id) AS max_user_id,
          MAX(datetime_lanjutan) AS max_user_datetime
        FROM tb_control
        WHERE LOWER(TRIM(username)) = LOWER(TRIM(:username))
        GROUP BY TRIM(no_fo)
      ) um
      LEFT JOIN tb_control tc_next ON TRIM(tc_next.no_fo) = um.no_fo AND tc_next.id > um.max_user_id
      GROUP BY um.no_fo, um.max_user_datetime
    ) ucj ON TRIM(unique_fo.no_fo) = ucj.no_fo
    WHERE (
      :search = ''
      OR unique_fo.no_fo LIKE :searchPattern
      OR unique_fo.customer LIKE :searchPattern
    )
    AND NOT (
      LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username))
      AND unique_fo.status_lanjutan LIKE 'Start%'
    )
    AND ucj.completed_date IS NOT NULL
  `;

  const [newRows] = await connection.execute(newSql, { search, searchPattern, username });
  console.timeEnd("New Query Time");
  console.log("New Query Count:", newRows[0].total);

  await connection.end();
}

main().catch(console.error);
