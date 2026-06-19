const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    const query = `
      SELECT 
        DATE_FORMAT(pos_date, '%Y-%m-%d') as date_label,
        COUNT(no_fo) as total
      FROM tb_kdfo
      WHERE pos_date IS NOT NULL
        AND pos_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(pos_date)
      ORDER BY MIN(pos_date) ASC
    `;
    const [rows] = await connection.execute(query);
    console.log('Success:', rows);
    connection.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
