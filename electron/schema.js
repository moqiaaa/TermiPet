const { query } = require('./db')

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_config (
      config_key VARCHAR(100) PRIMARY KEY,
      config_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS shortcut_mode (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      icon VARCHAR(10),
      color VARCHAR(20),
      sort_order INT DEFAULT 0,
      enabled TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS shortcut_item (
      id VARCHAR(100) PRIMARY KEY,
      mode_id VARCHAR(50) NOT NULL,
      label VARCHAR(50) NOT NULL,
      icon VARCHAR(10),
      action_type VARCHAR(50) NOT NULL,
      action_payload TEXT,
      sort_order INT DEFAULT 0,
      enabled TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS todo (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      done TINYINT(1) DEFAULT 0,
      project_id VARCHAR(100),
      due_date VARCHAR(20),
      reminder_at VARCHAR(30),
      note TEXT,
      notified TINYINT(1) DEFAULT 0,
      priority VARCHAR(10),
      status VARCHAR(20) DEFAULT 'backlog',
      repeat_rule VARCHAR(20),
      estimated_minutes INT,
      subtasks JSON,
      completed_at BIGINT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS project (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20),
      parent_id VARCHAR(100),
      created_at BIGINT NOT NULL
    )
  `)

  // Migration: add parent_id if missing (existing installs)
  try {
    await query(`ALTER TABLE project ADD COLUMN parent_id VARCHAR(100)`)
  } catch {
    // column already exists
  }

  await query(`
    CREATE TABLE IF NOT EXISTS command (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      command TEXT NOT NULL,
      description TEXT,
      pinned TINYINT(1) DEFAULT 0,
      is_custom TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS scene (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      summary_prompt TEXT,
      todo_prompt TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS sticky_note (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(200),
      content TEXT,
      color VARCHAR(20) DEFAULT 'default',
      pinned TINYINT(1) DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `)

  // Migration: add blocks_json to sticky_note if missing
  try {
    await query(`ALTER TABLE sticky_note ADD COLUMN blocks_json TEXT`)
  } catch {
    // column already exists
  }

  await query(`
    CREATE TABLE IF NOT EXISTS recording (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scene_name VARCHAR(100),
      raw_text TEXT,
      summary TEXT,
      todo_summary TEXT,
      audio_path VARCHAR(500),
      duration INT DEFAULT 0,
      created_at BIGINT NOT NULL
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy (
      id BIGINT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      direction TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy_condition (
      id BIGINT PRIMARY KEY,
      strategy_id BIGINT NOT NULL,
      indicator_name VARCHAR(50) NOT NULL,
      operator VARCHAR(10) NOT NULL,
      threshold VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_strategy_binding (
      id BIGINT PRIMARY KEY,
      strategy_id BIGINT NOT NULL,
      stock_code VARCHAR(20) NOT NULL,
      stock_name VARCHAR(50) NOT NULL,
      enabled TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS stock_indicator_def (
      id BIGINT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      scope VARCHAR(10) NOT NULL DEFAULT 'stock',
      value_type VARCHAR(10) NOT NULL DEFAULT 'number',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // Migration: add type to stock_indicator_def
  try {
    await query(`ALTER TABLE stock_indicator_def ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'basic'`)
  } catch {
    // column already exists
  }

  await query(`
    CREATE TABLE IF NOT EXISTS stock_indicator_condition (
      id BIGINT PRIMARY KEY,
      indicator_def_id BIGINT NOT NULL,
      indicator_name VARCHAR(50) NOT NULL,
      operator VARCHAR(10) NOT NULL,
      threshold VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

module.exports = { ensureSchema }
