export type VerdictStatus = 'approve' | 'vault' | 'reject' | null

export interface PitchSummary {
  pitchNumber: number
  title: string
  format: string
  genre?: string
  projectId: string
  hasSpeech: boolean
  verdictStatus: VerdictStatus
  devStage: string | null
}

export interface PitchDetail extends PitchSummary {
  cleanScript: string
  logline: string
  platform: string
  genre: string
}

export interface Session {
  id: string
  name: string
  createdAt: string
  pitchIds: string[]
  verdicts: Record<string, VerdictStatus>
}

export interface AllTimeStats {
  approved: number
  vaulted: number
  rejected: number
  pending: number
}

export interface Voice {
  id: string
  name: string
  description: string
  preview_url: string | null
}

export interface BackendStats {
  total: number
  approved: number
  vaulted: number
  rejected: number
  pending: number
  decided: number
}

export type Screen =
  | { name: 'home' }
  | { name: 'session'; sessionId: string }
  | { name: 'pitch'; sessionId: string; projectId: string }
