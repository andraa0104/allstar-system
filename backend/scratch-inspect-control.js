import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati'
  });
  
  const [rows] = await connection.query('DESCRIBE tb_control');
  console.log("Columns in tb_control:");
  console.log(rows.map(r => ({ Field: r.Field, Type: r.Type })));
  
  const [rows2] = await connection.query('SELECT no_job, datetime_awal, status_awal, datetime_lanjutan, username, jobdesk, ket FROM tb_control WHERE no_fo IS NOT NULL AND no_job IS NOT NULL LIMIT 2');
  console.log("Sample rows in tb_control:");
  console.log(rows2);

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
