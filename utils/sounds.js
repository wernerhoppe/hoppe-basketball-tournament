// Web Audio API sound effects — no files needed, all generated mathematically

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!window._audioCtx) {
    window._audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return window._audioCtx
}

// Swish — classic net sound for a 2-pointer
export function playSwish() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime

  // Noise burst (the "swish" part)
  const bufferSize = ctx.sampleRate * 0.15
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.setValueAtTime(4000, t)
  noiseFilter.frequency.exponentialRampToValueAtTime(1200, t + 0.15)
  noiseFilter.Q.value = 0.8
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.35, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(t)

  // Tone (the satisfying "ping")
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.2)
  oscGain.gain.setValueAtTime(0.18, t)
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.3)
}

// Deep Swish — bigger sound for a 3-pointer
export function playSwish3() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime

  // Same swish noise but lower
  const bufferSize = ctx.sampleRate * 0.2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.setValueAtTime(2800, t)
  noiseFilter.frequency.exponentialRampToValueAtTime(800, t + 0.2)
  noiseFilter.Q.value = 0.6
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.45, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(t)

  // Two-tone "oh wow" — root + fifth
  ;[[880, 0], [1320, 0.08]].forEach(([freq, delay]) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t + delay)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + delay + 0.3)
    gain.gain.setValueAtTime(0.15, t + delay)
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t + delay)
    osc.stop(t + delay + 0.4)
  })
}

// Thud — for -1 correction
export function playThud() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}

// Buzzer — game over horn
export function playBuzzer() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime

  // Harsh buzzer tone
  ;[150, 153, 148].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t + i * 0.002)
    gain.gain.linearRampToValueAtTime(0.22, t + i * 0.002 + 0.02)
    gain.gain.setValueAtTime(0.22, t + 0.7)
    gain.gain.linearRampToValueAtTime(0, t + 0.85)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.9)
  })
}

// Victory fanfare — 5-note ascending for champion
export function playFanfare() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  const notes = [523, 659, 784, 1047, 1319] // C5 E5 G5 C6 E6
  const delays = [0, 0.13, 0.26, 0.39, 0.58]
  const durations = [0.12, 0.12, 0.12, 0.18, 0.6]

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const start = t + delays[i]
    const dur = durations[i]
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
    gain.gain.setValueAtTime(0.25, start + dur - 0.04)
    gain.gain.linearRampToValueAtTime(0, start + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  })
}
