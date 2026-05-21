const { query } = require('./db')

async function getConfig(key) {
  const rows = await query(
    'SELECT config_value FROM app_config WHERE config_key = ?',
    [key]
  )
  if (rows.length === 0) return null
  try {
    return JSON.parse(rows[0].config_value)
  } catch {
    return rows[0].config_value
  }
}

async function setConfig(key, value) {
  const jsonValue = JSON.stringify(value)
  await query(
    `INSERT INTO app_config (config_key, config_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, jsonValue]
  )
}

async function getAllConfigs() {
  const rows = await query('SELECT config_key, config_value FROM app_config')
  const result = {}
  for (const row of rows) {
    try {
      result[row.config_key] = JSON.parse(row.config_value)
    } catch {
      result[row.config_key] = row.config_value
    }
  }
  return result
}

module.exports = { getConfig, setConfig, getAllConfigs }
