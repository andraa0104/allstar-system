import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati'
  });
  
  const [rows] = await connection.query('DESCRIBE tb_kdfodetail');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

main().catch(err => {
  console.error(err);
});
