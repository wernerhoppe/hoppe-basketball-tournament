import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { playSwish, playSwish3, playThud, playBuzzer, playFanfare } from '../utils/sounds'
const TEAM_NAMES = [
  'The Stripling Warriors',
  'The Liahona Lakers',
  'Goliath Slayers',
  'The Iron Rod Ballers',
  'Zion Dunkers',
  'The Jericho Jammers',
  'Sons of Mosiah Magic',
  'The Promised Land Blazers',
  'Captain Moroni Mavericks',
  'The Title of Liberty Thunder'
]

export default function Admin() {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('setup')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const prevChampionRef = useRef(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/state')
        const data = await res.json()
        setState(data)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  const act = async (type, payload = {}) => {
    setLoading(true)
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      })
      const data = await res.json()
      if (!muted) {
        // Buzzer when a game just completed via reaching 21
        const allGames = [...(data.bracket.semifinals || []), ...(data.bracket.finals || [])]
        const prevAllGames = state ? [...(state.bracket.semifinals || []), ...(state.bracket.finals || [])] : []
        const justCompleted = allGames.find(g =>
          g.status === 'complete' &&
          prevAllGames.find(pg => pg.id === g.id && pg.status !== 'complete')
        )
        if (justCompleted) playBuzzer()
        // Fanfare when champion is newly crowned
        if (data.championTeamId && !prevChampionRef.current) {
          setTimeout(playFanfare, 600)
        }
      }
      prevChampionRef.current = data.championTeamId
      setState(data)
    } finally {
      setLoading(false)
    }
  }

  if (!state) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f1a' }}>
      <div style={{ color: '#c8a96e', fontFamily: 'Oswald, sans-serif', fontSize: '1.5rem' }}>Loading...</div>
    </div>
  )

  const prizePool = state.players.length * 2
  const unassignedPlayers = state.players.filter(p => !p.teamId)

  return (
    <>
      <Head>
        <title>Admin – Hoppe Tournament</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="header">
        <div className="header-top">
          <span className="espn-logo">ESPN</span>
          <span style={{ color: 'white', fontSize: '0.75rem', fontFamily: 'Roboto Condensed, sans-serif', letterSpacing: '0.1em', fontWeight: 700 }}>ADMIN CONTROL</span>
          <button
            onClick={() => setMuted(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px' }}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >{muted ? '🔇' : '🔊'}</button>
        </div>
        <div className="header-main">
          <h1>🏀 Hoppe Family Tournament</h1>
          <div className="prize-badge">Prize Pot: ${prizePool}</div>
        </div>
      </div>

      <div className="container">
        <div className="tabs mt-8">
          <button className={`tab${tab === 'setup' ? ' active' : ''}`} onClick={() => setTab('setup')}>SETUP</button>
          <button className={`tab${tab === 'score' ? ' active' : ''}`} onClick={() => setTab('score')}>SCORE</button>
          <button className={`tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>STATS</button>
          <button className={`tab${tab === 'bracket' ? ' active' : ''}`} onClick={() => setTab('bracket')}>BRACKET</button>
        </div>

        {tab === 'setup' && (
          <SetupTab
            state={state}
            act={act}
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            unassignedPlayers={unassignedPlayers}
            prizePool={prizePool}
            loading={loading}
          />
        )}

        {tab === 'score' && (
          <ScoreTab state={state} act={act} loading={loading} muted={muted} />
        )}

        {tab === 'stats' && <AdminStatsTab state={state} />}
        {tab === 'bracket' && (
          <BracketAdminTab state={state} act={act} loading={loading} />
        )}
      </div>
    </>
  )
}

// ─── SETUP TAB ───────────────────────────────────────────────────────────────

function SetupTab({ state, act, newPlayerName, setNewPlayerName, unassignedPlayers, prizePool, loading }) {
  const addPlayer = () => {
    if (!newPlayerName.trim()) return
    act('ADD_PLAYER', { name: newPlayerName.trim() })
    setNewPlayerName('')
  }

  const addTeam = () => act('ADD_TEAM', { name: TEAM_NAMES[state.teams.length % TEAM_NAMES.length] })

  const canStart = state.teams.filter(t => t.playerIds.length > 0).length >= 2

  return (
    <div>
      {/* Prize Pool */}
      <div className="card gold" style={{ textAlign: 'center' }}>
        <div className="oswald text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>PRIZE POOL</div>
        <div className="oswald text-gold" style={{ fontSize: '2.5rem' }}>${prizePool}</div>
        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{state.players.length} players × $2</div>
      </div>

      {/* Add players — always visible */}
      <div className="card">
        <div className="oswald mb-8" style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>ADD PLAYERS</div>
        <div className="row">
          <input
            className="input"
            placeholder="Player name..."
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
          />
          <button className="btn btn-primary" onClick={addPlayer} disabled={loading || !newPlayerName.trim()}>
            ADD
          </button>
        </div>

        {state.players.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {state.players.map(p => (
              <div key={p.id} className="player-pill">
                <span>{p.name}</span>
                {!p.teamId && <span className="text-orange" style={{ fontSize: '0.75rem' }}>unassigned</span>}
                <button
                  onClick={() => act('REMOVE_PLAYER', { playerId: p.id })}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 2px', fontSize: '0.9rem' }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teams — always visible, rename + move players works anytime */}
      <div className="row-between mb-8">
        <div className="oswald text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>TEAMS</div>
        <button className="btn btn-outline btn-sm" onClick={addTeam} disabled={loading}>+ ADD TEAM</button>
      </div>

      {state.teams.map(team => (
        <TeamBlock
          key={team.id}
          team={team}
          state={state}
          act={act}
          loading={loading}
          unassignedPlayers={unassignedPlayers}
        />
      ))}

      {state.teams.length === 0 && (
        <div className="text-muted text-center" style={{ padding: 24 }}>No teams yet. Add a team to get started.</div>
      )}

      <hr className="divider" />

      {state.phase === 'setup' ? (
        <button
          className="btn btn-primary btn-full"
          disabled={!canStart || loading}
          onClick={() => act('START_TOURNAMENT')}
        >
          {canStart ? '🏀 START TOURNAMENT' : 'Need at least 2 teams with players'}
        </button>
      ) : (
        <div className="card" style={{ border: '1px solid var(--red)', background: 'rgba(231,76,60,0.08)' }}>
          <div className="oswald text-muted mb-8" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>DANGER ZONE</div>
          <div className="text-muted mb-8" style={{ fontSize: '0.85rem' }}>This will erase all scores, games, and bracket progress.</div>
          <button
            className="btn btn-danger btn-full"
            onClick={() => { if (confirm('Reset everything? All scores and bracket progress will be lost.')) act('RESET') }}
            disabled={loading}
          >
            RESET TOURNAMENT
          </button>
        </div>
      )}
    </div>
  )
}

function TeamBlock({ team, state, act, loading, unassignedPlayers }) {
  const [teamName, setTeamName] = useState(team.name)
  const [showNamePicker, setShowNamePicker] = useState(false)
  const [assignPlayerId, setAssignPlayerId] = useState('')

  const saveName = () => {
    if (teamName.trim() !== team.name) {
      act('RENAME_TEAM', { teamId: team.id, name: teamName.trim() })
    }
  }

  const assignPlayer = () => {
    if (!assignPlayerId) return
    act('ASSIGN_PLAYER', { playerId: assignPlayerId, teamId: team.id })
    setAssignPlayerId('')
  }

  const allPlayers = state.players
  const teamPlayers = team.playerIds.map(pid => state.players.find(p => p.id === pid)).filter(Boolean)
  const movablePlayers = allPlayers.filter(p => p.id !== team.playerIds[0]) // can move any player

  return (
    <div className="team-block">
      <div className="team-header">
        <input
          className="team-name-input"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => e.key === 'Enter' && saveName()}
          style={{ flex: 1, marginRight: 8 }}
        />
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowNamePicker(!showNamePicker)}
          title="Pick team name"
          style={{ whiteSpace: 'nowrap' }}
        >
          📋
        </button>
        <button
          className="btn btn-danger btn-sm"
          style={{ marginLeft: 6 }}
          onClick={() => act('REMOVE_TEAM', { teamId: team.id })}
        >×</button>
      </div>

      {showNamePicker && (
        <div style={{ marginBottom: 10 }}>
          <div className="text-muted mb-8" style={{ fontSize: '0.75rem' }}>Pick a team name:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {TEAM_NAMES.map(name => (
              <button
                key={name}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => {
                  setTeamName(name)
                  act('RENAME_TEAM', { teamId: team.id, name })
                  setShowNamePicker(false)
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Players on team */}
      <div style={{ marginBottom: 10 }}>
        {teamPlayers.length === 0 && (
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>No players on this team</div>
        )}
        {teamPlayers.map(p => (
          <div key={p.id} className="row-between" style={{ padding: '4px 0' }}>
            <span className="player-pill" style={{ margin: 0 }}>{p.name}</span>
            <div className="row gap-8">
              {/* Move to different team */}
              <select
                className="select"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                value=""
                onChange={e => {
                  if (e.target.value) act('ASSIGN_PLAYER', { playerId: p.id, teamId: e.target.value || null })
                }}
              >
                <option value="">Move to...</option>
                {state.teams.filter(t => t.id !== team.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="__unassign">Unassign</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Add player to team */}
      {state.players.length > 0 && (
        <div className="row">
          <select
            className="select"
            value={assignPlayerId}
            onChange={e => setAssignPlayerId(e.target.value)}
          >
            <option value="">Add player to team...</option>
            {state.players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.teamId && p.teamId !== team.id ? ' (on other team)' : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={assignPlayer} disabled={!assignPlayerId || loading}>
            ADD
          </button>
        </div>
      )}
    </div>
  )
}

// ─── SCORE TAB ───────────────────────────────────────────────────────────────

function ScoreTab({ state, act, loading, muted }) {
  const allGames = [...(state.bracket.semifinals || []), ...(state.bracket.finals || [])]
  const activeGame = allGames.find(g => g.id === state.activeGameId)
  const [selectedGameId, setSelectedGameId] = useState(null)

  const displayGame = selectedGameId
    ? allGames.find(g => g.id === selectedGameId)
    : activeGame

  if (state.phase === 'setup') {
    return <div className="text-muted text-center" style={{ padding: 32 }}>Start the tournament first.</div>
  }

  if (state.phase === 'complete') {
    const champ = state.teams.find(t => t.id === state.championTeamId)
    return (
      <div className="card champion text-center" style={{ marginTop: 16 }}>
        <span className="trophy">🏆</span>
        <div className="champion-name">{champ?.name}</div>
        <div className="oswald text-gold" style={{ marginTop: 8 }}>TOURNAMENT COMPLETE</div>
      </div>
    )
  }

  return (
    <div>
      {/* Game selector */}
      <div className="card mb-8">
        <div className="oswald text-muted mb-8" style={{ fontSize: '0.75rem', letterSpacing: '0.15em' }}>SELECT GAME</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allGames.map(game => {
            const t1 = state.teams.find(t => t.id === game.team1Id)
            const t2 = state.teams.find(t => t.id === game.team2Id)
            const isActive = game.id === state.activeGameId
            const isSelected = (selectedGameId || state.activeGameId) === game.id
            return (
              <button
                key={game.id}
                className={`btn btn-sm${isSelected ? ' btn-primary' : ' btn-outline'}`}
                onClick={() => {
                  setSelectedGameId(game.id)
                  if (game.status === 'pending') act('SET_ACTIVE_GAME', { gameId: game.id })
                }}
              >
                {game.round === 'final' ? `Final G${game.gameNumber}` : game.id.toUpperCase()}
                {isActive && ' ●'}
              </button>
            )
          })}
        </div>
      </div>

      {displayGame ? (
        <GameScorer game={displayGame} state={state} act={act} loading={loading} muted={muted} />
      ) : (
        <div className="text-muted text-center" style={{ padding: 24 }}>Select a game above to score it.</div>
      )}
    </div>
  )
}

function PlayerScoreRow({ player, teamSlot, game, act, loading, isComplete, muted }) {
  const addScore = (points) => {
    if (isComplete) return
    if (!muted) {
      if (points === 3) playSwish3()
      else if (points === 2) playSwish()
      else if (points < 0) playThud()
    }
    act('ADD_SCORE', {
      gameId: game.id,
      teamSlot,
      points,
      scorerName: player.name,
      scorerId: player.id
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: '1px solid var(--border)'
    }}>
      <div style={{
        flex: 1, fontFamily: 'Roboto Condensed, sans-serif',
        fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase',
        letterSpacing: '0.04em', color: 'var(--off-white)'
      }}>
        {player.name}
      </div>
      <button
        className="score-btn plus2"
        style={{ padding: '10px 16px', fontSize: '1.1rem', borderRadius: 3 }}
        onClick={() => addScore(2)}
        disabled={loading || isComplete}
      >+2</button>
      <button
        className="score-btn plus3"
        style={{ padding: '10px 16px', fontSize: '1.1rem', borderRadius: 3 }}
        onClick={() => addScore(3)}
        disabled={loading || isComplete}
      >+3</button>
    </div>
  )
}

function GameScorer({ game, state, act, loading, muted }) {
  const t1 = state.teams.find(t => t.id === game.team1Id)
  const t2 = state.teams.find(t => t.id === game.team2Id)
  const t1Players = (t1?.playerIds || []).map(id => state.players.find(p => p.id === id)).filter(Boolean)
  const t2Players = (t2?.playerIds || []).map(id => state.players.find(p => p.id === id)).filter(Boolean)
  const t1Winning = game.team1Score > game.team2Score
  const t2Winning = game.team2Score > game.team1Score
  const isComplete = game.status === 'complete'

  return (
    <div>
      {/* Scoreboard */}
      <div className="card highlight">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 700 }}>
            {game.round === 'final' ? `FINALS — GAME ${game.gameNumber}` : 'SEMIFINAL'}
          </span>
          {' · '}
          <span style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '0.75rem', color: isComplete ? 'var(--green)' : 'var(--espn-red)', fontWeight: 700 }}>
            {isComplete ? 'FINAL' : 'FIRST TO 21'}
          </span>
        </div>

        <div className="scoreboard">
          <div className="score-side">
            <div className="score-team-name">{t1?.name}</div>
            <div className={`score-number${t1Winning ? ' winning' : ''}`}>{game.team1Score}</div>
          </div>
          <div className="score-vs">VS</div>
          <div className="score-side">
            <div className="score-team-name">{t2?.name}</div>
            <div className={`score-number${t2Winning ? ' winning' : ''}`}>{game.team2Score}</div>
          </div>
        </div>

        {isComplete && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span className="bracket-winner-badge" style={{ fontSize: '0.9rem', padding: '4px 14px' }}>
              {state.teams.find(t => t.id === game.winnerId)?.name} WINS
            </span>
          </div>
        )}
      </div>

      {/* Game Timer */}
      {!isComplete && <GameTimer gameId={game.id} />}

      {/* Per-player scoring */}
      {!isComplete && (
        <>
          {/* Team 1 players */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="section-label mb-8">{t1?.name}</div>
            {t1Players.length === 0 && <div className="text-muted" style={{ fontSize: '0.85rem' }}>No players assigned</div>}
            {t1Players.map(p => (
              <PlayerScoreRow key={p.id} player={p} teamSlot="team1" game={game} act={act} loading={loading} isComplete={isComplete} muted={muted} />
            ))}
          </div>

          {/* Team 2 players */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="section-label mb-8">{t2?.name}</div>
            {t2Players.length === 0 && <div className="text-muted" style={{ fontSize: '0.85rem' }}>No players assigned</div>}
            {t2Players.map(p => (
              <PlayerScoreRow key={p.id} player={p} teamSlot="team2" game={game} act={act} loading={loading} isComplete={isComplete} muted={muted} />
            ))}
          </div>

          {/* Undo + Declare Winner */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => act('UNDO_SCORE', { gameId: game.id })}
              disabled={loading || game.log.length === 0}
              style={{ flex: 1 }}
            >↩ UNDO LAST</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const winnerId = game.team1Score > game.team2Score ? game.team1Id : game.team2Id
                if (confirm(`Declare ${state.teams.find(t => t.id === winnerId)?.name} as winner?`)) {
                  if (!muted) playBuzzer()
                  act('DECLARE_WINNER', { gameId: game.id, winnerId })
                }
              }}
              disabled={loading || game.team1Score === game.team2Score}
              style={{ flex: 2 }}
            >DECLARE WINNER</button>
          </div>
        </>
      )}

      {/* Scoring log */}
      {game.log.length > 0 && (
        <div className="card">
          <div className="section-label mb-8">Scoring Log</div>
          <div className="score-log">
            {[...game.log].reverse().map((entry, i) => (
              <div key={i} className="score-log-entry">
                <span style={{ color: 'var(--white)', fontWeight: 600 }}>
                  {entry.scorerName || entry.teamName}
                </span>
                {entry.scorerName && (
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}> ({entry.teamName})</span>
                )}
                {' '}<span className="log-points">{entry.points > 0 ? `+${entry.points}` : entry.points}</span>
                {' '}<span className="text-muted">→ {entry.score1} – {entry.score2}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GAME TIMER ──────────────────────────────────────────────────────────────

function GameTimer({ gameId }) {
  const [elapsed, setElapsed] = useState(0)       // ms
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('idle')    // idle | running | paused | timeout | halftime
  const [timeoutLeft, setTimeoutLeft] = useState(0)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)
  const startedAtRef = useRef(null)
  const baseElapsedRef = useRef(0)

  // Reset when game changes
  useEffect(() => {
    clearInterval(intervalRef.current)
    clearTimeout(timeoutRef.current)
    setElapsed(0); setRunning(false); setStatus('idle'); setTimeoutLeft(0)
    startedAtRef.current = null; baseElapsedRef.current = 0
  }, [gameId])

  const start = () => {
    startedAtRef.current = Date.now()
    setRunning(true); setStatus('running')
    intervalRef.current = setInterval(() => {
      setElapsed(baseElapsedRef.current + (Date.now() - startedAtRef.current))
    }, 100)
  }

  const pause = () => {
    clearInterval(intervalRef.current)
    baseElapsedRef.current += Date.now() - startedAtRef.current
    setElapsed(baseElapsedRef.current)
    setRunning(false); setStatus('paused')
  }

  const callTimeout = () => {
    if (running) pause()
    setStatus('timeout'); setTimeoutLeft(30)
    let left = 30
    timeoutRef.current = setInterval(() => {
      left -= 1; setTimeoutLeft(left)
      if (left <= 0) {
        clearInterval(timeoutRef.current)
        setStatus('paused')
      }
    }, 1000)
  }

  const callHalftime = () => {
    if (running) pause()
    setStatus('halftime')
  }

  const resume = () => {
    clearInterval(timeoutRef.current)
    start()
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    clearInterval(timeoutRef.current)
    baseElapsedRef.current = 0
    setElapsed(0); setRunning(false); setStatus('idle'); setTimeoutLeft(0)
  }

  const fmt = (ms) => {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const s = (totalSec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const statusColor = { running: 'var(--green)', paused: 'var(--muted)', timeout: 'var(--espn-red)', halftime: 'var(--gold)', idle: 'var(--muted)' }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-label">Game Timer</div>
        {status !== 'idle' && (
          <span style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: statusColor[status] }}>
            {status === 'running' ? '● RUNNING' : status === 'timeout' ? `⏸ TIMEOUT ${timeoutLeft}s` : status === 'halftime' ? '⏸ HALFTIME' : '⏸ PAUSED'}
          </span>
        )}
      </div>

      {/* Clock display */}
      <div style={{ textAlign: 'center', fontFamily: 'Roboto Condensed, sans-serif', fontSize: '3rem', fontWeight: 900, letterSpacing: '0.05em', color: status === 'running' ? 'var(--white)' : 'var(--muted)', marginBottom: 12 }}>
        {fmt(elapsed)}
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        {!running ? (
          <button className="btn btn-primary btn-sm" onClick={status === 'idle' ? start : resume} style={{ gridColumn: 'span 1' }}>
            {status === 'idle' ? '▶ START' : '▶ RESUME'}
          </button>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={pause}>⏸ PAUSE</button>
        )}
        <button className="btn btn-outline btn-sm" onClick={callTimeout} disabled={status === 'timeout'} style={{ color: 'var(--espn-red)', borderColor: 'var(--espn-red)' }}>
          T.O.
        </button>
        <button className="btn btn-outline btn-sm" onClick={callHalftime} style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>
          HALF
        </button>
        <button className="btn btn-outline btn-sm" onClick={reset} style={{ color: 'var(--muted)' }}>
          RESET
        </button>
      </div>
    </div>
  )
}

// ─── ADMIN STATS TAB ─────────────────────────────────────────────────────────

function AdminStatsTab({ state }) {
  const allGames = [...(state.bracket.semifinals || []), ...(state.bracket.finals || [])]
  const statsMap = {}
  allGames.forEach(game => {
    game.log.forEach(entry => {
      if (!entry.scorerId) return
      if (!statsMap[entry.scorerId]) {
        const team = state.teams.find(t => t.playerIds?.includes(entry.scorerId))
        statsMap[entry.scorerId] = { id: entry.scorerId, name: entry.scorerName, teamName: team?.name || '', points: 0, twos: 0, threes: 0 }
      }
      if (entry.points === 2) { statsMap[entry.scorerId].points += 2; statsMap[entry.scorerId].twos++ }
      if (entry.points === 3) { statsMap[entry.scorerId].points += 3; statsMap[entry.scorerId].threes++ }
    })
  })
  const stats = Object.values(statsMap).sort((a, b) => b.points - a.points)

  if (state.phase === 'setup') return <div className="text-muted text-center" style={{ padding: 32 }}>Start the tournament to see stats.</div>

  if (stats.length === 0) return (
    <div className="card text-center" style={{ marginTop: 16 }}>
      <div className="text-muted">Stats will appear once scoring begins.</div>
    </div>
  )

  return (
    <div>
      <div className="card">
        <div className="section-label mb-8">Scoring Leaders</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['#', 'Player', 'Team', 'PTS', '2s', '3s'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Player' || h === 'Team' || h === '#' ? 'left' : 'right', fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--espn-red)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i === 0 ? 'rgba(204,0,0,0.07)' : 'transparent' }}>
                <td style={{ padding: '8px', fontFamily: 'Roboto Condensed, sans-serif', color: i === 0 ? 'var(--gold)' : 'var(--muted)', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: '8px', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem' }}>
                  {i === 0 && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}
                  {s.name}
                </td>
                <td style={{ padding: '8px', fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--muted)', fontSize: '0.8rem' }}>{s.teamName}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem' }}>{s.points}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--muted-light)' }}>{s.twos}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--espn-red)', fontWeight: 700 }}>{s.threes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BRACKET ADMIN TAB ────────────────────────────────────────────────────────

function BracketAdminTab({ state, act, loading }) {
  const teamName = (id) => state.teams.find(t => t.id === id)?.name || '?'
  const { bracket, phase, championTeamId } = state

  if (phase === 'setup') {
    return <div className="text-muted text-center" style={{ padding: 32 }}>Start the tournament to see the bracket.</div>
  }

  // Finals wins count
  const finalsWins = {}
  if (bracket.finals?.length > 0) {
    const { team1Id, team2Id } = bracket.finals[0]
    finalsWins[team1Id] = bracket.finals.filter(g => g.winnerId === team1Id).length
    finalsWins[team2Id] = bracket.finals.filter(g => g.winnerId === team2Id).length
  }

  return (
    <div>
      {bracket.semifinals?.length > 0 && (
        <>
          <div className="bracket-round-label">Semifinals</div>
          {bracket.semifinals.map(game => (
            <AdminBracketCard key={game.id} game={game} teamName={teamName} act={act} loading={loading} state={state} />
          ))}
        </>
      )}

      {bracket.byeTeamId && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 8 }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>BYE → </span>
          <span className="oswald text-gold">{teamName(bracket.byeTeamId)}</span>
        </div>
      )}

      {bracket.finals?.length > 0 && (
        <>
          <div className="bracket-round-label">
            Finals (Best of 3)
            {bracket.finals[0] && (
              <span className="text-muted" style={{ marginLeft: 8 }}>
                {finalsWins[bracket.finals[0].team1Id] || 0}–{finalsWins[bracket.finals[0].team2Id] || 0}
              </span>
            )}
          </div>
          {bracket.finals.map(game => (
            <AdminBracketCard key={game.id} game={game} teamName={teamName} act={act} loading={loading} state={state} label={`Finals Game ${game.gameNumber}`} />
          ))}
        </>
      )}

      {phase === 'complete' && (
        <div className="card champion" style={{ textAlign: 'center', marginTop: 16 }}>
          <span className="trophy">🏆</span>
          <div className="champion-name">{teamName(championTeamId)}</div>
          <div className="oswald text-gold mt-8">CHAMPIONS · ${state.players.length * 2} Prize Pot</div>
        </div>
      )}
    </div>
  )
}

function AdminBracketCard({ game, teamName, act, loading, state, label }) {
  const isActive = game.status === 'active'
  const isComplete = game.status === 'complete'

  return (
    <div className={`bracket-game${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`} style={{ marginBottom: 10 }}>
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {label || game.id.toUpperCase()}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isActive && <span className="bracket-live-badge">LIVE</span>}
          {!isComplete && !isActive && (
            <button className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              onClick={() => act('SET_ACTIVE_GAME', { gameId: game.id })} disabled={loading}>
              SET ACTIVE
            </button>
          )}
        </div>
      </div>
      <div className="bracket-row">
        <div className="bracket-team-name">{teamName(game.team1Id)}</div>
        <div className={`bracket-score${game.winnerId === game.team1Id ? ' text-green' : ''}`}>{game.team1Score}</div>
        {game.winnerId === game.team1Id && <span className="bracket-winner-badge">W</span>}
      </div>
      <div className="bracket-row">
        <div className="bracket-team-name">{teamName(game.team2Id)}</div>
        <div className={`bracket-score${game.winnerId === game.team2Id ? ' text-green' : ''}`}>{game.team2Score}</div>
        {game.winnerId === game.team2Id && <span className="bracket-winner-badge">W</span>}
      </div>
    </div>
  )
}
