import type { PitchSummary, Session, VerdictStatus } from '../types'

interface Props {
  pitches: PitchSummary[]
  currentProjectId: string | null
  session: Session | null
  onSelectPitch: (projectId: string) => void
  onBackToSessions: () => void
}

function verdictClass(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'approved'
  if (v === 'vault') return 'vaulted'
  if (v === 'reject') return 'rejected'
  return 'pending'
}

function verdictLabel(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'OK'
  if (v === 'vault') return 'VLT'
  if (v === 'reject') return 'REJ'
  return '—'
}

export function PitchQueue({ pitches, currentProjectId, session, onSelectPitch, onBackToSessions }: Props) {
  const sorted = [...pitches].sort((a, b) => {
    const aVerdicted = !!(session?.verdicts[a.projectId] ?? a.verdictStatus)
    const bVerdicted = !!(session?.verdicts[b.projectId] ?? b.verdictStatus)
    if (aVerdicted !== bVerdicted) return aVerdicted ? 1 : -1
    return a.pitchNumber - b.pitchNumber
  })

  const total = pitches.length
  const pending = pitches.filter(p => !(session?.verdicts[p.projectId] ?? p.verdictStatus)).length
  const done = total - pending

  return (
    <div className="pitch-queue">
      <div className="pitch-queue-header">
        <button className="pitch-queue-back" onClick={onBackToSessions} aria-label="Back to sessions">‹</button>
        <div className="pitch-queue-session-name">{session?.name ?? 'Session'}</div>
      </div>

      <div className="pitch-queue-list">
        {sorted.map(p => {
          const verdict = session?.verdicts[p.projectId] ?? p.verdictStatus
          const isActive = p.projectId === currentProjectId
          return (
            <div
              key={p.projectId}
              className={`pitch-queue-row${isActive ? ' active' : ''}`}
              onClick={() => onSelectPitch(p.projectId)}
            >
              <span className="pitch-queue-num">{p.pitchNumber}</span>
              <div className="pitch-queue-info">
                <div className="pitch-queue-title">{p.title}</div>
                <div className="pitch-queue-format">{p.format}</div>
              </div>
              <span className={`pill ${verdictClass(verdict)}`}>{verdictLabel(verdict)}</span>
            </div>
          )
        })}
        {pitches.length === 0 && (
          <div className="pitch-queue-empty">No pitches</div>
        )}
      </div>

      <div className="pitch-queue-footer">
        <span>{total} total</span>
        <span className="pitch-queue-footer-sep">·</span>
        <span className="pitch-queue-footer-pending">{pending} pending</span>
        <span className="pitch-queue-footer-sep">·</span>
        <span>{done} done</span>
      </div>
    </div>
  )
}
