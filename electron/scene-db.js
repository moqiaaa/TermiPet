const { query } = require('./db')
const { getConfig, setConfig } = require('./config-db')

// -- snake_case DB row -> camelCase frontend object --

function sceneRowToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    summaryPrompt: row.summary_prompt,
    todoPrompt: row.todo_prompt,
  }
}

async function getScenes() {
  const rows = await query('SELECT * FROM scene ORDER BY created_at')
  const scenes = rows.map(sceneRowToFrontend)
  const defaultSceneId = (await getConfig('defaultSceneId')) || ''
  return { scenes, defaultSceneId }
}

async function saveScene(scene) {
  await query(
    `INSERT INTO scene (id, name, summary_prompt, todo_prompt)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       summary_prompt = VALUES(summary_prompt),
       todo_prompt = VALUES(todo_prompt)`,
    [
      scene.id,
      scene.name,
      scene.summaryPrompt || null,
      scene.todoPrompt || null,
    ]
  )
}

async function deleteScene(id) {
  await query('DELETE FROM scene WHERE id = ?', [id])
}

async function setDefaultSceneId(sceneId) {
  await setConfig('defaultSceneId', sceneId)
}

module.exports = { getScenes, saveScene, deleteScene, setDefaultSceneId }
