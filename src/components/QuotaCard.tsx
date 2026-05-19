import type { UsageQuota } from '../types/pet'

interface QuotaCardsProps {
  quotas: UsageQuota[]
  visible: boolean
}

function formatResetTime(resetAt?: string): string {
  if (!resetAt) return ''
  try {
    const reset = new Date(resetAt)
    const now = new Date()
    const diffMs = reset.getTime() - now.getTime()
    if (diffMs <= 0) return '即将重置'
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    if (hours > 0) return `${hours}小时后重置`
    return `${minutes}分钟后重置`
  } catch {
    return ''
  }
}

export function QuotaCards({ quotas, visible }: QuotaCardsProps) {
  if (!visible || quotas.length === 0) return null

  return (
    <div className="quota-cards">
      {quotas.map((q) => (
        <div key={q.name} className="quota-card">
          <div className="quota-header">
            <span className="quota-name">{q.name}</span>
            <span className="quota-pct">{Math.round(q.percentage)}%</span>
          </div>
          <div className="quota-bar">
            <div
              className="quota-fill"
              style={{
                width: `${Math.min(100, q.percentage)}%`,
                backgroundColor: q.percentage > 80 ? '#ef4444' : q.percentage > 50 ? '#f59e0b' : '#7c6ef0',
              }}
            />
          </div>
          {q.resetAt && (
            <div className="quota-reset">{formatResetTime(q.resetAt)}</div>
          )}
        </div>
      ))}
    </div>
  )
}
