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

async function saveScenes(scenes, defaultSceneId) {
  // Replace all: delete existing, insert new
  await query('DELETE FROM scene')

  if (scenes && scenes.length > 0) {
    for (const s of scenes) {
      await query(
        `INSERT INTO scene (id, name, summary_prompt, todo_prompt)
         VALUES (?, ?, ?, ?)`,
        [
          s.id,
          s.name,
          s.summaryPrompt || null,
          s.todoPrompt || null,
        ]
      )
    }
  }

  if (defaultSceneId !== undefined) {
    await setConfig('defaultSceneId', defaultSceneId)
  }
}

module.exports = { getScenes, saveScenes }
