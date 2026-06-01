import { Redis } from '@upstash/redis'
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const history = await kv.get('tournament:history') || []
    return res.status(200).json(history)
  }
  res.status(405).end()
}
