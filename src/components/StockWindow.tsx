import { useState, useEffect, useCallback } from 'react'
import type { StockTrade, StockPosition, StockIndicator, StockStrategy, StockStrategyCondition, StockStrategyBinding, StockIndicatorDef } from '../types/pet'

type Tab = 'trades' | 'positions' | 'strategies' | 'indicators'

interface OcrResult {
  stock_name?: string
  stock_code?: string
  direction?: number
  price?: number
  quantity?: number
  trade_time?: string
}

export function StockWindow() {
  const [tab, setTab] = useState<Tab>('trades')
  const [trades, setTrades] = useState<StockTrade[]>([])
  const [positions, setPositions] = useState<StockPosition[]>([])
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [direction, setDirection] = useState<number | undefined>()

  // Trade form
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [tradeForm, setTradeForm] = useState({
    id: undefined as number | undefined,
    trade_date: new Date().toISOString().slice(0, 10),
    stock_code: '',
    stock_name: '',
    direction: 1,
    price: '',
    quantity: '',
    amount: '',
    reason: '',
    review: '',
    correct: null as number | null,
  })

  // OCR modal
  const [showOcrModal, setShowOcrModal] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [ocrImagePreview, setOcrImagePreview] = useState('')

  // Position detail
  const [selectedPosition, setSelectedPosition] = useState<StockPosition | null>(null)
  const [indicators, setIndicators] = useState<StockIndicator[]>([])

  // Notes editing
  const [positionNotes, setPositionNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notesModalStock, setNotesModalStock] = useState<{ code: string; name: string } | null>(null)
  const [modalNotes, setModalNotes] = useState('')
  const [modalNotesSaved, setModalNotesSaved] = useState(false)

  // Strategy state
  const [strategies, setStrategies] = useState<StockStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<StockStrategy | null>(null)
  const [showStrategyForm, setShowStrategyForm] = useState(false)
  const [strategyForm, setStrategyForm] = useState({ name: '', description: '', direction: 1 })
  const [conditionForm, setConditionForm] = useState({ indicator_name: '', operator: '>', threshold: '' })
  const [positionBindings, setPositionBindings] = useState<StockStrategyBinding[]>([])

  // Trade form strategy
  const [tradeStrategies, setTradeStrategies] = useState<StockStrategy[]>([])
  const [selectedTradeStrategy, setSelectedTradeStrategy] = useState<number | undefined>()

  // Indicator def state
  const [indicatorDefs, setIndicatorDefs] = useState<StockIndicatorDef[]>([])
  const [indicatorScope, setIndicatorScope] = useState<string>('')
  const [selectedIndicatorDef, setSelectedIndicatorDef] = useState<StockIndicatorDef | null>(null)
  const [showIndicatorDefForm, setShowIndicatorDefForm] = useState(false)
  const [indicatorDefForm, setIndicatorDefForm] = useState({ name: '', scope: 'stock' as string, value_type: 'number' as string, description: '' })

  const loadTrades = useCallback(async () => {
    const list = await window.electronAPI?.getTrades({
      keyword: keyword || undefined,
      dateRange: dateRange || undefined,
      direction,
      limit: 100,
      offset: 0,
    })
    setTrades(list || [])
  }, [keyword, dateRange, direction])

  const loadPositions = useCallback(async () => {
    const list = await window.electronAPI?.getPositions(keyword || undefined)
    setPositions(list || [])
  }, [keyword])

  const loadStrategies = useCallback(async () => {
    const list = await window.electronAPI?.getStrategies()
    setStrategies(list || [])
  }, [])

  const loadIndicatorDefs = useCallback(async () => {
    const list = await window.electronAPI?.getIndicatorDefs(indicatorScope || undefined)
    setIndicatorDefs(list || [])
  }, [indicatorScope])

  useEffect(() => {
    if (tab === 'trades') { loadTrades(); loadStrategies() }
    else if (tab === 'positions') { loadPositions(); loadStrategies() }
    else if (tab === 'strategies') { loadStrategies(); loadIndicatorDefs() }
    else if (tab === 'indicators') loadIndicatorDefs()
  }, [tab, loadTrades, loadPositions, loadStrategies, loadIndicatorDefs])

  useEffect(() => {
    if (tab === 'indicators') loadIndicatorDefs()
  }, [indicatorScope])

  useEffect(() => {
    if (showTradeForm) {
      window.electronAPI?.getStrategies().then((list: StockStrategy[]) => setTradeStrategies(list || []))
    }
  }, [showTradeForm])

  const handleSaveTrade = async () => {
    if (!tradeForm.stock_code || !tradeForm.stock_name || !tradeForm.price || !tradeForm.quantity) return
    await window.electronAPI?.saveTrade({
      id: tradeForm.id,
      trade_date: tradeForm.trade_date || null,
      stock_code: tradeForm.stock_code,
      stock_name: tradeForm.stock_name,
      direction: tradeForm.direction,
      price: Number(tradeForm.price),
      quantity: Number(tradeForm.quantity),
      amount: tradeForm.amount ? Number(tradeForm.amount) : null,
      reason: tradeForm.reason || null,
      review: tradeForm.review || null,
      correct: tradeForm.correct,
    })
    // Auto-bind strategy if selected
    if (selectedTradeStrategy && tradeForm.stock_code && tradeForm.stock_name) {
      await window.electronAPI?.saveBinding({
        strategy_id: selectedTradeStrategy,
        stock_code: tradeForm.stock_code,
        stock_name: tradeForm.stock_name,
      })
    }
    setSelectedTradeStrategy(undefined)
    setShowTradeForm(false)
    resetTradeForm()
    loadTrades()
    loadPositions()
  }

  const handleDeleteTrade = async (id: number) => {
    await window.electronAPI?.deleteTrade(id)
    loadTrades()
  }

  const handleEditTrade = (t: StockTrade) => {
    setTradeForm({
      id: t.id,
      trade_date: t.trade_date instanceof Date ? t.trade_date.toISOString().slice(0, 10) : (t.trade_date || ''),
      stock_code: t.stock_code,
      stock_name: t.stock_name,
      direction: t.direction,
      price: String(t.price),
      quantity: String(t.quantity),
      amount: t.amount ? String(t.amount) : '',
      reason: t.reason || '',
      review: t.review || '',
      correct: t.correct ?? null,
    })
    setShowTradeForm(true)
  }

  const resetTradeForm = () => {
    setTradeForm({
      id: undefined,
      trade_date: new Date().toISOString().slice(0, 10),
      stock_code: '',
      stock_name: '',
      direction: 1,
      price: '',
      quantity: '',
      amount: '',
      reason: '',
      review: '',
      correct: null,
    })
  }

  const handleSelectPosition = async (pos: StockPosition) => {
    setSelectedPosition(pos)
    setPositionNotes(pos.notes || '')
    setNotesSaved(false)
    const inds = await window.electronAPI?.getIndicators(pos.stock_code)
    setIndicators(inds || [])
    const binds = await window.electronAPI?.getBindingsByStock(pos.stock_code)
    setPositionBindings(binds || [])
  }

  const handleSavePositionNotes = async () => {
    if (!selectedPosition) return
    const updated = await window.electronAPI?.saveStockNotes(selectedPosition.stock_code, positionNotes)
    if (updated) {
      setSelectedPosition(updated)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
      loadPositions()
    }
  }

  const handleOpenNotesModal = async (stockCode: string, stockName: string) => {
    const pos = await window.electronAPI?.getPositionByStockCode(stockCode)
    if (!pos) return
    setNotesModalStock({ code: stockCode, name: stockName })
    setModalNotes(pos.notes || '')
    setModalNotesSaved(false)
    setShowNotesModal(true)
  }

  const handleSaveModalNotes = async () => {
    if (!notesModalStock) return
    await window.electronAPI?.saveStockNotes(notesModalStock.code, modalNotes)
    setModalNotesSaved(true)
    setTimeout(() => setModalNotesSaved(false), 2000)
    if (selectedPosition?.stock_code === notesModalStock.code) {
      setPositionNotes(modalNotes)
      setSelectedPosition(prev => prev ? { ...prev, notes: modalNotes || null } : null)
    }
    loadPositions()
  }

  const handleDeletePosition = async (id: number) => {
    await window.electronAPI?.deletePosition(id)
    if (selectedPosition?.id === id) {
      setSelectedPosition(null)
      setIndicators([])
      setPositionBindings([])
    }
    loadPositions()
  }

  const handleSelectIndicatorDef = async (def: StockIndicatorDef) => {
    setSelectedIndicatorDef(def)
  }

  const handleSaveIndicatorDef = async () => {
    if (!indicatorDefForm.name) return
    const saved = await window.electronAPI?.saveIndicatorDef({
      id: selectedIndicatorDef?.id,
      name: indicatorDefForm.name,
      scope: indicatorDefForm.scope,
      value_type: indicatorDefForm.value_type,
      description: indicatorDefForm.description || null,
    })
    setShowIndicatorDefForm(false)
    loadIndicatorDefs()
    if (saved) setSelectedIndicatorDef(saved)
  }

  const handleDeleteIndicatorDef = async (id: number) => {
    await window.electronAPI?.deleteIndicatorDef(id)
    if (selectedIndicatorDef?.id === id) setSelectedIndicatorDef(null)
    loadIndicatorDefs()
  }

  const handleSelectStrategy = async (s: StockStrategy) => {
    const full = await window.electronAPI?.getStrategyById(s.id)
    setSelectedStrategy(full || null)
  }

  const handleSaveStrategy = async () => {
    if (!strategyForm.name) return
    const saved = await window.electronAPI?.saveStrategy({
      id: selectedStrategy?.id,
      name: strategyForm.name,
      description: strategyForm.description || null,
      direction: strategyForm.direction,
    })
    setShowStrategyForm(false)
    loadStrategies()
    if (saved) handleSelectStrategy(saved)
  }

  const handleDeleteStrategy = async (id: number) => {
    await window.electronAPI?.deleteStrategy(id)
    if (selectedStrategy?.id === id) setSelectedStrategy(null)
    loadStrategies()
  }

  const handleAddCondition = async () => {
    if (!selectedStrategy || !conditionForm.indicator_name || !conditionForm.threshold) return
    await window.electronAPI?.saveCondition({
      strategy_id: selectedStrategy.id,
      indicator_name: conditionForm.indicator_name,
      operator: conditionForm.operator,
      threshold: conditionForm.threshold,
    })
    setConditionForm({ indicator_name: '', operator: '>', threshold: '' })
    handleSelectStrategy(selectedStrategy)
  }

  const handleDeleteCondition = async (id: number) => {
    await window.electronAPI?.deleteCondition(id)
    if (selectedStrategy) handleSelectStrategy(selectedStrategy)
  }

  const handleBindStrategy = async (strategyId: number, stockCode: string, stockName: string) => {
    await window.electronAPI?.saveBinding({ strategy_id: strategyId, stock_code: stockCode, stock_name: stockName })
    const binds = await window.electronAPI?.getBindingsByStock(stockCode)
    setPositionBindings(binds || [])
    loadStrategies()
  }

  const handleToggleBinding = async (id: number, enabled: boolean) => {
    await window.electronAPI?.toggleBinding(id, enabled)
    if (selectedPosition) {
      const binds = await window.electronAPI?.getBindingsByStock(selectedPosition.stock_code)
      setPositionBindings(binds || [])
    }
  }

  const handleDeleteBinding = async (id: number) => {
    await window.electronAPI?.deleteBinding(id)
    if (selectedPosition) {
      const binds = await window.electronAPI?.getBindingsByStock(selectedPosition.stock_code)
      setPositionBindings(binds || [])
    }
    loadStrategies()
  }

  // OCR functions
  const openOcrModal = () => {
    setShowOcrModal(true)
    setOcrResult(null)
    setOcrError('')
    setOcrImagePreview('')
  }

  const processOcrImage = async (imageBase64: string) => {
    setOcrImagePreview(imageBase64)
    setOcrLoading(true)
    setOcrError('')
    setOcrResult(null)

    const res = await window.electronAPI?.ocrTrade(imageBase64)
    setOcrLoading(false)

    if (res?.error) {
      setOcrError(res.error)
    } else if (res?.data) {
      setOcrResult(res.data)
    }
  }

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!showOcrModal) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) return
        const reader = new FileReader()
        reader.onload = () => {
          processOcrImage(reader.result as string)
        }
        reader.readAsDataURL(blob)
        return
      }
    }
  }, [showOcrModal])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const handleCaptureScreen = async () => {
    setShowOcrModal(false)
    const res = await window.electronAPI?.captureScreen()
    if (res?.cancelled) {
      setShowOcrModal(true)
      return
    }
    if (res?.error) {
      setShowOcrModal(true)
      setOcrError(res.error)
      return
    }
    if (res?.data) {
      setShowOcrModal(true)
      processOcrImage(res.data)
    }
  }

  const handleOcrConfirm = () => {
    if (!ocrResult) return
    setTradeForm({
      id: undefined,
      trade_date: new Date().toISOString().slice(0, 10),
      stock_code: ocrResult.stock_code || '',
      stock_name: ocrResult.stock_name || '',
      direction: ocrResult.direction || 1,
      price: ocrResult.price != null ? String(ocrResult.price) : '',
      quantity: ocrResult.quantity != null ? String(ocrResult.quantity) : '',
      amount: '',
      reason: '',
      review: '',
      correct: null,
    })
    setShowOcrModal(false)
    setShowTradeForm(true)
  }

  return (
    <div className="sub-window stock-window">
      <div className="stock-tabs">
        <button className={tab === 'trades' ? 'active' : ''} onClick={() => setTab('trades')}>交易记录</button>
        <button className={tab === 'positions' ? 'active' : ''} onClick={() => setTab('positions')}>持仓</button>
        <button className={tab === 'strategies' ? 'active' : ''} onClick={() => setTab('strategies')}>策略</button>
        <button className={tab === 'indicators' ? 'active' : ''} onClick={() => setTab('indicators')}>指标</button>
      </div>

      {tab === 'trades' && (
        <div className="stock-trades-panel">
          <div className="stock-filter-row">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索代码/名称..."
            />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="">全部时间</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </select>
            <div className="direction-toggle">
              <button className={direction === undefined ? 'active' : ''} onClick={() => setDirection(undefined)}>全部</button>
              <button className={direction === 1 ? 'active buy' : ''} onClick={() => setDirection(1)}>买入</button>
              <button className={direction === 2 ? 'active sell' : ''} onClick={() => setDirection(2)}>卖出</button>
            </div>
            <button className="add-btn" onClick={() => { resetTradeForm(); setShowTradeForm(true) }}>+ 记录</button>
            <button className="ocr-btn" onClick={openOcrModal}>OCR识别</button>
          </div>

          {showTradeForm && (
            <div className="trade-form">
              <div className="trade-form-grid">
                <input value={tradeForm.trade_date} onChange={e => setTradeForm({ ...tradeForm, trade_date: e.target.value })} type="date" />
                <input value={tradeForm.stock_code} onChange={e => setTradeForm({ ...tradeForm, stock_code: e.target.value })} placeholder="股票代码" />
                <input value={tradeForm.stock_name} onChange={e => setTradeForm({ ...tradeForm, stock_name: e.target.value })} placeholder="股票名称" />
                <div className="direction-toggle">
                  <button className={tradeForm.direction === 1 ? 'active buy' : ''} onClick={() => setTradeForm({ ...tradeForm, direction: 1 })}>买入</button>
                  <button className={tradeForm.direction === 2 ? 'active sell' : ''} onClick={() => setTradeForm({ ...tradeForm, direction: 2 })}>卖出</button>
                </div>
                <input value={tradeForm.price} onChange={e => setTradeForm({ ...tradeForm, price: e.target.value })} placeholder="价格" type="number" step="0.01" />
                <input value={tradeForm.quantity} onChange={e => setTradeForm({ ...tradeForm, quantity: e.target.value })} placeholder="数量" type="number" />
              </div>
              <div className="strategy-select-row">
                <label>使用策略</label>
                <select value={selectedTradeStrategy || ''} onChange={e => setSelectedTradeStrategy(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">— 不选择 —</option>
                  {tradeStrategies.map(s => (
                    <option key={s.id} value={s.id}>{s.name}（{s.direction === 1 ? '买入' : '卖出'}）</option>
                  ))}
                </select>
              </div>
              <textarea value={tradeForm.reason} onChange={e => setTradeForm({ ...tradeForm, reason: e.target.value })} placeholder="买卖理由" rows={2} />
              <textarea value={tradeForm.review} onChange={e => setTradeForm({ ...tradeForm, review: e.target.value })} placeholder="复盘反思" rows={2} />
              <div className="correct-toggle">
                <span className="correct-label">操作评价</span>
                <div className="direction-toggle">
                  <button className={tradeForm.correct === 1 ? 'active correct-yes' : ''} onClick={() => setTradeForm({ ...tradeForm, correct: tradeForm.correct === 1 ? null : 1 })}>✓ 正确</button>
                  <button className={tradeForm.correct === 0 ? 'active correct-no' : ''} onClick={() => setTradeForm({ ...tradeForm, correct: tradeForm.correct === 0 ? null : 0 })}>✗ 错误</button>
                </div>
              </div>
              <div className="trade-form-actions">
                <button onClick={handleSaveTrade}>保存</button>
                <button onClick={() => setShowTradeForm(false)}>取消</button>
              </div>
            </div>
          )}

          <table className="stock-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>代码</th>
                <th>名称</th>
                <th>方向</th>
                <th>价格</th>
                <th>数量</th>
                <th>理由</th>
                <th>评价</th>
                <th>复盘</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id}>
                  <td>{t.trade_date instanceof Date ? t.trade_date.toLocaleDateString('zh-CN') : t.trade_date}</td>
                  <td>{t.stock_code}</td>
                  <td>{t.stock_name}</td>
                  <td className={t.direction === 1 ? 'buy' : 'sell'}>{t.direction === 1 ? '买入' : '卖出'}</td>
                  <td>{t.price}</td>
                  <td>{t.quantity}</td>
                  <td className="reason-cell" title={t.reason || ''}>{t.reason || '—'}</td>
                  <td className={t.correct === 1 ? 'correct-yes' : t.correct === 0 ? 'correct-no' : ''}>{t.correct === 1 ? '✓' : t.correct === 0 ? '✗' : '—'}</td>
                  <td className="review-cell" title={t.review || ''}>{t.review || '—'}</td>
                  <td>
                    <button className="table-btn" onClick={() => handleEditTrade(t)}>编辑</button>
                    <button className="table-btn danger" onClick={() => handleDeleteTrade(t.id)}>删除</button>
                    <button
                      className="table-btn notes-btn"
                      onClick={() => handleOpenNotesModal(t.stock_code, t.stock_name)}
                      title={`${t.stock_name}笔记`}
                    >笔记</button>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr><td colSpan={10} className="empty-row">暂无交易记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'positions' && (
        <div className="stock-positions-panel">
          <div className="stock-filter-row">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索代码/名称..."
            />
          </div>

          <div className="positions-layout">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>数量</th>
                  <th>成本价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr
                    key={p.id}
                    className={selectedPosition?.id === p.id ? 'selected' : ''}
                    onClick={() => handleSelectPosition(p)}
                  >
                    <td>{p.stock_code}</td>
                    <td>{p.stock_name}</td>
                    <td>{p.quantity}</td>
                    <td>{Number(p.cost_price).toFixed(2)}</td>
                    <td>
                      <button className="table-btn danger" onClick={e => { e.stopPropagation(); handleDeletePosition(p.id) }}>删除</button>
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && (
                  <tr><td colSpan={5} className="empty-row">暂无持仓</td></tr>
                )}
              </tbody>
            </table>

            {selectedPosition && (
              <div className="position-detail">
                <h3>{selectedPosition.stock_name} ({selectedPosition.stock_code})</h3>
                <div className="position-info">
                  <span>数量: {selectedPosition.quantity}</span>
                  <span>成本: {Number(selectedPosition.cost_price).toFixed(2)}</span>
                </div>
                {selectedPosition.buy_point && <p>买点: {selectedPosition.buy_point}</p>}
                {selectedPosition.sell_point && <p>卖点: {selectedPosition.sell_point}</p>}

                <div className="position-notes-section">
                  <div className="position-notes-header">
                    <h4>股票笔记</h4>
                    {notesSaved && <span className="notes-saved-tag">已保存</span>}
                  </div>
                  <textarea
                    className="position-notes-textarea"
                    value={positionNotes}
                    onChange={e => { setPositionNotes(e.target.value); setNotesSaved(false) }}
                    onBlur={handleSavePositionNotes}
                    placeholder="记录对该股票的分析、策略、关注点..."
                    rows={4}
                  />
                </div>

                {indicators.length > 0 && (
                  <div className="indicators">
                    <h4>指标</h4>
                    {indicators.map(ind => (
                      <div key={ind.id} className="indicator-item">
                        <span className="indicator-name">{ind.name}</span>
                        <span className="indicator-value">{ind.value}</span>
                        {ind.remark && <span className="indicator-remark">{ind.remark}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="position-bindings">
                  <h4>已绑定策略</h4>
                  {positionBindings.length > 0 ? positionBindings.map(b => (
                    <div key={b.id} className="binding-ctrl-row">
                      <span className="binding-name">{b.strategy_name} <span className={`direction-tag ${b.strategy_direction === 1 ? 'buy' : 'sell'}`}>{b.strategy_direction === 1 ? '买入' : '卖出'}</span></span>
                      <div className="binding-ctrl-right">
                        <label className="binding-toggle">
                          <input type="checkbox" checked={b.enabled === 1} onChange={e => handleToggleBinding(b.id, e.target.checked)} />
                          <span>{b.enabled ? '启用' : '暂停'}</span>
                        </label>
                        <button className="table-btn danger" onClick={() => handleDeleteBinding(b.id)}>解绑</button>
                      </div>
                    </div>
                  )) : <div className="empty-hint">未绑定策略</div>}
                  <div className="bind-add-row">
                    <select id="bind-strategy-select" defaultValue="">
                      <option value="">选择策略...</option>
                      {strategies.map(s => (
                        <option key={s.id} value={s.id}>{s.name}（{s.direction === 1 ? '买入' : '卖出'}）</option>
                      ))}
                    </select>
                    <button className="table-btn" onClick={() => {
                      const sel = document.getElementById('bind-strategy-select') as HTMLSelectElement
                      if (sel.value && selectedPosition) {
                        handleBindStrategy(Number(sel.value), selectedPosition.stock_code, selectedPosition.stock_name)
                        sel.value = ''
                      }
                    }}>绑定</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'strategies' && (
        <div className="stock-strategies-panel">
          <div className="stock-filter-row">
            <button className="add-btn" onClick={() => {
              setStrategyForm({ name: '', description: '', direction: 1 })
              setShowStrategyForm(true)
              setSelectedStrategy(null)
            }}>+ 新建策略</button>
          </div>

          {showStrategyForm && (
            <div className="trade-form">
              <div className="trade-form-grid">
                <input value={strategyForm.name} onChange={e => setStrategyForm({ ...strategyForm, name: e.target.value })} placeholder="策略名称" />
                <div className="direction-toggle">
                  <button className={strategyForm.direction === 1 ? 'active buy' : ''} onClick={() => setStrategyForm({ ...strategyForm, direction: 1 })}>买入信号</button>
                  <button className={strategyForm.direction === 2 ? 'active sell' : ''} onClick={() => setStrategyForm({ ...strategyForm, direction: 2 })}>卖出信号</button>
                </div>
              </div>
              <textarea value={strategyForm.description} onChange={e => setStrategyForm({ ...strategyForm, description: e.target.value })} placeholder="策略描述" rows={2} />
              <div className="trade-form-actions">
                <button onClick={handleSaveStrategy}>保存</button>
                <button onClick={() => setShowStrategyForm(false)}>取消</button>
              </div>
            </div>
          )}

          <div className="positions-layout">
            <div className="strategy-list">
              {strategies.map(s => (
                <div
                  key={s.id}
                  className={`strategy-item ${selectedStrategy?.id === s.id ? 'selected' : ''}`}
                  onClick={() => handleSelectStrategy(s)}
                >
                  <div className="strategy-item-header">
                    <span className="strategy-name">{s.name}</span>
                    <span className={`direction-tag ${s.direction === 1 ? 'buy' : 'sell'}`}>{s.direction === 1 ? '买入' : '卖出'}</span>
                  </div>
                  <div className="strategy-item-meta">
                    <span>{s.conditions?.length || 0} 个条件</span>
                    <span>{s.bindingCount || 0} 只股票</span>
                  </div>
                </div>
              ))}
              {strategies.length === 0 && <div className="empty-row">暂无策略</div>}
            </div>

            {selectedStrategy && (
              <div className="position-detail strategy-detail">
                <div className="strategy-detail-header">
                  <h3>{selectedStrategy.name}</h3>
                  <div>
                    <button className="table-btn" onClick={() => {
                      setStrategyForm({
                        name: selectedStrategy.name,
                        description: selectedStrategy.description || '',
                        direction: selectedStrategy.direction,
                      })
                      setShowStrategyForm(true)
                    }}>编辑</button>
                    <button className="table-btn danger" onClick={() => handleDeleteStrategy(selectedStrategy.id)}>删除</button>
                  </div>
                </div>
                {selectedStrategy.description && <p className="position-notes">{selectedStrategy.description}</p>}
                <span className={`direction-tag ${selectedStrategy.direction === 1 ? 'buy' : 'sell'}`}>
                  {selectedStrategy.direction === 1 ? '买入信号' : '卖出信号'}
                </span>

                <div className="indicators">
                  <h4>条件</h4>
                  {selectedStrategy.conditions?.map(c => (
                    <div key={c.id} className="indicator-item">
                      <span className="indicator-name">{c.indicator_name}</span>
                      <span className="indicator-value">{c.operator} {c.threshold}</span>
                      <button className="table-btn danger" onClick={() => handleDeleteCondition(c.id)}>×</button>
                    </div>
                  ))}
                  <div className="condition-add-row">
                    <select value={conditionForm.indicator_name} onChange={e => setConditionForm({ ...conditionForm, indicator_name: e.target.value })} className="condition-indicator-select">
                      <option value="">选择指标...</option>
                      {indicatorDefs.map(d => (
                        <option key={d.id} value={d.name}>{d.name}（{d.scope === 'market' ? '大盘' : '个股'}）</option>
                      ))}
                    </select>
                    <select value={conditionForm.operator} onChange={e => setConditionForm({ ...conditionForm, operator: e.target.value })}>
                      <option value=">">{'>'}</option>
                      <option value="<">{'<'}</option>
                      <option value=">=">{'>='}</option>
                      <option value="<=">{'<='}</option>
                      <option value="=">{'='}</option>
                      <option value="!=">{'!='}</option>
                    </select>
                    <input value={conditionForm.threshold} onChange={e => setConditionForm({ ...conditionForm, threshold: e.target.value })} placeholder="阈值" />
                    <button className="add-btn" onClick={handleAddCondition}>+</button>
                  </div>
                </div>

                <div className="indicators">
                  <h4>已绑定股票</h4>
                  {selectedStrategy.bindings && selectedStrategy.bindings.length > 0 ? selectedStrategy.bindings.map(b => (
                    <div key={b.id} className="indicator-item">
                      <span className="indicator-name">{b.stock_name}({b.stock_code})</span>
                      <span className="indicator-value">{b.enabled ? '启用' : '暂停'}</span>
                    </div>
                  )) : <div className="empty-hint">在交易记录或持仓中绑定策略</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'indicators' && (
        <div className="stock-strategies-panel">
          <div className="stock-filter-row">
            <button className="add-btn" onClick={() => {
              setIndicatorDefForm({ name: '', scope: 'stock', value_type: 'number', description: '' })
              setShowIndicatorDefForm(true)
              setSelectedIndicatorDef(null)
            }}>+ 新建指标</button>
            <div className="direction-toggle indicator-scope-filter">
              <button className={indicatorScope === '' ? 'active' : ''} onClick={() => setIndicatorScope('')}>全部</button>
              <button className={indicatorScope === 'stock' ? 'active' : ''} onClick={() => setIndicatorScope('stock')}>个股</button>
              <button className={indicatorScope === 'market' ? 'active' : ''} onClick={() => setIndicatorScope('market')}>大盘</button>
            </div>
          </div>

          {showIndicatorDefForm && (
            <div className="trade-form">
              <div className="trade-form-grid">
                <input value={indicatorDefForm.name} onChange={e => setIndicatorDefForm({ ...indicatorDefForm, name: e.target.value })} placeholder="指标名称" />
                <div className="direction-toggle">
                  <button className={indicatorDefForm.scope === 'stock' ? 'active' : ''} onClick={() => setIndicatorDefForm({ ...indicatorDefForm, scope: 'stock' })}>个股</button>
                  <button className={indicatorDefForm.scope === 'market' ? 'active' : ''} onClick={() => setIndicatorDefForm({ ...indicatorDefForm, scope: 'market' })}>大盘</button>
                </div>
                <div className="direction-toggle">
                  <button className={indicatorDefForm.value_type === 'number' ? 'active' : ''} onClick={() => setIndicatorDefForm({ ...indicatorDefForm, value_type: 'number' })}>数值</button>
                  <button className={indicatorDefForm.value_type === 'text' ? 'active' : ''} onClick={() => setIndicatorDefForm({ ...indicatorDefForm, value_type: 'text' })}>文本</button>
                </div>
              </div>
              <textarea value={indicatorDefForm.description} onChange={e => setIndicatorDefForm({ ...indicatorDefForm, description: e.target.value })} placeholder="指标说明" rows={2} />
              <div className="trade-form-actions">
                <button onClick={handleSaveIndicatorDef}>保存</button>
                <button onClick={() => setShowIndicatorDefForm(false)}>取消</button>
              </div>
            </div>
          )}

          <div className="positions-layout">
            <div className="strategy-list">
              {indicatorDefs.map(d => (
                <div
                  key={d.id}
                  className={`strategy-item ${selectedIndicatorDef?.id === d.id ? 'selected' : ''}`}
                  onClick={() => handleSelectIndicatorDef(d)}
                >
                  <div className="strategy-item-header">
                    <span className="strategy-name">{d.name}</span>
                    <span className={`scope-tag ${d.scope}`}>{d.scope === 'market' ? '大盘' : '个股'}</span>
                  </div>
                  <div className="strategy-item-meta">
                    <span>{d.value_type === 'number' ? '数值' : '文本'}</span>
                  </div>
                </div>
              ))}
              {indicatorDefs.length === 0 && <div className="empty-row">暂无指标</div>}
            </div>

            {selectedIndicatorDef && (
              <div className="position-detail strategy-detail">
                <div className="strategy-detail-header">
                  <h3>{selectedIndicatorDef.name}</h3>
                  <div>
                    <button className="table-btn" onClick={() => {
                      setIndicatorDefForm({
                        name: selectedIndicatorDef.name,
                        scope: selectedIndicatorDef.scope,
                        value_type: selectedIndicatorDef.value_type,
                        description: selectedIndicatorDef.description || '',
                      })
                      setShowIndicatorDefForm(true)
                    }}>编辑</button>
                    <button className="table-btn danger" onClick={() => handleDeleteIndicatorDef(selectedIndicatorDef.id)}>删除</button>
                  </div>
                </div>
                <div className="indicator-def-tags">
                  <span className={`scope-tag ${selectedIndicatorDef.scope}`}>{selectedIndicatorDef.scope === 'market' ? '大盘指标' : '个股指标'}</span>
                  <span className="type-tag">{selectedIndicatorDef.value_type === 'number' ? '数值型' : '文本型'}</span>
                </div>
                {selectedIndicatorDef.description && <p className="position-notes">{selectedIndicatorDef.description}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showNotesModal && notesModalStock && (
        <div className="ocr-modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="ocr-modal stock-notes-modal" onClick={e => e.stopPropagation()}>
            <div className="ocr-modal-header">
              <span>{notesModalStock.name} ({notesModalStock.code}) 笔记</span>
              <button className="ocr-close-btn" onClick={() => setShowNotesModal(false)}>×</button>
            </div>
            <div className="ocr-modal-body">
              <textarea
                className="position-notes-textarea"
                value={modalNotes}
                onChange={e => { setModalNotes(e.target.value); setModalNotesSaved(false) }}
                onBlur={handleSaveModalNotes}
                placeholder="记录对该股票的分析、策略、关注点..."
                rows={6}
                autoFocus
              />
              <div className="notes-modal-footer">
                <span className="notes-hint">失焦自动保存</span>
                {modalNotesSaved && <span className="notes-saved-tag">已保存</span>}
                <button className="add-btn" onClick={handleSaveModalNotes}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOcrModal && (
        <div className="ocr-modal-overlay" onClick={() => setShowOcrModal(false)}>
          <div className="ocr-modal" onClick={e => e.stopPropagation()}>
            <div className="ocr-modal-header">
              <span>OCR 识别交易</span>
              <button className="ocr-close-btn" onClick={() => setShowOcrModal(false)}>×</button>
            </div>
            <div className="ocr-modal-body">
              <div className="ocr-paste-zone" onClick={handleCaptureScreen}>
                {ocrImagePreview ? (
                  <img src={ocrImagePreview} alt="截图预览" className="ocr-preview-img" />
                ) : (
                  <>
                    <div className="ocr-paste-icon">📋</div>
                    <div className="ocr-paste-text">Ctrl+V 粘贴截图 或</div>
                    <button className="ocr-capture-btn" onClick={e => { e.stopPropagation(); handleCaptureScreen() }}>
                      ✂ 点击截图
                    </button>
                  </>
                )}
              </div>

              {ocrLoading && <div className="ocr-status">识别中...</div>}
              {ocrError && <div className="ocr-status ocr-error">{ocrError}</div>}

              {ocrResult && (
                <>
                  <div className="ocr-divider" />
                  <div className="ocr-result-title">识别结果</div>
                  <div className="ocr-result-grid">
                    <div className="ocr-field">
                      <label>证券名称</label>
                      <input value={ocrResult.stock_name || ''} onChange={e => setOcrResult({ ...ocrResult, stock_name: e.target.value })} />
                    </div>
                    <div className="ocr-field">
                      <label>证券代码</label>
                      <input value={ocrResult.stock_code || ''} onChange={e => setOcrResult({ ...ocrResult, stock_code: e.target.value })} />
                    </div>
                    <div className="ocr-field">
                      <label>买卖方向</label>
                      <div className="direction-toggle">
                        <button className={ocrResult.direction === 1 ? 'active buy' : ''} onClick={() => setOcrResult({ ...ocrResult, direction: 1 })}>买入</button>
                        <button className={ocrResult.direction === 2 ? 'active sell' : ''} onClick={() => setOcrResult({ ...ocrResult, direction: 2 })}>卖出</button>
                      </div>
                    </div>
                    <div className="ocr-field">
                      <label>成交价格</label>
                      <input value={ocrResult.price ?? ''} onChange={e => setOcrResult({ ...ocrResult, price: Number(e.target.value) || 0 })} type="number" step="0.0001" />
                    </div>
                    <div className="ocr-field">
                      <label>成交数量</label>
                      <input value={ocrResult.quantity ?? ''} onChange={e => setOcrResult({ ...ocrResult, quantity: Number(e.target.value) || 0 })} type="number" />
                    </div>
                    <div className="ocr-field">
                      <label>成交时间</label>
                      <input value={ocrResult.trade_time || ''} onChange={e => setOcrResult({ ...ocrResult, trade_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="ocr-actions">
                    <button className="ocr-action-cancel" onClick={() => setShowOcrModal(false)}>取消</button>
                    <button className="ocr-action-confirm" onClick={handleOcrConfirm}>确认录入</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
