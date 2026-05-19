import { useState, useEffect, useCallback } from 'react'
import type { StockTrade, StockPosition, StockIndicator } from '../types/pet'

type Tab = 'trades' | 'positions'

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
  })

  // Position detail
  const [selectedPosition, setSelectedPosition] = useState<StockPosition | null>(null)
  const [indicators, setIndicators] = useState<StockIndicator[]>([])

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

  useEffect(() => {
    if (tab === 'trades') loadTrades()
    else loadPositions()
  }, [tab, loadTrades, loadPositions])

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
    })
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
      trade_date: t.trade_date || '',
      stock_code: t.stock_code,
      stock_name: t.stock_name,
      direction: t.direction,
      price: String(t.price),
      quantity: String(t.quantity),
      amount: t.amount ? String(t.amount) : '',
      reason: t.reason || '',
      review: t.review || '',
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
    })
  }

  const handleSelectPosition = async (pos: StockPosition) => {
    setSelectedPosition(pos)
    const inds = await window.electronAPI?.getIndicators(pos.stock_code)
    setIndicators(inds || [])
  }

  const handleDeletePosition = async (id: number) => {
    await window.electronAPI?.deletePosition(id)
    if (selectedPosition?.id === id) {
      setSelectedPosition(null)
      setIndicators([])
    }
    loadPositions()
  }

  return (
    <div className="sub-window stock-window">
      <div className="stock-tabs">
        <button className={tab === 'trades' ? 'active' : ''} onClick={() => setTab('trades')}>交易记录</button>
        <button className={tab === 'positions' ? 'active' : ''} onClick={() => setTab('positions')}>持仓</button>
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
            <select value={direction ?? ''} onChange={e => setDirection(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">买卖方向</option>
              <option value="1">买入</option>
              <option value="2">卖出</option>
            </select>
            <button className="add-btn" onClick={() => { resetTradeForm(); setShowTradeForm(true) }}>+ 记录</button>
          </div>

          {showTradeForm && (
            <div className="trade-form">
              <div className="trade-form-grid">
                <input value={tradeForm.trade_date} onChange={e => setTradeForm({ ...tradeForm, trade_date: e.target.value })} type="date" />
                <input value={tradeForm.stock_code} onChange={e => setTradeForm({ ...tradeForm, stock_code: e.target.value })} placeholder="股票代码" />
                <input value={tradeForm.stock_name} onChange={e => setTradeForm({ ...tradeForm, stock_name: e.target.value })} placeholder="股票名称" />
                <select value={tradeForm.direction} onChange={e => setTradeForm({ ...tradeForm, direction: Number(e.target.value) })}>
                  <option value={1}>买入</option>
                  <option value={2}>卖出</option>
                </select>
                <input value={tradeForm.price} onChange={e => setTradeForm({ ...tradeForm, price: e.target.value })} placeholder="价格" type="number" step="0.01" />
                <input value={tradeForm.quantity} onChange={e => setTradeForm({ ...tradeForm, quantity: e.target.value })} placeholder="数量" type="number" />
              </div>
              <textarea value={tradeForm.reason} onChange={e => setTradeForm({ ...tradeForm, reason: e.target.value })} placeholder="买卖理由" rows={2} />
              <textarea value={tradeForm.review} onChange={e => setTradeForm({ ...tradeForm, review: e.target.value })} placeholder="复盘反思" rows={2} />
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id}>
                  <td>{t.trade_date}</td>
                  <td>{t.stock_code}</td>
                  <td>{t.stock_name}</td>
                  <td className={t.direction === 1 ? 'buy' : 'sell'}>{t.direction === 1 ? '买入' : '卖出'}</td>
                  <td>{t.price}</td>
                  <td>{t.quantity}</td>
                  <td>
                    <button className="table-btn" onClick={() => handleEditTrade(t)}>编辑</button>
                    <button className="table-btn danger" onClick={() => handleDeleteTrade(t.id)}>删除</button>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr><td colSpan={7} className="empty-row">暂无交易记录</td></tr>
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
                {selectedPosition.notes && <p className="position-notes">{selectedPosition.notes}</p>}
                {selectedPosition.buy_point && <p>买点: {selectedPosition.buy_point}</p>}
                {selectedPosition.sell_point && <p>卖点: {selectedPosition.sell_point}</p>}

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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
