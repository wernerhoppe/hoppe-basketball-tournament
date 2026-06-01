import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'

function calcStats(state) {
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
  return Object.values(statsMap).sort((a, b) => b.points - a.points)
}

export default function Viewer() {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('bracket')
  const prevChampionRef = useRef(null)
  const confettiFiredRef = useRef(false)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/state')
        const data = await res.json()
        // Fire confetti when champion first detected (including on fresh page load if already complete)
        if (data.championTeamId && !confettiFiredRef.current) {
          confettiFiredRef.current = true
          fireConfetti()
        }
        prevChampionRef.current = data.championTeamId
        setState(data)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  if (!state) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0d' }}>
      <div style={{ color: '#f5c518', fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>Loading...</div>
    </div>
  )

  const prizePool = state.players.length * 2
  const champion = state.championTeamId ? state.teams.find(t => t.id === state.championTeamId) : null
  const stats = calcStats(state)

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
            <div style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.3rem', color: 'var(--gold)', marginTop: 8, fontWeight: 700 }}>Tournament Starting Soon</div>
            <div className="text-muted mt-8">The admin is setting up the bracket.</div>
            <div className="text-muted mt-8">{state.players.length} player{state.players.length !== 1 ? 's' : ''} registered · ${prizePool} prize pool</div>
          </div>
        )}

        {state.phase === 'complete' && champion && (
          <div className="card champion mt-8">
            <span className="trophy">🏆</span>
            <div className="champion-name">{champion.name}</div>
            <div className="text-center text-gold" style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.1rem', marginTop: 8, fontWeight: 700 }}>CHAMPIONS</div>
            <div className="text-center mt-8" style={{ fontSize: '1.5rem', color: 'var(--gold-bright)', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900 }}>${prizePool} Prize Pot</div>
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
              <button className={`tab${tab === 'scores' ? ' active' : ''}`} onClick={() => setTab('scores')}>LIVE</button>
              <button className={`tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>STATS</button>
              <button className={`tab${tab === 'teams' ? ' active' : ''}`} onClick={() => setTab('teams')}>TEAMS</button>
            </div>

            {tab === 'bracket' && <BracketView state={state} />}
            {tab === 'scores' && <LiveScoreView state={state} />}
            {tab === 'stats' && <StatsView stats={stats} />}
            {tab === 'teams' && <TeamsView state={state} />}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
          <Link href="/history" style={{ color: 'var(--muted)', fontFamily: 'Roboto Condensed, sans-serif', fontSize: '0.75rem', letterSpacing: '0.1em', textDecoration: 'none', fontWeight: 700 }}>
            📋 TOURNAMENT HISTORY
          </Link>
        </div>
      </div>
    </>
  )
}

function fireConfetti() {
  if (typeof window === 'undefined') return
  import('canvas-confetti').then(({ default: confetti }) => {
    const colors = ['#cc0000', '#f5c518', '#ffffff', '#ffd700']
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors })
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.1, y: 0.6 }, colors }), 400)
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.9, y: 0.6 }, colors }), 700)
  })
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
          <span style={{ fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--gold)', fontWeight: 700 }}>{teamName(bracket.byeTeamId)}</span>
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
          <div style={{ fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--gold)', fontSize: '1rem', letterSpacing: '0.1em', fontWeight: 700 }}>🏆 CHAMPION</div>
          <div style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.5rem', color: 'var(--gold-bright)', marginTop: 4, fontWeight: 900 }}>{teamName(championTeamId)}</div>
        </div>
      )}
    </div>
  )
}

function BracketGameCard({ game, teamName, label }) {
  const isActive = game.status === 'active'
  const isComplete = game.status === 'complete'

  return (
    <div className={`bracket-game${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`}>
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'Roboto Condensed, sans-serif', letterSpacing: '0.1em', fontWeight: 700 }}>
          {label || 'GAME'}
        </span>
        {isActive && <span className="bracket-live-badge">LIVE</span>}
        {isComplete && <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 700 }}>FINAL</span>}
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
          <div className="section-label mb-8">Scoring Log</div>
          <div className="score-log">
            {[...activeGame.log].reverse().map((entry, i) => (
              <div key={i} className="score-log-entry">
                <span style={{ color: 'var(--white)', fontWeight: 600 }}>{entry.scorerName || entry.teamName}</span>
                {entry.scorerName && <span className="text-muted" style={{ fontSize: '0.75rem' }}> ({entry.teamName})</span>}
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

function StatsView({ stats }) {
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
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--white)' }}>{s.points}</td>
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

function TeamsView({ state }) {
  return (
    <div>
      {state.teams.map(team => (
        <div key={team.id} className="card">
          <div style={{ fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--gold)', fontSize: '1.1rem', marginBottom: 8, fontWeight: 700 }}>{team.name}</div>
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
