import { useEffect, useState } from 'react'
import type { PitchSummary, Session, AllTimeStats, BackendStats } from '../types'
import { fetchPitches, fetchRoster, fetchStats, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_SESSIONS, DEMO_STATS } from '../demo'
import { PitchRoster } from '../components/PitchRoster'

const DECIDED_STAGES = new Set(['development','killed','vaulted','passed','greenlit','packaging'])
const STAGE_ORDER = ['pitch','intake','evaluation','development','packaging','greenlit','killed','vaulted']

interface Props {
  sessions:        Session[]
  onSelectSession: (id: string) => void
  onStartSession:  (pitches: PitchSummary[]) => void
  activeSessionId: string | null
  syncing:         boolean
  onSync:          () => Promise<{ synced: string; pitches: PitchSummary[] } | null>
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

function sessionHasPending(s: Session): boolean {
  return s.pitchIds.some(id => !s.verdicts[id])
}

export function HomeScreen({ sessions, onSelectSession, onStartSession, activeSessionId, syncing, onSync }: Props) {
  const [pitches, setPitches]         = useState<PitchSummary[]>([])
  const [loading, setLoading]         = useState(true)
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(!isDemo)
  const [roster, setRoster]           = useState<PitchSummary[]>([])
  const [rosterLoading, setRosterLoading] = useState(!isDemo)
  const [lastSynced, setLastSynced]   = useState<Date | null>(null)
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'FILM' | 'SERIES'>('ALL')
  const [search, setSearch]           = useState('')
  const [syncMsg, setSyncMsg]         = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) { setPitches(DEMO_PITCHES); setLoading(false); return }
    fetchPitches().then(setPitches).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isDemo) return
    setStatsLoading(true)
    fetchStats().then(setBackendStats).catch(() => {}).finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    if (isDemo) { setRoster(DEMO_PITCHES); setRosterLoading(false); return }
    fetchRoster().then(r => { setRoster(r); setRosterLoading(false) }).catch(() => setRosterLoading(false))
  }, [])

  const displaySessions = isDemo ? DEMO_SESSIONS : sessions
  const localStats      = isDemo ? DEMO_STATS : computeStats(sessions)
  const stats           = backendStats ?? localStats
  const activeSession   = displaySessions.find(s => s.id === activeSessionId)
  const hasPending      = activeSession ? sessionHasPending(activeSession) : false

  const total       = roster.length
  const pendingCount = roster.filter(p => !DECIDED_STAGES.has(p.devStage ?? '')).length
  const decided     = total - pendingCount
  const approveRate = decided > 0
    ? Math.round((roster.filter(p => p.verdictStatus === 'approve').length / decided) * 100)
    : 0
  const stageCounts: Record<string, number> = {}
  for (const p of roster) { const s = p.devStage ?? 'pitch'; stageCounts[s] = (stageCounts[s] ?? 0) + 1 }

  const mins = lastSynced ? Math.floor((Date.now() - lastSynced.getTime()) / 60000) : -1
  const syncedLabel = !lastSynced ? '' : mins < 1 ? 'Just now' : `${mins}m ago`

  const filtered = roster
    .filter(p => formatFilter === 'ALL' || p.format === formatFilter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.receivedAt && b.receivedAt) {
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      }
      return b.pitchNumber - a.pitchNumber
    })

  const handleCTA = () => {
    if (isDemo) { onSelectSession(DEMO_SESSIONS[0]?.id ?? ''); return }
    if (hasPending && activeSession) onSelectSession(activeSession.id)
    else onStartSession(pitches)
  }

  const handleSync = async () => {
    if (isDemo) {
      setSyncMsg('Demo mode — sync not available')
      setTimeout(() => setSyncMsg(null), 3000)
      return
    }
    const result = await onSync()
    if (result) {
      setRoster(result.pitches)
      setLastSynced(new Date())
      setPitches(result.pitches.filter(p => !DECIDED_STAGES.has(p.devStage ?? '')))
    }
  }

  const pillForVerdict = (v: string) => {
    if (v === 'approve') return <span key={v} className="pill approved">Approved</span>
    if (v === 'vault')   return <span key={v} className="pill vaulted">Vault</span>
    if (v === 'reject')  return <span key={v} className="pill rejected">Rejected</span>
    return null
  }

  const sessionSummary = (s: Session) => {
    const ap = Object.values(s.verdicts).filter(v => v === 'approve').length
    const vt = Object.values(s.verdicts).filter(v => v === 'vault').length
    const rj = Object.values(s.verdicts).filter(v => v === 'reject').length
    const pe = s.pitchIds.length - Object.keys(s.verdicts).length
    const pills: JSX.Element[] = []
    if (ap > 0) pills.push(<span key="a" className="pill approved">{ap} approved</span>)
    if (vt > 0) pills.push(<span key="v" className="pill vaulted">{vt} vault</span>)
    if (rj > 0) pills.push(<span key="r" className="pill rejected">{rj} rejected</span>)
    if (pe > 0) pills.push(<span key="p" className="pill pending">{pe} pending</span>)
    return pills
  }

  const statNum = (n: number) => statsLoading ? '—' : n

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="home-screen-mobile">
        <div className="home-header">
          <img
            className="home-logo"
            src="https://static1.squarespace.com/static/59888a11a5790a7d30e531f7/t/59888ecbe58c62df095c1ee2/1502121676336/LOGOSOLO.png?format=1500w"
            alt="Lemon Studios"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="home-title">Lemon Pitch Session</span>
          <span className="home-pitchai">Terminal</span>
        </div>

        <div className="stats-strip">
          <div className="stat-cell approved"><div className="stat-number">{statNum(stats.approved)}</div><div className="stat-label">Approved</div></div>
          <div className="stat-cell vaulted"><div className="stat-number">{statNum(stats.vaulted)}</div><div className="stat-label">Vault</div></div>
          <div className="stat-cell rejected"><div className="stat-number">{statNum(stats.rejected)}</div><div className="stat-label">Rejected</div></div>
          <div className="stat-cell pending"><div className="stat-number">{statNum(stats.pending)}</div><div className="stat-label">Pending</div></div>
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
                  <div key={s.id} className="session-card" onClick={() => onSelectSession(s.id)}>
                    <div className="session-card-name">{s.name}</div>
                    <div className="session-card-pills">{pillEls}</div>
                  </div>
                )
              })}
            </>
          )}
          {loading && <div className="empty-state">Initializing…</div>}
          {!loading && displaySessions.length === 0 && (
            <div className="empty-state">No sessions yet. Start your first session.</div>
          )}
        </div>

        <button className="cta-btn" onClick={handleCTA} disabled={!isDemo && loading}>
          <span>
            {isDemo ? '▶ Demo Session'
              : hasPending ? '▶ Continue Session'
              : loading ? 'Initializing…'
              : '▶ Start New Session'}
          </span>
        </button>
      </div>

      {/* ── Desktop: Pitch Intelligence Dashboard ── */}
      <div className="home-main-panel">
        <div className="home-dashboard">
          <div className="home-dashboard-header">
            <span className="home-dashboard-title">PITCH INTELLIGENCE TERMINAL</span>
            <div className="home-dashboard-actions">
              <button className="sync-btn" onClick={handleSync} disabled={syncing}>
                {syncing ? '↻ Syncing…' : '⟳ Sync Dev Gate'}
              </button>
              {syncMsg
                ? <span className="sync-message">{syncMsg}</span>
                : syncedLabel && <span className="last-synced">Synced {syncedLabel}</span>
              }
            </div>
          </div>

          <div className="pipeline-overview">
            <div className="pipeline-stat"><div className="pipeline-num">{rosterLoading ? '—' : total}</div><div className="pipeline-label">TOTAL</div></div>
            <div className="pipeline-stat"><div className="pipeline-num">{rosterLoading ? '—' : pendingCount}</div><div className="pipeline-label">PENDING</div></div>
            <div className="pipeline-stat"><div className="pipeline-num">{rosterLoading ? '—' : decided}</div><div className="pipeline-label">DECIDED</div></div>
            <div className="pipeline-stat"><div className="pipeline-num">{rosterLoading ? '—' : `${approveRate}%`}</div><div className="pipeline-label">APPROVE RATE</div></div>
          </div>

          <div className="devgate-strip">
            <span className="devgate-label">DEV GATE</span>
            {STAGE_ORDER.filter(s => stageCounts[s] > 0).map(stage => (
              <span key={stage} className={`devgate-pill stage-${stage}`}>{stage} ({stageCounts[stage]})</span>
            ))}
          </div>

          <PitchRoster
            roster={filtered}
            loading={rosterLoading}
            formatFilter={formatFilter}
            onFilterChange={setFormatFilter}
            search={search}
            onSearchChange={setSearch}
          />

          <div className="home-dashboard-footer">
            <button className="cta-btn cta-btn--dashboard" onClick={handleCTA} disabled={!isDemo && loading}>
              ▶ Start Session with {pendingCount} Pending Pitches
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
