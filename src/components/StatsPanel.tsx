import { useState } from 'react'
import type { PitchSummary, Session, VerdictStatus } from '../types'

interface Props {
  session: Session | null
  pitches: PitchSummary[]
}

function verdictClass(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'approved'
  if (v === 'vault') return 'vaulted'
  if (v === 'reject') return 'rejected'
  return 'pending'
}

function verdictLabel(v: VerdictStatus | undefined): string {
  if (v === 'approve') return 'APPROVED'
  if (v === 'vault') return 'VAULT'
  if (v === 'reject') return 'REJECTED'
  return 'PENDING'
}

export function StatsPanel({ session, pitches }: Props) {
  const [exportToast, setExportToast] = useState('')
  const verdicts = session?.verdicts ?? {}

  const approved = pitches.filter(p => (verdicts[p.projectId] ?? p.verdictStatus) === 'approve').length
  const vaulted  = pitches.filter(p => (verdicts[p.projectId] ?? p.verdictStatus) === 'vault').length
  const rejected = pitches.filter(p => (verdicts[p.projectId] ?? p.verdictStatus) === 'reject').length
  const pending  = pitches.filter(p => !(verdicts[p.projectId] ?? p.verdictStatus)).length
  const decided  = approved + vaulted + rejected
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0

  const decidedPitches = pitches
    .filter(p => !!(verdicts[p.projectId] ?? p.verdictStatus))
    .slice(-10)
    .reverse()

  const handleExport = () => {
    const sessionName = session?.name ?? 'Session'
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const byVerdict = (v: string) => pitches.filter(p => (verdicts[p.projectId] ?? p.verdictStatus) === v)
    const pendingPitches = pitches.filter(p => !(verdicts[p.projectId] ?? p.verdictStatus))

    const lines: string[] = [
      `# Session Summary — ${sessionName} · ${date}`,
      '',
      `## Approved (${byVerdict('approve').length})`,
      ...byVerdict('approve').map(p => `- **${p.title}**`),
      '',
      `## Vault (${byVerdict('vault').length})`,
      ...byVerdict('vault').map(p => `- **${p.title}**`),
      '',
      `## Rejected (${byVerdict('reject').length})`,
      ...byVerdict('reject').map(p => `- ${p.title}`),
      '',
      `## Pending (${pendingPitches.length})`,
      ...pendingPitches.map(p => `- ${p.title}`),
    ]

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setExportToast('Copied to clipboard')
      setTimeout(() => setExportToast(''), 2500)
    }).catch(() => {
      setExportToast('Copy failed')
      setTimeout(() => setExportToast(''), 2500)
    })
  }

  return (
    <div className="stats-panel">
      <div className="stats-panel-header">
        <span className="stats-panel-title">Session Intel</span>
      </div>

      <div className="stats-panel-section">
        <div className="stats-panel-section-label">Stats</div>
        <div className="stats-panel-stat-grid">
          <div className="stats-panel-stat approved">
            <div className="stats-panel-stat-num">{approved}</div>
            <div className="stats-panel-stat-key">Approved</div>
          </div>
          <div className="stats-panel-stat vaulted">
            <div className="stats-panel-stat-num">{vaulted}</div>
            <div className="stats-panel-stat-key">Vault</div>
          </div>
          <div className="stats-panel-stat rejected">
            <div className="stats-panel-stat-num">{rejected}</div>
            <div className="stats-panel-stat-key">Rejected</div>
          </div>
          <div className="stats-panel-stat pending-stat">
            <div className="stats-panel-stat-num">{pending}</div>
            <div className="stats-panel-stat-key">Pending</div>
          </div>
        </div>
      </div>

      <div className="stats-panel-section">
        <div className="stats-panel-rate-row">
          <span className="stats-panel-section-label">Approval Rate</span>
          <span className="stats-panel-rate-pct">{approvalRate}%</span>
        </div>
        <div className="approval-bar">
          <div className="approval-bar-fill" style={{ width: `${approvalRate}%` }} />
        </div>
        <div className="stats-panel-rate-sub">{approved} of {decided} decided</div>
      </div>

      <div className="stats-panel-section stats-panel-history">
        <div className="stats-panel-section-label">Recent Decisions</div>
        <div className="decision-history-list">
          {decidedPitches.length === 0 && (
            <div className="decision-history-empty">No decisions yet</div>
          )}
          {decidedPitches.map(p => {
            const v = verdicts[p.projectId] ?? p.verdictStatus
            const note = localStorage.getItem(`pitch-note-${p.projectId}`)
            return (
              <div key={p.projectId} className="decision-history-row">
                <div className="decision-history-info">
                  <span className="decision-history-title">{p.title}</span>
                  {note && (
                    <div className="decision-history-note">
                      {note.length > 50 ? note.slice(0, 50) + '…' : note}
                    </div>
                  )}
                </div>
                <span className={`pill ${verdictClass(v)}`}>{verdictLabel(v)}</span>
              </div>
            )
          })}
        </div>
        <button className="export-btn" onClick={handleExport}>Export Summary</button>
        {exportToast && <div className="export-toast">{exportToast}</div>}
      </div>

      <div className="kbd-shortcuts">
        <div className="stats-panel-section-label">Keyboard</div>
        <div className="kbd-shortcut"><kbd>Space</kbd><span>Play / Pause</span></div>
        <div className="kbd-shortcut"><kbd>A</kbd><span>Approve</span></div>
        <div className="kbd-shortcut"><kbd>V</kbd><span>Vault</span></div>
        <div className="kbd-shortcut"><kbd>R</kbd><span>Reject</span></div>
        <div className="kbd-shortcut"><kbd>← →</kbd><span>Prev / Next</span></div>
      </div>
    </div>
  )
}
