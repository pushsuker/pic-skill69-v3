// เชื่อมต่อ MySQL ค่าทั้งหมดมาจาก environment ใน docker-compose.yml
const mysql = require('mysql2/promise');
const settings = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bpes',
  dateStrings: true,
};
const pool = mysql.createPool(settings);
async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}
module.exports = { query, pool, settings };
