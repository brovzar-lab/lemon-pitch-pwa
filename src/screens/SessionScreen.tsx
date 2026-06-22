import { useEffect, useState } from 'react'
import type { PitchSummary, Session } from '../types'
import { fetchPitches, isDemo } from '../api'
import { DEMO_PITCHES, DEMO_SESSIONS } from '../demo'

type FilterTab = 'all' | 'pending' | 'verdicted'

interface Props {
  sessionId: string
  sessions: Session[]
  onBack: () => void
  onSelectPitch: (projectId: string) => void
  onPitchesLoaded?: (pitches: PitchSummary[]) => void
}

function verdictClass(v: string | null | undefined): string {
  if (v === 'approve') return 'approved'
  if (v === 'vault') return 'vaulted'
  if (v === 'reject') return 'rejected'
  return 'pending'
}

function verdictLabel(v: string | null | undefined): string {
  if (v === 'approve') return 'Approved'
  if (v === 'vault') return 'Vaulted'
  if (v === 'reject') return 'Rejected'
  return 'Pending'
}

export function SessionScreen({ sessionId, sessions, onBack, onSelectPitch, onPitchesLoaded }: Props) {
  const [pitches, setPitches] = useState<PitchSummary[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')

  const session = isDemo
    ? DEMO_SESSIONS.find(s => s.id === sessionId)
    : sessions.find(s => s.id === sessionId)

  useEffect(() => {
    if (isDemo) {
      setPitches(DEMO_PITCHES)
      onPitchesLoaded?.(DEMO_PITCHES)
      return
    }
    if (!session) return
    fetchPitches()
      .then(all => {
        const inSession = all.filter(p => session.pitchIds.includes(p.projectId))
        setPitches(inSession)
        onPitchesLoaded?.(inSession)
      })
      .catch(() => {})
  }, [sessionId, session]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back-btn" onClick={onBack}>‹</button>
          <span className="topbar-title">Session not found</span>
        </div>
      </div>
    )
  }

  const enriched = pitches.map(p => ({
    ...p,
    verdict: session.verdicts[p.projectId] ?? p.verdictStatus,
  }))

  const total = enriched.length
  const verdicted = enriched.filter(p => p.verdict).length
  const pendingCount = total - verdicted

  const filtered = enriched.filter(p => {
    if (filter === 'pending') return !p.verdict
    if (filter === 'verdicted') return !!p.verdict
    return true
  })

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="topbar-title" style={{ fontSize: 13 }}>{session.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {total} pitches · {verdicted} verdicted
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        {(['all', 'pending', 'verdicted'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' && `All (${total})`}
            {tab === 'pending' && `Pending (${pendingCount})`}
            {tab === 'verdicted' && `Verdicted (${verdicted})`}
          </button>
        ))}
      </div>

      <div className="scroll-area">
        {filtered.length === 0 && (
          <div className="empty-state">No pitches in this view.</div>
        )}
        {filtered.map(p => (
          <div
            key={p.projectId}
            className="pitch-row"
            onClick={() => onSelectPitch(p.projectId)}
          >
            <span className="pitch-number">{p.pitchNumber}</span>
            <div className="pitch-info">
              <div className="pitch-title">{p.title}</div>
              <div className="pitch-format">{p.format}</div>
            </div>
            <span className={`pill ${verdictClass(p.verdict)}`}>
              {verdictLabel(p.verdict)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
