import { useState, useEffect } from 'react'
import Head from 'next/head'
export default function Viewer() {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('bracket')

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

  if (!state) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f1a' }}>
      <div style={{ color: '#c8a96e', fontFamily: 'Oswald, sans-serif', fontSize: '1.5rem' }}>Loading...</div>
    </div>
  )

  const prizePool = state.players.length * 2
  const allGames = [...(state.bracket.semifinals || []), ...(state.bracket.finals || [])]
  const champion = state.championTeamId ? state.teams.find(t => t.id === state.championTeamId) : null

  return (
    <>
      <Head>
        <title>Hoppe Family Tournament 🏀</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="header">
        <div className="header-top">
          <span className="espn-logo">ESPN</span>
          <span style={{ color: 'white', fontSize: '0.75rem', fontFamily: 'Roboto Condensed, sans-serif', letterSpacing: '0.1em', fontWeight: 700 }}>HOPPE FAMILY CLASSIC</span>
          {state.phase === 'bracket' && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span className="live-dot" /><span style={{ color: 'white', fontSize: '0.7rem', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 700 }}>LIVE</span></span>}
          {state.phase !== 'bracket' && <span style={{ width: 40 }} />}
        </div>
        <div className="header-main">
          <h1>🏀 Hoppe Family Tournament</h1>
          <div className="prize-badge">Prize Pot: ${prizePool}</div>
        </div>
      </div>

      <div className="container">
        {state.phase === 'setup' && (
          <div className="card text-center" style={{ marginTop: 24 }}>
            <div style={{ fontSize: '3rem' }}>⏳</div>
            <div className="oswald" style={{ fontSize: '1.3rem', color: '#c8a96e', marginTop: 8 }}>Tournament Starting Soon</div>
            <div className="text-muted mt-8">The admin is setting up the bracket.</div>
            <div className="text-muted mt-8">{state.players.length} player{state.players.length !== 1 ? 's' : ''} registered · ${prizePool} prize pool</div>
          </div>
        )}

        {state.phase === 'complete' && champion && (
          <div className="card champion mt-8">
            <span className="trophy">🏆</span>
            <div className="champion-name">{champion.name}</div>
            <div className="text-center text-gold oswald" style={{ fontSize: '1.1rem', marginTop: 8 }}>CHAMPIONS</div>
            <div className="text-center mt-8" style={{ fontSize: '1.5rem', color: '#f0c97a', fontFamily: 'Oswald, sans-serif' }}>${prizePool} Prize Pot</div>
            <div className="text-center text-muted mt-8">
              {state.teams.find(t => t.id === champion.id)?.playerIds.map(pid => {
                const p = state.players.find(pl => pl.id === pid)
                return p?.name
              }).filter(Boolean).join(' & ')}
            </div>
          </div>
        )}

        {(state.phase === 'bracket' || state.phase === 'complete') && (
          <>
            <div className="tabs mt-8">
              <button className={`tab${tab === 'bracket' ? ' active' : ''}`} onClick={() => setTab('bracket')}>BRACKET</button>
              <button className={`tab${tab === 'scores' ? ' active' : ''}`} onClick={() => setTab('scores')}>LIVE SCORE</button>
              <button className={`tab${tab === 'teams' ? ' active' : ''}`} onClick={() => setTab('teams')}>TEAMS</button>
            </div>

            {tab === 'bracket' && <BracketView state={state} />}
            {tab === 'scores' && <LiveScoreView state={state} />}
            {tab === 'teams' && <TeamsView state={state} />}
          </>
        )}
      </div>
    </>
  )
}

function BracketView({ state }) {
  const { bracket, teams, phase, championTeamId } = state

  const teamName = (id) => teams.find(t => t.id === id)?.name || '?'

  return (
    <div>
      {bracket.semifinals?.length > 0 && (
        <>
          <div className="bracket-round-label">Semifinals</div>
          {bracket.semifinals.map(game => (
            <BracketGameCard key={game.id} game={game} teamName={teamName} />
          ))}
        </>
      )}

      {bracket.byeTeamId && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 8 }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>BYE → </span>
          <span className="oswald text-gold">{teamName(bracket.byeTeamId)}</span>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}> advances to finals</span>
        </div>
      )}

      {bracket.finals?.length > 0 && (
        <>
          <div className="bracket-round-label">Finals (Best of 3)</div>
          {bracket.finals.map(game => (
            <BracketGameCard key={game.id} game={game} teamName={teamName} label={`Game ${game.gameNumber}`} />
          ))}
        </>
      )}

      {phase === 'complete' && championTeamId && (
        <div className="card gold" style={{ textAlign: 'center', padding: '16px' }}>
          <div className="oswald text-gold" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>🏆 CHAMPION</div>
          <div className="oswald" style={{ fontSize: '1.5rem', color: '#f0c97a', marginTop: 4 }}>{teamName(championTeamId)}</div>
        </div>
      )}
    </div>
  )
}

function BracketGameCard({ game, teamName, label }) {
  const isActive = game.status === 'active'
  const isComplete = game.status === 'complete'
  const t1Wins = game.team1Score >= 21
  const t2Wins = game.team2Score >= 21

  return (
    <div className={`bracket-game${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`}>
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
          {label || 'GAME'}
        </span>
        {isActive && <span className="bracket-live-badge">LIVE</span>}
        {isComplete && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>FINAL</span>}
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

function LiveScoreView({ state }) {
  const activeGame = [...(state.bracket.semifinals || []), ...(state.bracket.finals || [])].find(g => g.id === state.activeGameId)

  if (!activeGame) return (
    <div className="card text-center" style={{ marginTop: 16 }}>
      <div className="text-muted">No game currently active.</div>
    </div>
  )

  const t1 = state.teams.find(t => t.id === activeGame.team1Id)
  const t2 = state.teams.find(t => t.id === activeGame.team2Id)
  const t1Winning = activeGame.team1Score > activeGame.team2Score
  const t2Winning = activeGame.team2Score > activeGame.team1Score

  return (
    <div>
      <div className="card highlight">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span className="bracket-live-badge">LIVE</span>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 8 }}>First to 21</span>
        </div>
        <div className="scoreboard">
          <div className="score-side">
            <div className="score-team-name">{t1?.name}</div>
            <div className={`score-number${t1Winning ? ' winning' : ''}`}>{activeGame.team1Score}</div>
          </div>
          <div className="score-vs">VS</div>
          <div className="score-side">
            <div className="score-team-name">{t2?.name}</div>
            <div className={`score-number${t2Winning ? ' winning' : ''}`}>{activeGame.team2Score}</div>
          </div>
        </div>
      </div>

      {activeGame.log.length > 0 && (
        <div className="card">
          <div className="oswald mb-8" style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>SCORING LOG</div>
          <div className="score-log">
            {[...activeGame.log].reverse().map((entry, i) => (
              <div key={i} className="score-log-entry">
                <span style={{ color: 'var(--white)' }}>{entry.teamName}</span>
                {' '}<span className="log-points">+{entry.points}</span>
                {' '}<span className="text-muted">→ {entry.score1} – {entry.score2}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamsView({ state }) {
  return (
    <div>
      {state.teams.map(team => (
        <div key={team.id} className="card">
          <div className="oswald text-gold" style={{ fontSize: '1.1rem', marginBottom: 8 }}>{team.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {team.playerIds.map(pid => {
              const p = state.players.find(pl => pl.id === pid)
              return p ? <span key={pid} className="player-pill">{p.name}</span> : null
            })}
            {team.playerIds.length === 0 && <span className="text-muted">No players assigned</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
