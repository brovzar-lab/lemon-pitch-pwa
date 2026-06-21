import { useEffect, useState } from 'react'
import type { PitchSummary, Session, AllTimeStats, BackendStats } from '../types'
import { fetchPitches, fetchStats, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_SESSIONS, DEMO_STATS } from '../demo'

interface Props {
  sessions: Session[]
  onSelectSession: (id: string) => void
  onStartSession: (pitches: PitchSummary[]) => void
  activeSessionId: string | null
}

function computeStats(sessions: Session[]): AllTimeStats {
  const stats: AllTimeStats = { approved: 0, vaulted: 0, rejected: 0, pending: 0 }
  for (const s of sessions) {
    for (const v of Object.values(s.verdicts)) {
      if (v === 'approve') stats.approved++
      else if (v === 'vault') stats.vaulted++
      else if (v === 'reject') stats.rejected++
    }
    const decided = Object.keys(s.verdicts).length
    stats.pending += s.pitchIds.length - decided
  }
  return stats
}

function sessionHasPending(session: Session): boolean {
  return session.pitchIds.some(id => !session.verdicts[id])
}

export function HomeScreen({ sessions, onSelectSession, onStartSession, activeSessionId }: Props) {
  const [pitches, setPitches] = useState<PitchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo) {
      setPitches(DEMO_PITCHES)
      setLoading(false)
      return
    }
    fetchPitches()
      .then(setPitches)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isDemo) return
    setStatsLoading(true)
    fetchStats()
      .then(setBackendStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const displaySessions = isDemo ? DEMO_SESSIONS : sessions
  const localStats = isDemo ? DEMO_STATS : computeStats(sessions)
  const stats = backendStats ?? localStats
  const activeSession = displaySessions.find(s => s.id === activeSessionId)
  const hasPending = activeSession ? sessionHasPending(activeSession) : false
  const canStartNew = !isDemo && pitches.length > 0

  const handleCTA = () => {
    if (isDemo) {
      onSelectSession(DEMO_SESSIONS[0]?.id ?? '')
      return
    }
    if (hasPending && activeSession) {
      onSelectSession(activeSession.id)
    } else {
      onStartSession(pitches)
    }
  }

  const pillForVerdict = (v: string) => {
    if (v === 'approve') return <span key={v} className="pill approved">Approved</span>
    if (v === 'vault') return <span key={v} className="pill vaulted">Vaulted</span>
    if (v === 'reject') return <span key={v} className="pill rejected">Rejected</span>
    return null
  }

  const sessionSummary = (s: Session) => {
    const approved = Object.values(s.verdicts).filter(v => v === 'approve').length
    const vaulted = Object.values(s.verdicts).filter(v => v === 'vault').length
    const rejected = Object.values(s.verdicts).filter(v => v === 'reject').length
    const pending = s.pitchIds.length - Object.keys(s.verdicts).length
    const pills: JSX.Element[] = []
    if (approved > 0) pills.push(<span key="a" className="pill approved">{approved} approved</span>)
    if (vaulted > 0) pills.push(<span key="v" className="pill vaulted">{vaulted} vaulted</span>)
    if (rejected > 0) pills.push(<span key="r" className="pill rejected">{rejected} rejected</span>)
    if (pending > 0) pills.push(<span key="p" className="pill pending">{pending} pending</span>)
    return pills
  }

  const statNum = (n: number) => statsLoading ? '—' : n

  return (
    <div className="screen">
      <div className="home-header">
        <img
          className="home-logo"
          src="https://static1.squarespace.com/static/59888a11a5790a7d30e531f7/t/59888ecbe58c62df095c1ee2/1502121676336/LOGOSOLO.png?format=1500w"
          alt="Lemon Studios"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="home-title">Lemon Pitch Session</span>
        <span className="home-pitchai">Pitch AI</span>
      </div>

      <div className="stats-strip">
        <div className="stat-cell approved">
          <div className="stat-number">{statNum(stats.approved)}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-cell vaulted">
          <div className="stat-number">{statNum(stats.vaulted)}</div>
          <div className="stat-label">Vaulted</div>
        </div>
        <div className="stat-cell rejected">
          <div className="stat-number">{statNum(stats.rejected)}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-cell pending">
          <div className="stat-number">{statNum(stats.pending)}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="scroll-area">
        {displaySessions.length > 0 && (
          <>
            <div className="section-label">Sessions</div>
            {displaySessions.map(s => {
              const verdictSet = new Set<string>(Object.values(s.verdicts).filter(Boolean) as string[])
              const pillEls = isDemo
                ? Array.from(verdictSet).map(v => pillForVerdict(v))
                : sessionSummary(s)

              return (
                <div
                  key={s.id}
                  className="session-card"
                  onClick={() => onSelectSession(s.id)}
                >
                  <div className="session-card-name">{s.name}</div>
                  <div className="session-card-pills">{pillEls}</div>
                </div>
              )
            })}
          </>
        )}

        {loading && (
          <div className="empty-state">Loading pitches…</div>
        )}

        {!loading && displaySessions.length === 0 && (
          <div className="empty-state">No sessions yet. Start your first session.</div>
        )}
      </div>

      <button
        className="cta-btn"
        onClick={handleCTA}
        disabled={!isDemo && loading}
      >
        {isDemo
          ? '▶ Demo Session'
          : hasPending
            ? '▶ Continue Session'
            : canStartNew
              ? '▶ Start New Session'
              : loading
                ? 'Loading…'
                : '▶ Start New Session'}
      </button>
    </div>
  )
}
