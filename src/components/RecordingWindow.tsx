import { useState, useEffect, useRef, useCallback } from 'react'
import type { Scene, TranscriptEntry, RecordingHistoryItem } from '../types/pet'

type Phase = 'history' | 'idle' | 'recording' | 'transcribing' | 'summarizing' | 'done'

export function RecordingWindow() {
  const [phase, setPhase] = useState<Phase>('history')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [todoSummary, setTodoSummary] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'todo'>('summary')
  const [error, setError] = useState('')
  const [audioDuration, setAudioDuration] = useState(0)
  const [waveBars, setWaveBars] = useState<number[]>(Array(24).fill(4))
  const [sceneName, setSceneName] = useState('')

  // History
  const [historyList, setHistoryList] = useState<RecordingHistoryItem[]>([])

  // Audio playback
  const [playingAudioPath, setPlayingAudioPath] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentAudioPath, setCurrentAudioPath] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingTimeRef = useRef(0)
  const scenesRef = useRef<Scene[]>([])
  const selectedSceneIdRef = useRef('')

  scenesRef.current = scenes
  selectedSceneIdRef.current = selectedSceneId

  const loadHistory = useCallback(async () => {
    const items = await window.electronAPI?.getRecordings?.(50, 0)
    if (items) setHistoryList(items)
  }, [])

  useEffect(() => {
    const init = async () => {
      const results = await window.electronAPI?.getRecordingResults?.()
      if (results) {
        applyResults(results.rawText, results.summary, results.todoSummary, results.sceneName, results.audioPath, results.duration)
        setPhase('done')
        return
      }

      await loadHistory()

      const data = await window.electronAPI?.getScenes?.()
      if (data) {
        setScenes(data.scenes)
        setSelectedSceneId(data.defaultSceneId)
      }
    }
    init()
  }, [loadHistory])

  function applyResults(rawText: string, sum: string, todo: string, sName: string, audioPath?: string, dur?: number) {
    const entries: TranscriptEntry[] = rawText
      .split(/[。！？\n]/)
      .filter((s) => s.trim())
      .map((text, i) => ({
        speaker: (i % 2) + 1,
        startTime: i * 5,
        text: text.trim(),
      }))
    setTranscript(entries)
    setKeywords(extractKeywords(rawText))
    setSummary(sum || '')
    setTodoSummary(todo || '')
    setSceneName(sName || '')
    if (audioPath) setCurrentAudioPath(audioPath)
    if (dur) setAudioDuration(dur)
  }

  const viewHistoryItem = useCallback(async (item: RecordingHistoryItem) => {
    applyResults(item.rawText, item.summary, item.todoSummary, item.sceneName, item.audioPath, item.duration)
    setPhase('done')
  }, [])

  const playAudio = useCallback(async (audioPath: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const base64 = await window.electronAPI?.getRecordingAudio?.(audioPath)
    if (!base64) return

    const audio = new Audio(`data:audio/webm;base64,${base64}`)
    audioRef.current = audio
    setPlayingAudioPath(audioPath)
    setAudioPlaying(true)
    setAudioProgress(0)

    audio.ontimeupdate = () => {
      if (audio.duration) setAudioProgress(audio.currentTime / audio.duration)
    }
    audio.onended = () => {
      setAudioPlaying(false)
      setPlayingAudioPath(null)
      setAudioProgress(0)
    }
    audio.play()
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setAudioPlaying(false)
    setPlayingAudioPath(null)
    setAudioProgress(0)
  }, [])

  const deleteHistoryItem = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await window.electronAPI?.deleteRecording?.(id)
    await loadHistory()
  }, [loadHistory])

  const selectedScene = scenes.find((s) => s.id === selectedSceneId)

  const processRecording = useCallback(async (base64: string) => {
    setPhase('transcribing')
    setError('')

    const transResult = await window.electronAPI?.transcribeAudio(base64)
    if (!transResult || transResult.error) {
      setError(transResult?.error || '转写失败')
      setPhase('idle')
      return
    }

    const rawText = transResult.text || ''
    const entries: TranscriptEntry[] = rawText
      .split(/[。！？\n]/)
      .filter((s) => s.trim())
      .map((text, i) => ({
        speaker: (i % 2) + 1,
        startTime: i * 5,
        text: text.trim(),
      }))
    setTranscript(entries)
    setKeywords(extractKeywords(rawText))

    const scene = scenesRef.current.find((s) => s.id === selectedSceneIdRef.current)
    if (scene) {
      setPhase('summarizing')
      setSceneName(scene.name)

      const [summaryResult, todoResult] = await Promise.all([
        window.electronAPI?.summarizeTranscript(rawText, scene.summaryPrompt),
        window.electronAPI?.summarizeTranscript(rawText, scene.todoPrompt),
      ])
      if (summaryResult?.text) setSummary(summaryResult.text)
      if (todoResult?.text) setTodoSummary(todoResult.text)
    }

    setPhase('done')
  }, [])

  const startRecording = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          processRecording(base64)
        }
        reader.readAsDataURL(blob)
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setPhase('recording')
      setRecordingTime(0)
      recordingTimeRef.current = 0

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1
        setRecordingTime(recordingTimeRef.current)
      }, 1000)

      waveRef.current = setInterval(() => {
        setWaveBars(Array(24).fill(0).map(() => 4 + Math.random() * 28))
      }, 150)
    } catch (err) {
      setError(`无法访问麦克风: ${(err as Error).message}`)
    }
  }, [processRecording])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveRef.current) clearInterval(waveRef.current)
    setAudioDuration(recordingTimeRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const goToHistory = useCallback(async () => {
    setPhase('history')
    setTranscript([])
    setKeywords([])
    setSummary('')
    setTodoSummary('')
    setSceneName('')
    setAudioDuration(0)
    setCurrentAudioPath('')
    setError('')
    setRecordingTime(0)
    recordingTimeRef.current = 0
    stopAudio()
    await loadHistory()
  }, [loadHistory, stopAudio])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // --- History view ---
  if (phase === 'history') {
    return (
      <div className="rec-window">
        <div className="rec-header">
          <span className="rec-header-title">录音纪要</span>
          <span className="rec-header-sep">/</span>
          <span className="rec-header-scene">历史记录</span>
          <div className="rec-header-spacer" />
          <button className="rec-header-btn" onClick={() => setPhase('idle')}>新录音</button>
        </div>

        <div className="rec-history-list">
          {historyList.length === 0 && (
            <div className="rec-history-empty">暂无录音记录</div>
          )}
          {historyList.map((item) => (
            <div
              key={item.id}
              className="rec-history-item"
              onClick={() => viewHistoryItem(item)}
            >
              <div className={`rec-history-icon ${item.sceneName === '待办提取' ? 'todo' : ''}`}>
                {item.sceneName === '待办提取' ? '✅' : '🎙'}
              </div>
              <div className="rec-history-info">
                <div className="rec-history-title">{item.sceneName || '未知场景'}</div>
                <div className="rec-history-meta">
                  {formatDate(item.createdAt)}
                  {' · '}
                  {formatTime(item.duration)}
                  {item.rawText && ` · ${item.rawText.slice(0, 40)}...`}
                </div>
              </div>
              <button
                className="rec-history-play"
                onClick={(e) => {
                  e.stopPropagation()
                  if (playingAudioPath === item.audioPath && audioPlaying) {
                    stopAudio()
                  } else {
                    playAudio(item.audioPath)
                  }
                }}
              >
                {playingAudioPath === item.audioPath && audioPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="rec-history-delete"
                onClick={(e) => deleteHistoryItem(item.id, e)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- Idle / Recording view ---
  if (phase === 'idle' || phase === 'recording') {
    return (
      <div className="rec-window">
        <div className="rec-header">
          <span className="rec-header-title">录音纪要</span>
          <div className="rec-header-spacer" />
          <button className="rec-header-btn" onClick={goToHistory}>历史记录</button>
        </div>

        <div className="rec-center">
          <div className="rec-scene-selector" onClick={() => {
            const idx = scenes.findIndex((s) => s.id === selectedSceneId)
            const next = scenes[(idx + 1) % scenes.length]
            if (next) setSelectedSceneId(next.id)
          }}>
            <span className="rec-scene-icon">🎙</span>
            <span className="rec-scene-name">{selectedScene?.name || '选择场景'}</span>
            <span className="rec-scene-divider" />
            <span className="rec-scene-switch">切换 ▾</span>
          </div>

          {phase === 'idle' ? (
            <>
              <button className="rec-start-btn" onClick={startRecording}>
                <div className="rec-start-btn-inner" />
              </button>
              <span className="rec-hint">点击开始录音</span>
            </>
          ) : (
            <>
              <div className="rec-pulse-wrap">
                <div className="rec-pulse-ring ring-3" />
                <div className="rec-pulse-ring ring-2" />
                <button className="rec-stop-btn" onClick={stopRecording}>
                  <div className="rec-stop-icon" />
                </button>
              </div>
              <div className="rec-status-row">
                <span className="rec-status-dot" />
                <span className="rec-status-text">录音中</span>
              </div>
              <div className="rec-timer">{formatTime(recordingTime)}</div>
              <div className="rec-wave">
                {waveBars.map((h, i) => (
                  <div key={i} className="rec-wave-bar" style={{ height: h }} />
                ))}
              </div>
              <span className="rec-hint">点击方块停止录音</span>
            </>
          )}

          {error && <div className="rec-error">{error}</div>}
        </div>
      </div>
    )
  }

  // --- Transcribing / Summarizing ---
  if (phase === 'transcribing' || phase === 'summarizing') {
    return (
      <div className="rec-window">
        <div className="rec-header">
          <span className="rec-header-title">录音纪要</span>
          <div className="rec-header-spacer" />
        </div>
        <div className="rec-center">
          <div className="rec-loading-spinner" />
          <span className="rec-loading-text">
            {phase === 'transcribing' ? '正在转写录音…' : '正在生成摘要…'}
          </span>
        </div>
      </div>
    )
  }

  // --- Done / Results view ---
  return (
    <div className="rec-window">
      <div className="rec-header">
        <span className="rec-header-title">录音纪要</span>
        <span className="rec-header-sep">/</span>
        <span className="rec-header-scene">{sceneName || selectedScene?.name}</span>
        <div className="rec-header-spacer" />
        <button className="rec-header-btn" onClick={goToHistory}>历史记录</button>
      </div>

      <div className="rec-result-body">
        <div className="rec-left">
          <div className="rec-section-title">原文</div>

          {keywords.length > 0 && (
            <div className="rec-keywords">
              {keywords.map((kw, i) => (
                <span key={i} className="rec-keyword-tag">{kw}</span>
              ))}
            </div>
          )}

          <div className="rec-transcript-list">
            {transcript.map((entry, i) => (
              <div key={i} className="rec-transcript-entry">
                <span className={`rec-speaker-badge speaker-${entry.speaker}`}>
                  {entry.speaker}
                </span>
                <div className="rec-entry-body">
                  <div className="rec-entry-head">
                    <span className={`rec-entry-speaker speaker-${entry.speaker}`}>
                      讲话人 {entry.speaker}
                    </span>
                    <span className="rec-entry-time">{formatTime(entry.startTime)}</span>
                  </div>
                  <div className="rec-entry-text">{entry.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rec-right">
          <div className="rec-tab-bar">
            <button
              className={`rec-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >总结概要</button>
            <button
              className={`rec-tab ${activeTab === 'todo' ? 'active' : ''}`}
              onClick={() => setActiveTab('todo')}
            >待办提取</button>
          </div>

          <div className="rec-summary-content">
            {activeTab === 'summary' ? (
              <div className="rec-summary-text">{summary || '暂无总结'}</div>
            ) : (
              <div className="rec-summary-text">{todoSummary || '暂无待办'}</div>
            )}
          </div>
        </div>
      </div>

      <div className="rec-playback-bar">
        <button
          className="rec-playback-toggle"
          onClick={() => {
            if (audioPlaying) {
              stopAudio()
            } else if (currentAudioPath) {
              playAudio(currentAudioPath)
            }
          }}
        >
          {audioPlaying ? '⏸' : '▶'}
        </button>
        <span className="rec-playback-time">
          {audioRef.current ? formatTime(Math.floor(audioRef.current.currentTime || 0)) : '00:00'}
          {' / '}
          {formatTime(audioDuration)}
        </span>
        <div className="rec-playback-progress">
          <div className="rec-playback-fill" style={{ width: `${audioProgress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function extractKeywords(text: string): string[] {
  const freq: Record<string, number> = {}
  const words = text.replace(/[，。！？、；：""''（）\s]+/g, ' ').split(' ')
  for (const w of words) {
    if (w.length >= 2 && w.length <= 6) {
      freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
}
