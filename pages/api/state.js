import { kv } from '@vercel/kv'

const DEFAULT_STATE = {
  phase: 'setup',
  players: [],
  teams: [],
  bracket: { semifinals: [], finals: [] },
  activeGameId: null,
  championTeamId: null
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const state = await kv.get('tournament') || DEFAULT_STATE
    return res.status(200).json(state)
  }
  res.status(405).end()
}
