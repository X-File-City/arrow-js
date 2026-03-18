export type Callbacks = { onScore: () => void; onGameOver: () => void }

export function createEngine({ onScore, onGameOver }: Callbacks) {
  const PW = 52, GH = 100, PX = 56, PH = 18
  let y = 0, vy = 0, frame = 0, spawnIn = 0, rafId = 0
  let pipes: { top: HTMLDivElement; bot: HTMLDivElement; x: number; gap: number; scored: boolean }[] = []
  let shrapnel: { el: HTMLElement; x: number; y: number; vx: number; vy: number; r: number; vr: number }[] = []
  let player: HTMLElement, game: HTMLElement
  let dying = false

  const h = () => game?.clientHeight ?? 400


  function pipe(cls: string, cap: string, height: number) {
    const el = document.createElement('div')
    el.className = `flap-pipe ${cls}`
    el.style.height = `${height}px`
    const body = Object.assign(document.createElement('div'), { className: 'flap-body' })
    const capEl = Object.assign(document.createElement('div'), { className: 'flap-cap', textContent: cap })
    el.append(...(cls === 'flap-pipe--top' ? [body, capEl] : [capEl, body]))
    return el
  }

  function spawn() {
    if (!game) return
    const gap = 48 + Math.random() * (h() - GH - 96)
    const top = pipe('flap-pipe--top', '\u2558\u2550\u2550\u2550\u2550\u2550\u2550\u255b', gap)
    const bot = pipe('flap-pipe--bot', '\u2552\u2550\u2550\u2550\u2550\u2550\u2550\u2555', h() - gap - GH)
    bot.style.top = `${gap + GH}px`
    const x = !pipes.length && !frame ? game.clientWidth * 0.7 : game.clientWidth + 10
    top.style.transform = bot.style.transform = `translateX(${x}px)`
    game.append(top, bot)
    pipes.push({ top, bot, x, gap, scored: false })
  }

  function clear() { pipes.forEach(p => { p.top.remove(); p.bot.remove() }); pipes = [] }

  function hit(p: typeof pipes[0]) {
    if (PX + 40 <= p.x || PX >= p.x + PW) return false
    return y < p.gap || y + PH > p.gap + GH
  }

  function explode() {
    player.style.display = 'none'
    dying = true
    const chars = ['(', ')', '=', '>']
    chars.forEach((ch, i) => {
      const el = document.createElement('div')
      el.className = 'flap-shard'
      el.textContent = ch
      el.style.left = `${PX + i * 9}px`
      el.style.top = `${y}px`
      game.appendChild(el)
      shrapnel.push({
        el, x: 0, y: 0, r: 0,
        vx: 1 + Math.random() * 4,
        vy: -(2 + Math.random() * 4),
        vr: (Math.random() - 0.5) * 20,
      })
    })
    rafId = requestAnimationFrame(deathLoop)
  }

  function deathLoop() {
    let allGone = true
    for (const s of shrapnel) {
      s.vy += 0.5
      s.x += s.vx
      s.y += s.vy
      s.r += s.vr
      s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`
      if (s.y < h()) allGone = false
      else s.el.style.opacity = '0'
    }
    if (allGone) {
      shrapnel.forEach(s => s.el.remove())
      shrapnel = []
      dying = false
      onGameOver()
    } else {
      rafId = requestAnimationFrame(deathLoop)
    }
  }

  function loop() {
    frame++
    vy += 0.4
    y += vy
    if (y < 0) { y = 0; vy = 0 }
    if (y + PH > h()) { stop(); explode(); return }
    player.style.transform = `translateY(${y}px)`

    if (--spawnIn <= 0) { spawn(); spawnIn = 90 }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i]
      p.x -= 2.5 + frame * 0.0005
      p.top.style.transform = p.bot.style.transform = `translateX(${p.x}px)`
      if (p.x + PW < 0) { p.top.remove(); p.bot.remove(); pipes.splice(i, 1); continue }
      if (!p.scored && p.x + PW / 2 < PX + 20) { p.scored = true; onScore() }
      if (hit(p)) { stop(); explode(); return }
    }
    rafId = requestAnimationFrame(loop)
  }

  function stop() { cancelAnimationFrame(rafId) }

  return {
    get dying() { return dying },
    mount() {
      player = document.getElementById('flap-player')!
      game = document.getElementById('flap-game')!
      this.reset()
    },
    reset() {
      stop()
      shrapnel.forEach(s => s.el.remove()); shrapnel = []; dying = false
      clear()
      y = h() / 2 - PH / 2; vy = 0; frame = 0
      player.style.display = ''; player.style.transform = `translateY(${y}px)`
      spawn(); spawnIn = 90
    },
    start() { vy = -6.5; rafId = requestAnimationFrame(loop) },
    flap() { vy = -6.5 },
  }
}
