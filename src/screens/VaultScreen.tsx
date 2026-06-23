import { useEffect, useState } from 'react'
import type { PitchSummary } from '../types'
import { fetchRoster, isDemo } from '../api'
import { DEMO_PITCHES } from '../demo'

interface Props {
  onBack: () => void
}

export function VaultScreen({ onBack }: Props) {
  const [pitches, setPitches] = useState<PitchSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setPitches(DEMO_PITCHES.filter(p => p.devStage === 'vaulted'))
      setLoading(false)
      return
    }
    fetchRoster()
      .then(all => setPitches(all.filter(p => p.devStage === 'vaulted')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="screen vault-screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span className="topbar-title">Vault</span>
        {!loading && <span className="pitch-position">{pitches.length} pitches</span>}
      </div>
      <div className="scroll-area">
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && pitches.length === 0 && (
          <div className="empty-state">No vault pitches</div>
        )}
        {pitches.map(p => (
          <div key={p.projectId} className="vault-row">
            <span className="vault-num">{p.pitchNumber}</span>
            <div className="vault-info">
              <div className="vault-title">{p.title}</div>
              <div className="vault-meta">
                {p.format}{p.genre ? ` · ${p.genre}` : ''}
              </div>
            </div>
            <span className="pill vaulted">Vault</span>
          </div>
        ))}
      </div>
    </div>
  )
}
