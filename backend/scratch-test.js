import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: '202.155.95.118',
    port: 3306,
    user: 'root',
    password: 'terserah',
    database: 'dbati'
  });
  
  const [rows] = await connection.query('SELECT DISTINCT no_fo FROM tb_kdfodetail LIMIT 10');
  console.log("Sample NO_FOs in tb_kdfodetail:");
  console.log(rows);
  
  const [rows2] = await connection.query('SELECT * FROM tb_kdfodetail LIMIT 3');
  console.log("Sample items in tb_kdfodetail:");
  console.log(rows2);
  
  await connection.end();
}

main().catch(err => {
  console.error(err);
});
