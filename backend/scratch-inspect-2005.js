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
    'SELECT * FROM tb_control WHERE no_job = "ATI.MPH-00002005"'
  );
  console.log("tb_control rows for ATI.MPH-00002005:");
  console.log(JSON.stringify(rows, null, 2));

  if (rows.length > 0) {
    const noFo = rows[0].no_fo;
    console.log(`Associated no_fo is: ${noFo}`);
    const [allFoRows] = await connection.query(
      'SELECT id, no_job, no_fo, username, status_lanjutan, datetime_lanjutan FROM tb_control WHERE TRIM(no_fo) = ? ORDER BY id ASC',
      [noFo.trim()]
    );
    console.log(`All tb_control steps for FO ${noFo}:`);
    console.log(JSON.stringify(allFoRows, null, 2));

    const [kdfoRows] = await connection.query(
      'SELECT * FROM tb_kdfo WHERE TRIM(no_fo) = ?',
      [noFo.trim()]
    );
    console.log(`tb_kdfo record for ${noFo}:`);
    console.log(JSON.stringify(kdfoRows, null, 2));
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
});
