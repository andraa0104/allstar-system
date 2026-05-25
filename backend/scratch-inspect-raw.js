import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati'
  });
  
  const [rows] = await connection.query(
    'SELECT id, no_job, CAST(datetime_awal AS CHAR) AS raw_awal, CAST(datetime_lanjutan AS CHAR) AS raw_lanjutan FROM tb_control WHERE TRIM(no_fo) = "ATI/FO/00002607" ORDER BY id ASC'
  );
  console.log("tb_control raw rows:");
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

main().catch(err => {
  console.error(err);
});
