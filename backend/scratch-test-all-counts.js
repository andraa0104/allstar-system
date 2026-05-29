import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
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
  const completedStatus = "Produk diterima Customer";
  const packingReadyStatus = "Selesai Packing, Siap diAmbil";

  // 1. Outstanding count query
  const outstandingUniqueFoSql = `
    SELECT
      TRIM(k.no_fo) AS no_fo,
      k.order_date AS doc_date,
      k.customer AS customer,
      c.status_lanjutan AS status_lanjutan,
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

  let outstandingWhere = `(
    :search = ''
    OR unique_fo.no_fo LIKE :searchPattern
    OR unique_fo.customer LIKE :searchPattern
  )
  AND unique_fo.status_lanjutan IS NOT NULL
  AND TRIM(unique_fo.status_lanjutan) <> ''
  AND TRIM(unique_fo.status_lanjutan) <> '-'
  AND unique_fo.status_lanjutan <> :completedStatus
  AND unique_fo.status_lanjutan <> :packingReadyStatus`;

  if (username) {
    outstandingWhere += ` AND LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username)) AND unique_fo.status_lanjutan LIKE 'Start%'`;
  }

  const outstandingParams = {
    completedStatus,
    packingReadyStatus,
    search,
    searchPattern,
    username
  };

  const [outRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM (${outstandingUniqueFoSql}) AS unique_fo WHERE ${outstandingWhere}`,
    outstandingParams
  );
  console.log("Outstanding FO Job total count:", outRows[0].total);

  // 2. Deadline count query
  let deadlineWhere = `(
    :search = ''
    OR unique_fo.no_fo LIKE :searchPattern
    OR unique_fo.customer LIKE :searchPattern
  )
  AND unique_fo.status_lanjutan IS NOT NULL
  AND TRIM(unique_fo.status_lanjutan) <> ''
  AND TRIM(unique_fo.status_lanjutan) <> '-'
  AND unique_fo.status_lanjutan <> :completedStatus
  AND unique_fo.status_lanjutan <> :packingReadyStatus
  AND (
    unique_fo.deadline_date IS NOT NULL
    AND unique_fo.deadline_date >= CURDATE()
    AND DATEDIFF(unique_fo.deadline_date, CURDATE()) <= 4
  )`;

  if (username) {
    deadlineWhere += ` AND LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username)) AND unique_fo.status_lanjutan LIKE 'Start%'`;
  }

  const [dlRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM (${outstandingUniqueFoSql}) AS unique_fo WHERE ${deadlineWhere}`,
    outstandingParams
  );
  console.log("Deadline total count:", dlRows[0].total);

  // 3. Overdue count query
  let overdueWhere = `(
    :search = ''
    OR unique_fo.no_fo LIKE :searchPattern
    OR unique_fo.customer LIKE :searchPattern
  )
  AND (
    unique_fo.deadline_date IS NOT NULL
    AND unique_fo.deadline_date < CURDATE()
  )
  AND unique_fo.status_lanjutan IS NOT NULL
  AND TRIM(unique_fo.status_lanjutan) <> ''
  AND TRIM(unique_fo.status_lanjutan) <> '-'
  AND unique_fo.status_lanjutan <> :completedStatus
  AND unique_fo.status_lanjutan <> :packingReadyStatus`;

  if (username) {
    overdueWhere += ` AND LOWER(TRIM(unique_fo.username)) = LOWER(TRIM(:username)) AND unique_fo.status_lanjutan LIKE 'Start%'`;
  }

  const [odRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM (${outstandingUniqueFoSql}) AS unique_fo WHERE ${overdueWhere}`,
    outstandingParams
  );
  console.log("Overdue total count:", odRows[0].total);

  // 4. Completed query
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

  let searchWhereClause = `(
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

  const [completeRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM (${outstandingUniqueFoSql}) AS unique_fo WHERE ${searchWhereClause}`,
    outstandingParams
  );
  console.log("Job Complete total count (without date constraints):", completeRows[0].total);

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
