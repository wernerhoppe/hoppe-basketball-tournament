import { useState, useEffect } from 'react'
import Head from 'next/head'
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
          <span style={{ width: 40 }} />
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
          <ScoreTab state={state} act={act} loading={loading} />
        )}

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

function ScoreTab({ state, act, loading }) {
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
        <GameScorer game={displayGame} state={state} act={act} loading={loading} />
      ) : (
        <div className="text-muted text-center" style={{ padding: 24 }}>Select a game above to score it.</div>
      )}
    </div>
  )
}

function GameScorer({ game, state, act, loading }) {
  const t1 = state.teams.find(t => t.id === game.team1Id)
  const t2 = state.teams.find(t => t.id === game.team2Id)
  const t1Winning = game.team1Score > game.team2Score
  const t2Winning = game.team2Score > game.team1Score
  const isComplete = game.status === 'complete'
  const isActive = game.status === 'active' || game.status === 'pending'

  const addScore = (teamSlot, points) => {
    if (isComplete) return
    act('ADD_SCORE', { gameId: game.id, teamSlot, points })
  }

  return (
    <div>
      <div className="card highlight">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span className="oswald text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            {game.round === 'final' ? `FINALS — GAME ${game.gameNumber}` : 'SEMIFINAL'}
          </span>
          {' · '}
          <span className="oswald" style={{ fontSize: '0.75rem', color: isComplete ? 'var(--green)' : 'var(--orange)' }}>
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

        {!isComplete && (
          <>
            <hr className="divider" />

            {/* Team 1 buttons */}
            <div className="oswald text-muted mb-8" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>{t1?.name?.toUpperCase()}</div>
            <div className="score-btns mb-8">
              <button className="score-btn plus2" onClick={() => addScore('team1', 2)} disabled={loading}>+2</button>
              <button className="score-btn plus3" onClick={() => addScore('team1', 3)} disabled={loading}>+3</button>
              <button className="score-btn minus" onClick={() => addScore('team1', -1)} disabled={loading}>-1</button>
            </div>

            {/* Team 2 buttons */}
            <div className="oswald text-muted mb-8" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>{t2?.name?.toUpperCase()}</div>
            <div className="score-btns mb-8">
              <button className="score-btn plus2" onClick={() => addScore('team2', 2)} disabled={loading}>+2</button>
              <button className="score-btn plus3" onClick={() => addScore('team2', 3)} disabled={loading}>+3</button>
              <button className="score-btn minus" onClick={() => addScore('team2', -1)} disabled={loading}>-1</button>
            </div>

            <hr className="divider" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => act('UNDO_SCORE', { gameId: game.id })}
                disabled={loading || game.log.length === 0}
                style={{ flex: 1 }}
              >
                ↩ UNDO
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const winnerId = game.team1Score > game.team2Score ? game.team1Id : game.team2Id
                  if (confirm(`Declare ${state.teams.find(t => t.id === winnerId)?.name} as winner?`)) {
                    act('DECLARE_WINNER', { gameId: game.id, winnerId })
                  }
                }}
                disabled={loading || game.team1Score === game.team2Score}
                style={{ flex: 2 }}
              >
                DECLARE WINNER
              </button>
            </div>
          </>
        )}

        {isComplete && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span className="bracket-winner-badge" style={{ fontSize: '0.9rem', padding: '4px 12px' }}>
              {state.teams.find(t => t.id === game.winnerId)?.name} WINS
            </span>
          </div>
        )}
      </div>

      {/* Score log */}
      {game.log.length > 0 && (
        <div className="card">
          <div className="oswald mb-8" style={{ fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>SCORING LOG</div>
          <div className="score-log">
            {[...game.log].reverse().map((entry, i) => (
              <div key={i} className="score-log-entry">
                <span style={{ color: 'var(--white)' }}>{entry.teamName}</span>
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
