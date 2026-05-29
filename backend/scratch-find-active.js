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
  
  // Find all FOs where the latest step is by yohand and starts with 'Start'
  const query = `
    SELECT
      TRIM(k.no_fo) AS no_fo,
      c.status_lanjutan AS status_lanjutan,
      c.username AS username,
      c.id AS latest_id
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
    WHERE LOWER(TRIM(c.username)) = LOWER(TRIM(?))
  `;

  const [rows] = await connection.query(query, [username]);
  console.log(`FOs where latest step in tb_control is by ${username}:`);
  console.log(rows);

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
