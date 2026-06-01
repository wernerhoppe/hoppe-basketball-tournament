import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function History() {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(setHistory)
  }, [])

  return (
    <>
      <Head>
        <title>Tournament History – Hoppe Family</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="header">
        <div className="header-top">
          <span className="espn-logo">ESPN</span>
          <span style={{ color: 'white', fontSize: '0.75rem', fontFamily: 'Roboto Condensed, sans-serif', letterSpacing: '0.1em', fontWeight: 700 }}>TOURNAMENT HISTORY</span>
          <span style={{ width: 40 }} />
        </div>
        <div className="header-main">
          <h1>🏆 Hoppe Family Classics</h1>
        </div>
      </div>

      <div className="container">
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <Link href="/" style={{ color: 'var(--espn-red)', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.08em' }}>
            ← BACK TO BRACKET
          </Link>
        </div>

        {!history && <div className="text-muted text-center" style={{ padding: 32 }}>Loading...</div>}

        {history && history.length === 0 && (
          <div className="card text-center" style={{ marginTop: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.2rem', color: 'var(--muted-light)' }}>NO HISTORY YET</div>
            <div className="text-muted mt-8">Complete and reset a tournament to save it here.</div>
          </div>
        )}

        {history && history.map((entry, i) => (
          <TournamentEntry key={entry.id} entry={entry} index={i} />
        ))}
      </div>
    </>
  )
}

function TournamentEntry({ entry, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const date = new Date(entry.date)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const allGames = [...(entry.bracket.semifinals || []), ...(entry.bracket.finals || [])]
  const champTeam = entry.teams.find(t => t.name === entry.champion)
  const champPlayers = champTeam
    ? champTeam.playerIds.map(id => entry.players.find(p => p.id === id)?.name).filter(Boolean)
    : []

  return (
    <div className="card" style={{ marginBottom: 12, border: index === 0 ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
      {/* Header row */}
      <div
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <div style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase' }}>
            {dateStr}
          </div>
          <div style={{ fontFamily: 'Roboto Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 900, color: index === 0 ? 'var(--gold)' : 'var(--white)', marginTop: 2 }}>
            🏆 {entry.champion}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
            {champPlayers.join(' & ')} · ${entry.prizePool} prize
          </div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>

          {/* Player Stats */}
          {entry.playerStats?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Scoring Leaders</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Player', 'PTS', '2s', '3s'].map(h => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Player' ? 'left' : 'right', fontFamily: 'Roboto Condensed, sans-serif', color: 'var(--muted)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entry.playerStats.map((s, i) => (
                    <tr key={s.scorerId} style={{ borderBottom: '1px solid var(--border)', background: i === 0 ? 'rgba(245,197,24,0.06)' : 'transparent' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 700 }}>
                        {i === 0 && <span style={{ color: 'var(--gold)', marginRight: 4 }}>★</span>}
                        {s.scorerName}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900, color: 'var(--white)' }}>{s.points}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)' }}>{s.twos}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--espn-red)' }}>{s.threes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Game Results */}
          <div className="section-label" style={{ marginBottom: 8 }}>Results</div>
          {allGames.map(game => {
            const t1 = entry.teams.find(t => t.id === game.team1Id)
            const t2 = entry.teams.find(t => t.id === game.team2Id)
            return (
              <div key={game.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.1em', width: 60 }}>
                  {game.round === 'final' ? `FINAL G${game.gameNumber}` : 'SEMI'}
                </span>
                <span style={{ flex: 1, fontFamily: 'Roboto Condensed, sans-serif', fontWeight: game.winnerId === game.team1Id ? 900 : 400, color: game.winnerId === game.team1Id ? 'var(--white)' : 'var(--muted)' }}>{t1?.name}</span>
                <span style={{ fontFamily: 'Roboto Condensed, sans-serif', fontWeight: 900 }}>{game.team1Score}–{game.team2Score}</span>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'Roboto Condensed, sans-serif', fontWeight: game.winnerId === game.team2Id ? 900 : 400, color: game.winnerId === game.team2Id ? 'var(--white)' : 'var(--muted)' }}>{t2?.name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
