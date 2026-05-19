const mysql = require('mysql2/promise')

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: 'localhost',
      port: 3306,
      user: 'moqi',
      password: '656017382',
      database: 'knowledge_base',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 5
    })
  }
  return pool
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = { query, closePool }
