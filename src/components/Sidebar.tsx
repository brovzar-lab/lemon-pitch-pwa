import { useEffect, useState } from 'react'
import type { Session, PitchSummary, AllTimeStats, BackendStats } from '../types'
import { fetchPitches, fetchStats, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_SESSIONS, DEMO_STATS } from '../demo'

const STALE_MS = 24 * 60 * 60 * 1000

function isSessionStale(session: Session): boolean {
  return Date.now() - new Date(session.createdAt).getTime() > STALE_MS
}

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  currentSessionId: string | null
  isHome: boolean
  onSelectSession: (id: string) => void
  onStartSession: (pitches: PitchSummary[]) => void
  onRefresh: () => Promise<{ synced: string; pitches: PitchSummary[] } | null>
  onVaultOpen: () => void
  onRenameSession: (sessionId: string, name: string) => void
  syncing: boolean
}

function computeStats(sessions: Session[]): AllTimeStats {
  const stats: AllTimeStats = { approved: 0, vaulted: 0, rejected: 0, pending: 0 }
  for (const s of sessions) {
    for (const v of Object.values(s.verdicts)) {
      if (v === 'approve') stats.approved++
      else if (v === 'vault') stats.vaulted++
      else if (v === 'reject') stats.rejected++
    }
    stats.pending += s.pitchIds.length - Object.keys(s.verdicts).length
  }
  return stats
}

function sessionHasPending(session: Session): boolean {
  return session.pitchIds.some(id => !session.verdicts[id])
}

export function Sidebar({
  sessions,
  activeSessionId,
  currentSessionId,
  isHome,
  onSelectSession,
  onStartSession,
  onRefresh,
  onVaultOpen,
  onRenameSession,
  syncing,
}: Props) {
  const [pitches, setPitches] = useState<PitchSummary[]>([])
  const [loading, setLoading] = useState(!isDemo)
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null)

  useEffect(() => {
    if (isDemo) { setPitches(DEMO_PITCHES); return }
    fetchPitches().then(setPitches).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isDemo) return
    fetchStats().then(setBackendStats).catch(() => {})
  }, [])

  const handleRefresh = async () => {
    const result = await onRefresh()
    if (result) setPitches(result.pitches)
  }

  const displaySessions = isDemo ? DEMO_SESSIONS : sessions
  const localStats = isDemo ? DEMO_STATS : computeStats(sessions)
  const stats = backendStats ?? localStats
  const activeSession = displaySessions.find(s => s.id === activeSessionId)
  const hasPending = activeSession ? sessionHasPending(activeSession) : false

  const handleCTA = () => {
    if (isDemo) { onSelectSession(DEMO_SESSIONS[0]?.id ?? ''); return }
    if (hasPending && activeSession) {
      onSelectSession(activeSession.id)
    } else {
      onStartSession(pitches)
    }
  }

  const fmt = (n: number) => backendStats === null && !isDemo ? '—' : n

  const pillForSession = (s: Session) => {
    const approved = Object.values(s.verdicts).filter(v => v === 'approve').length
    const vaulted  = Object.values(s.verdicts).filter(v => v === 'vault').length
    const rejected = Object.values(s.verdicts).filter(v => v === 'reject').length
    const pending  = s.pitchIds.length - Object.keys(s.verdicts).length
    const pills: JSX.Element[] = []
    if (approved > 0) pills.push(<span key="a" className="pill approved">{approved}A</span>)
    if (vaulted > 0)  pills.push(<span key="v" className="pill vaulted">{vaulted}V</span>)
    if (rejected > 0) pills.push(<span key="r" className="pill rejected">{rejected}R</span>)
    if (pending > 0)  pills.push(<span key="p" className="pill pending">{pending}P</span>)
    return pills
  }

  return (
    <aside className="sidebar">
      {/* Logo + title */}
      <div className="sidebar-header">
        <img
          className="sidebar-logo"
          src="https://static1.squarespace.com/static/59888a11a5790a7d30e531f7/t/59888ecbe58c62df095c1ee2/1502121676336/LOGOSOLO.png?format=1500w"
          alt="Lemon Studios"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div>
          <div className="sidebar-title">Lemon Pitch</div>
          <div className="sidebar-subtitle">Intelligence Terminal</div>
        </div>
      </div>

      {/* Stats */}
      <div className="sidebar-stats">
        <div className="sidebar-stat-label">All-Time Stats</div>
        <div className="sidebar-stat-grid">
          <div className="sidebar-stat-cell approved">
            <div className="sidebar-stat-num">{fmt(stats.approved)}</div>
            <div className="sidebar-stat-key">Approved</div>
          </div>
          <div className="sidebar-stat-cell vaulted">
            <div className="sidebar-stat-num">{fmt(stats.vaulted)}</div>
            <div className="sidebar-stat-key">Vaulted</div>
          </div>
          <div className="sidebar-stat-cell rejected">
            <div className="sidebar-stat-num">{fmt(stats.rejected)}</div>
            <div className="sidebar-stat-key">Rejected</div>
          </div>
          <div className="sidebar-stat-cell pending">
            <div className="sidebar-stat-num">{fmt(stats.pending)}</div>
            <div className="sidebar-stat-key">Pending</div>
          </div>
        </div>
      </div>

      {/* Vault link */}
      {!isDemo && (
        <div className="sidebar-vault">
          <button className="sidebar-vault-btn" onClick={onVaultOpen}>
            VAULT{backendStats ? ` (${backendStats.vaulted})` : ''}
          </button>
        </div>
      )}

      {/* Sessions list */}
      <div className="sidebar-sessions">
        {displaySessions.length > 0 && (
          <>
            <div className="sidebar-section-label">Sessions</div>
            {displaySessions.map(s => (
              <div
                key={s.id}
                className={`sidebar-session-item${s.id === currentSessionId ? ' active' : ''}`}
                onClick={() => onSelectSession(s.id)}
              >
                <span
                  className="sidebar-session-name"
                  contentEditable
                  suppressContentEditableWarning
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  onBlur={e => onRenameSession(s.id, e.currentTarget.textContent ?? '')}
                >
                  {s.name}
                </span>
                <div className="sidebar-session-pills">{pillForSession(s)}</div>
                {!isDemo && isSessionStale(s) && (
                  <div className="sidebar-session-stale">⚠ Data may be outdated</div>
                )}
              </div>
            ))}
          </>
        )}
        {isHome && !loading && displaySessions.length === 0 && (
          <div className="empty-state" style={{ fontSize: 10, padding: '20px 16px' }}>
            No sessions yet
          </div>
        )}
      </div>

      {/* System status */}
      <div className="system-status">
        <div className="status-dot" />
        <span className="status-text">System Online</span>
      </div>

      {/* Dev Gate sync */}
      <div className="sidebar-refresh">
        <button className="sidebar-refresh-btn" onClick={handleRefresh} disabled={syncing}>
          {syncing ? '↻ Syncing…' : '↻ Sync Dev Gate'}
        </button>
      </div>

      {/* CTA */}
      <div className="sidebar-cta">
        <button
          className="cta-btn cta-btn--sidebar"
          onClick={handleCTA}
          disabled={!isDemo && loading}
        >
          <span>
            {isDemo
              ? '▶ Demo Session'
              : hasPending
                ? '▶ Continue Session'
                : loading
                  ? 'Initializing…'
                  : '▶ New Session'}
          </span>
        </button>
      </div>
    </aside>
  )
}
