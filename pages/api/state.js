import { Redis } from '@upstash/redis'
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

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
