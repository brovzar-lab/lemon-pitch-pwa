import type { PitchSummary } from '../types'

const STAGE_CLASS: Record<string, string> = {
  intake:      'stage-intake',
  evaluation:  'stage-evaluation',
  development: 'stage-development',
  packaging:   'stage-packaging',
  greenlit:    'stage-greenlit',
  killed:      'stage-killed',
  vaulted:     'stage-vaulted',
}

interface Props {
  roster:         PitchSummary[]
  loading:        boolean
  formatFilter:   'ALL' | 'FILM' | 'SERIES'
  onFilterChange: (f: 'ALL' | 'FILM' | 'SERIES') => void
  search:         string
  onSearchChange: (s: string) => void
}

export function PitchRoster({ roster, loading, formatFilter, onFilterChange, search, onSearchChange }: Props) {
  return (
    <div className="pitch-roster">
      <div className="roster-controls">
        <div className="roster-filters">
          {(['ALL', 'FILM', 'SERIES'] as const).map(f => (
            <button
              key={f}
              className={`roster-filter-btn${formatFilter === f ? ' active' : ''}`}
              onClick={() => onFilterChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          className="roster-search"
          type="text"
          placeholder="Search pitches…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="roster-table">
        <div className="roster-header-row">
          <span>#</span>
          <span>TITLE</span>
          <span>FORMAT</span>
          <span>STAGE</span>
          <span>AUDIO</span>
          <span>VERDICT</span>
        </div>

        {loading && <div className="roster-empty">Loading roster…</div>}
        {!loading && roster.length === 0 && <div className="roster-empty">No pitches match filter</div>}

        {roster.map(p => {
          const stage = p.devStage ?? 'pitch'
          const decided = ['development','killed','vaulted','passed','greenlit','packaging'].includes(stage)
          return (
            <div key={p.projectId} className={`roster-row${decided ? '' : ' pending'}`}>
              <span className="roster-num">{p.pitchNumber}</span>
              <span className="roster-title">{p.title}</span>
              <span className="roster-format">{p.format}</span>
              <span className={`roster-stage ${STAGE_CLASS[stage] ?? 'stage-pitch'}`}>{stage}</span>
              <span className="roster-audio">{p.hasSpeech ? <span className="audio-ready">♪</span> : null}</span>
              <span className="roster-verdict">
                {p.verdictStatus === 'approve' && <span className="pill approved">✓</span>}
                {p.verdictStatus === 'vault'   && <span className="pill vaulted">V</span>}
                {p.verdictStatus === 'reject'  && <span className="pill rejected">✗</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
