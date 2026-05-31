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

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function buildBracket(teams) {
  const bracket = { semifinals: [], finals: [] }

  if (teams.length === 4) {
    bracket.semifinals = [
      makeGame('sf-1', 'semifinal', teams[0].id, teams[1].id),
      makeGame('sf-2', 'semifinal', teams[2].id, teams[3].id)
    ]
  } else if (teams.length === 3) {
    bracket.semifinals = [
      makeGame('sf-1', 'semifinal', teams[0].id, teams[1].id)
    ]
    // Team 3 has a bye — stored as byeTeamId
    bracket.byeTeamId = teams[2].id
  } else if (teams.length === 2) {
    bracket.semifinals = []
    bracket.finals = [makeGame('f-1', 'final', teams[0].id, teams[1].id, 1)]
  }

  return bracket
}

function makeGame(id, round, team1Id, team2Id, gameNumber = 1) {
  return {
    id,
    round,
    gameNumber,
    team1Id,
    team2Id,
    team1Score: 0,
    team2Score: 0,
    winnerId: null,
    log: [],
    status: 'pending'
  }
}

function advanceBracket(state) {
  const { bracket, teams } = state

  // Check if all semifinals are done
  const sfsComplete = bracket.semifinals.every(g => g.status === 'complete')

  if (sfsComplete && bracket.finals.length === 0) {
    let t1, t2
    if (bracket.semifinals.length === 2) {
      t1 = bracket.semifinals[0].winnerId
      t2 = bracket.semifinals[1].winnerId
    } else if (bracket.semifinals.length === 1) {
      t1 = bracket.semifinals[0].winnerId
      t2 = bracket.byeTeamId
    }
    if (t1 && t2) {
      bracket.finals = [makeGame('f-1', 'final', t1, t2, 1)]
    }
  }

  // Check finals (best of 3)
  const finalWins = { [bracket.finals[0]?.team1Id]: 0, [bracket.finals[0]?.team2Id]: 0 }
  bracket.finals.forEach(g => {
    if (g.winnerId) finalWins[g.winnerId] = (finalWins[g.winnerId] || 0) + 1
  })

  const finalsTeams = bracket.finals[0] ? [bracket.finals[0].team1Id, bracket.finals[0].team2Id] : []
  const champion = finalsTeams.find(tid => finalWins[tid] >= 2)

  if (champion) {
    state.phase = 'complete'
    state.championTeamId = champion
    state.activeGameId = null
  } else if (sfsComplete && bracket.finals.length > 0) {
    // Check if we need a next finals game
    const lastFinal = bracket.finals[bracket.finals.length - 1]
    if (lastFinal.status === 'complete' && !champion) {
      const nextNum = lastFinal.gameNumber + 1
      if (nextNum <= 3) {
        bracket.finals.push(makeGame(`f-${nextNum}`, 'final', lastFinal.team1Id, lastFinal.team2Id, nextNum))
      }
    }
  }

  return state
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, payload } = req.body
  let state = await kv.get('tournament') || { ...DEFAULT_STATE }

  switch (type) {
    case 'ADD_PLAYER': {
      const { name } = payload
      if (!name?.trim()) break
      state.players.push({ id: uid(), name: name.trim(), teamId: null })
      break
    }

    case 'REMOVE_PLAYER': {
      const { playerId } = payload
      state.players = state.players.filter(p => p.id !== playerId)
      // Remove from team
      state.teams = state.teams.map(t => ({
        ...t,
        playerIds: t.playerIds.filter(id => id !== playerId)
      }))
      break
    }

    case 'ADD_TEAM': {
      const { name } = payload
      state.teams.push({ id: uid(), name, playerIds: [] })
      break
    }

    case 'REMOVE_TEAM': {
      const { teamId } = payload
      state.players = state.players.map(p =>
        p.teamId === teamId ? { ...p, teamId: null } : p
      )
      state.teams = state.teams.filter(t => t.id !== teamId)
      break
    }

    case 'RENAME_TEAM': {
      const { teamId, name } = payload
      state.teams = state.teams.map(t => t.id === teamId ? { ...t, name } : t)
      break
    }

    case 'ASSIGN_PLAYER': {
      const { playerId, teamId } = payload
      // Remove from old team
      state.teams = state.teams.map(t => ({
        ...t,
        playerIds: t.playerIds.filter(id => id !== playerId)
      }))
      // Add to new team or unassign
      state.players = state.players.map(p =>
        p.id === playerId ? { ...p, teamId } : p
      )
      if (teamId) {
        state.teams = state.teams.map(t =>
          t.id === teamId && !t.playerIds.includes(playerId)
            ? { ...t, playerIds: [...t.playerIds, playerId] }
            : t
        )
      }
      break
    }

    case 'START_TOURNAMENT': {
      const readyTeams = state.teams.filter(t => t.playerIds.length > 0)
      if (readyTeams.length < 2) break
      state.bracket = buildBracket(readyTeams)
      state.phase = 'bracket'
      // Set first game as active
      const firstGame = state.bracket.semifinals[0] || state.bracket.finals[0]
      if (firstGame) {
        firstGame.status = 'active'
        state.activeGameId = firstGame.id
      }
      break
    }

    case 'SET_ACTIVE_GAME': {
      const { gameId } = payload
      state.activeGameId = gameId
      // Mark game active
      ;[...state.bracket.semifinals, ...state.bracket.finals].forEach(g => {
        if (g.id === gameId) g.status = 'active'
      })
      break
    }

    case 'ADD_SCORE': {
      const { gameId, teamSlot, points } = payload // teamSlot: 'team1' | 'team2'
      const allGames = [...state.bracket.semifinals, ...state.bracket.finals]
      const game = allGames.find(g => g.id === gameId)
      if (!game || game.status !== 'active') break

      const scoreKey = `${teamSlot}Score`
      game[scoreKey] = Math.max(0, game[scoreKey] + points)
      const teamId = game[`${teamSlot}Id`]
      const team = state.teams.find(t => t.id === teamId)
      game.log.push({
        teamName: team?.name || teamSlot,
        points,
        score1: game.team1Score,
        score2: game.team2Score,
        ts: Date.now()
      })

      // Auto-complete when a team reaches 21
      if (game.team1Score >= 21 || game.team2Score >= 21) {
        game.winnerId = game.team1Score >= 21 ? game.team1Id : game.team2Id
        game.status = 'complete'
        state = advanceBracket(state)
        // Set next pending game as active
        const next = [...state.bracket.semifinals, ...state.bracket.finals].find(g => g.status === 'pending')
        if (next) {
          next.status = 'active'
          state.activeGameId = next.id
        } else if (state.phase !== 'complete') {
          state.activeGameId = null
        }
      }
      break
    }

    case 'UNDO_SCORE': {
      const { gameId } = payload
      const allGames = [...state.bracket.semifinals, ...state.bracket.finals]
      const game = allGames.find(g => g.id === gameId)
      if (!game || game.log.length === 0) break
      game.log.pop()
      // Recalculate scores from remaining log
      const t1Name = state.teams.find(t => t.id === game.team1Id)?.name
      game.team1Score = 0
      game.team2Score = 0
      game.log.forEach(entry => {
        if (entry.teamName === t1Name) game.team1Score += entry.points
        else game.team2Score += entry.points
      })
      game.team1Score = Math.max(0, game.team1Score)
      game.team2Score = Math.max(0, game.team2Score)
      break
    }

    case 'DECLARE_WINNER': {
      const { gameId, winnerId } = payload
      const allGames = [...state.bracket.semifinals, ...state.bracket.finals]
      const game = allGames.find(g => g.id === gameId)
      if (!game) break
      game.winnerId = winnerId
      game.status = 'complete'
      state = advanceBracket(state)
      const next = [...state.bracket.semifinals, ...state.bracket.finals].find(g => g.status === 'pending')
      if (next) {
        next.status = 'active'
        state.activeGameId = next.id
      }
      break
    }

    case 'RESET': {
      state = { ...DEFAULT_STATE }
      break
    }
  }

  await kv.set('tournament', state)
  return res.status(200).json(state)
}
