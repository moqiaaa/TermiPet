const { query } = require('./db')
const { getConfig, setConfig } = require('./config-db')

// -- snake_case DB row -> camelCase frontend object --

function modeRowToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    order: row.sort_order,
    enabled: !!row.enabled,
  }
}

function itemRowToFrontend(row) {
  let actionPayload = null
  if (row.action_payload) {
    try {
      actionPayload = JSON.parse(row.action_payload)
    } catch {
      actionPayload = row.action_payload
    }
  }
  return {
    id: row.id,
    modeId: row.mode_id,
    label: row.label,
    icon: row.icon,
    actionType: row.action_type,
    actionPayload: actionPayload,
    order: row.sort_order,
    enabled: !!row.enabled,
  }
}

// -- CRUD --

async function getModes() {
  const rows = await query('SELECT * FROM shortcut_mode ORDER BY sort_order')
  return rows.map(modeRowToFrontend)
}

async function saveMode(mode) {
  await query(
    `INSERT INTO shortcut_mode (id, name, icon, color, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       icon = VALUES(icon),
       color = VALUES(color),
       sort_order = VALUES(sort_order),
       enabled = VALUES(enabled)`,
    [
      mode.id,
      mode.name,
      mode.icon || null,
      mode.color || null,
      mode.order ?? mode.sort_order ?? 0,
      mode.enabled !== undefined ? (mode.enabled ? 1 : 0) : 1,
    ]
  )
}

async function deleteMode(id) {
  await query('DELETE FROM shortcut_mode WHERE id = ?', [id])
}

async function getItems(modeId) {
  if (modeId) {
    const rows = await query(
      'SELECT * FROM shortcut_item WHERE mode_id = ? ORDER BY sort_order',
      [modeId]
    )
    return rows.map(itemRowToFrontend)
  }
  const rows = await query('SELECT * FROM shortcut_item ORDER BY sort_order')
  return rows.map(itemRowToFrontend)
}

async function saveItem(item) {
  const payloadStr = item.actionPayload
    ? JSON.stringify(item.actionPayload)
    : null
  await query(
    `INSERT INTO shortcut_item (id, mode_id, label, icon, action_type, action_payload, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       mode_id = VALUES(mode_id),
       label = VALUES(label),
       icon = VALUES(icon),
       action_type = VALUES(action_type),
       action_payload = VALUES(action_payload),
       sort_order = VALUES(sort_order),
       enabled = VALUES(enabled)`,
    [
      item.id,
      item.modeId || item.mode_id,
      item.label,
      item.icon || null,
      item.actionType || item.action_type,
      payloadStr,
      item.order ?? item.sort_order ?? 0,
      item.enabled !== undefined ? (item.enabled ? 1 : 0) : 1,
    ]
  )
}

async function deleteItem(id) {
  await query('DELETE FROM shortcut_item WHERE id = ?', [id])
}

// -- Full config read/write for frontend compatibility --

async function getModeShortcutConfig() {
  const activeModeId = (await getConfig('activeModeId')) || 'assistant'
  const modes = await getModes()
  const shortcuts = await getItems()
  return { activeModeId, modes, shortcuts }
}

async function saveModeShortcutConfig(config) {
  if (config.modes && config.modes.length > 0) {
    const incomingModeIds = config.modes.map(m => m.id)
    for (const mode of config.modes) {
      await saveMode(mode)
    }
    const existing = await getModes()
    for (const m of existing) {
      if (!incomingModeIds.includes(m.id)) {
        await deleteMode(m.id)
      }
    }
  }

  if (config.shortcuts && config.shortcuts.length > 0) {
    const incomingItemIds = config.shortcuts.map(s => s.id)
    for (const item of config.shortcuts) {
      await saveItem(item)
    }
    const existing = await getItems()
    for (const s of existing) {
      if (!incomingItemIds.includes(s.id)) {
        await deleteItem(s.id)
      }
    }
  }

  if (config.activeModeId !== undefined) {
    await setConfig('activeModeId', config.activeModeId)
  }

  return getModeShortcutConfig()
}

module.exports = {
  getModes,
  saveMode,
  deleteMode,
  getItems,
  saveItem,
  deleteItem,
  getModeShortcutConfig,
  saveModeShortcutConfig,
}
