import { useState } from 'react'
import type { VerdictStatus } from '../types'
import { isDemo } from '../api'

interface Props {
  verdict: VerdictStatus
  submitting: boolean
  onSubmit: (v: Exclude<VerdictStatus, null>) => void
}

const VERDICTS: { key: Exclude<VerdictStatus, null>; label: string; cls: string }[] = [
  { key: 'approve', label: 'Approve', cls: 'approve' },
  { key: 'vault', label: 'Vault', cls: 'vault' },
  { key: 'reject', label: 'Reject', cls: 'reject' },
]

export function VerdictStrip({ verdict, submitting, onSubmit }: Props) {
  const [pending, setPending] = useState<Exclude<VerdictStatus, null> | null>(null)

  if (verdict) {
    const info = VERDICTS.find(v => v.key === verdict)
    return (
      <div className="verdict-strip">
        <div className="verdict-done">
          <span className={`pill ${verdict === 'approve' ? 'approved' : verdict === 'vault' ? 'vaulted' : 'rejected'}`}>
            {verdict === 'approve' ? 'Approved' : verdict === 'vault' ? 'Vaulted' : 'Rejected'}
          </span>
        </div>
        {info && <span style={{ display: 'none' }}>{info.label}</span>}
      </div>
    )
  }

  return (
    <>
      <div className="verdict-strip">
        {VERDICTS.map(v => (
          <button
            key={v.key}
            className={`verdict-btn ${v.cls}`}
            disabled={submitting}
            onClick={() => setPending(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {pending && (
        <div className="dialog-overlay" onClick={() => setPending(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-title">
              {pending === 'approve' ? 'Approve this pitch?' : pending === 'vault' ? 'Vault this pitch?' : 'Reject this pitch?'}
            </div>
            <div className="dialog-body">
              {pending === 'approve' && 'Move to active development.'}
              {pending === 'vault' && 'Hold for future consideration.'}
              {pending === 'reject' && 'Remove from the queue.'}
              {isDemo && ' (Demo mode — not saved)'}
            </div>
            <div className="dialog-actions">
              <button
                className={`dialog-confirm ${pending}`}
                onClick={() => {
                  onSubmit(pending)
                  setPending(null)
                }}
              >
                {pending === 'approve' ? 'Approve' : pending === 'vault' ? 'Vault' : 'Reject'}
              </button>
              <button className="dialog-cancel" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
