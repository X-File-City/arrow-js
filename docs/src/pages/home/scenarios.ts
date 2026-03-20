import { component, html, reactive } from '@arrow-js/core'

// --- SVG Sparkline helpers ---

function sparklinePath(data: number[], w: number, h: number, pad = 2): string {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const step = (w - pad * 2) / (data.length - 1)
  return data
    .map((v, i) => {
      const x = pad + i * step
      const y = pad + (h - pad * 2) * (1 - (v - min) / range)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function sparklineArea(data: number[], w: number, h: number, pad = 2): string {
  return `${sparklinePath(data, w, h, pad)} L${(w - pad).toFixed(1)},${h} L${pad},${h} Z`
}

// ============================================================
// Scenario 1 — HVAC Quote Comparison
// ============================================================

interface Quote {
  vendor: string
  price: number
  seer: number
  warranty: number
}

const quotes: Quote[] = [
  { vendor: 'CoolAir Pro', price: 8200, seer: 16, warranty: 10 },
  { vendor: 'ClimateCraft', price: 7400, seer: 15, warranty: 5 },
  { vendor: 'AirFlow Plus', price: 9100, seer: 18, warranty: 12 },
]

type SortKey = 'price' | 'efficiency' | 'warranty'

function bestVendor(key: SortKey): string {
  if (key === 'price') return quotes.reduce((b, q) => (q.price < b.price ? q : b)).vendor
  if (key === 'efficiency') return quotes.reduce((b, q) => (q.seer > b.seer ? q : b)).vendor
  return quotes.reduce((b, q) => (q.warranty > b.warranty ? q : b)).vendor
}

function sorted(key: SortKey): Quote[] {
  const s = [...quotes]
  if (key === 'price') s.sort((a, b) => a.price - b.price)
  else if (key === 'efficiency') s.sort((a, b) => b.seer - a.seer)
  else s.sort((a, b) => b.warranty - a.warranty)
  return s
}

const sortMeta: Record<SortKey, { label: string; badge: string; bg: string; text: string; border: string; cardBg: string; shadow: string }> = {
  price:      { label: 'Price',      badge: 'Lowest Price',    bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500/50', cardBg: 'bg-emerald-500/5 dark:bg-emerald-500/10', shadow: 'shadow-emerald-500/10' },
  efficiency: { label: 'Efficiency', badge: 'Most Efficient',  bg: 'bg-blue-500',    text: 'text-white', border: 'border-blue-500/50',    cardBg: 'bg-blue-500/5 dark:bg-blue-500/10',       shadow: 'shadow-blue-500/10' },
  warranty:   { label: 'Warranty',   badge: 'Best Warranty',   bg: 'bg-amber-500',   text: 'text-white', border: 'border-amber-500/50',   cardBg: 'bg-amber-500/5 dark:bg-amber-500/10',     shadow: 'shadow-amber-500/10' },
}

export const HvacComparison = component(() => {
  const st = reactive({ sortBy: 'price' as SortKey })
  const keys: SortKey[] = ['price', 'efficiency', 'warranty']

  return html`
    <div class="space-y-4">
      <div class="flex items-center gap-1.5 @sm:gap-2 flex-wrap">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-0.5">Sort by</span>
        ${keys.map(
          (k) => html`
            <button
              @click="${() => {
                st.sortBy = k
              }}"
              class="${() =>
                `px-2 @sm:px-3 py-1 text-[11px] @sm:text-xs font-semibold rounded-full transition-all cursor-pointer outline-none ` +
                (st.sortBy === k
                  ? sortMeta[k].bg + ' ' + sortMeta[k].text + ' shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700')}"
            >
              ${sortMeta[k].label}
            </button>
          `
        )}
      </div>

      <div class="grid grid-cols-1 @sm:grid-cols-3 gap-2 @sm:gap-3">
        ${() =>
          sorted(st.sortBy).map((q) => {
            const pos0 = q.vendor === bestVendor(st.sortBy)
            return html`
              <div
                class="${() => {
                  const m = sortMeta[st.sortBy]
                  const best = q.vendor === bestVendor(st.sortBy)
                  return 'relative rounded-xl border p-4 transition-all ' +
                    (best
                      ? m.border + ' ' + m.cardBg + ' shadow-sm ' + m.shadow
                      : 'border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50')
                }}"
              >
                ${pos0
                  ? html`<div
                      class="${() => 'absolute -top-2.5 left-3 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full leading-none ' + sortMeta[st.sortBy].bg + ' ' + sortMeta[st.sortBy].text}"
                    >
                      ${() => sortMeta[st.sortBy].badge}
                    </div>`
                  : ''}
                <div class="${'text-xs font-semibold text-zinc-700 dark:text-zinc-300' + (pos0 ? ' mt-1' : '')}">${q.vendor}</div>
                <div class="mt-2 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  $${q.price.toLocaleString()}
                </div>
                <div class="mt-3 space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div class="flex justify-between">
                    <span>SEER</span>
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">${q.seer}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Warranty</span>
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">${q.warranty} yr</span>
                  </div>
                </div>
              </div>
            `
          })}
      </div>
    </div>
  `
})

// ============================================================
// Scenario 2 — API Metrics Dashboard
// ============================================================

type TimeRange = '1h' | '24h' | '7d'

const dashData: Record<
  TimeRange,
  Record<string, { value: string; trend: string; up: boolean; spark: number[] }>
> = {
  '1h': {
    requests: { value: '1,247/m', trend: '+12%', up: true, spark: [80,92,85,110,95,120,105,135,128,142,130,147] },
    latency:  { value: '45 ms',   trend: '-8%',  up: false, spark: [62,58,55,52,48,51,46,44,47,43,45,42] },
    errors:   { value: '0.12%',   trend: '-23%', up: false, spark: [30,25,20,18,22,15,13,14,11,12,13,12] },
  },
  '24h': {
    requests: { value: '982/m',  trend: '+5%',  up: true, spark: [60,70,85,95,110,130,120,100,90,85,95,105] },
    latency:  { value: '52 ms',  trend: '-3%',  up: false, spark: [58,55,60,54,52,50,53,51,49,52,50,48] },
    errors:   { value: '0.18%',  trend: '-15%', up: false, spark: [35,30,28,25,22,20,19,17,18,16,18,17] },
  },
  '7d': {
    requests: { value: '876/m',  trend: '+18%', up: true, spark: [50,55,60,65,70,72,78,82,85,88,90,95] },
    latency:  { value: '58 ms',  trend: '-12%', up: false, spark: [70,68,65,62,60,58,56,55,54,56,55,53] },
    errors:   { value: '0.22%',  trend: '-31%', up: false, spark: [50,45,40,38,35,30,28,25,24,22,21,20] },
  },
}

const metrics = [
  { key: 'requests', label: 'Requests', color: '#22c55e' },
  { key: 'latency', label: 'P95 Latency', color: '#3b82f6' },
  { key: 'errors', label: 'Error Rate', color: '#f97316' },
] as const

export const ApiDashboard = component(() => {
  const st = reactive({ range: '24h' as TimeRange })
  const ranges: TimeRange[] = ['1h', '24h', '7d']

  return html`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">API Metrics</span>
        <div class="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
          ${ranges.map(
            (r) => html`
              <button
                @click="${() => {
                  st.range = r
                }}"
                class="${() =>
                  `px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer outline-none ` +
                  (st.range === r
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300')}"
              >
                ${r}
              </button>
            `
          )}
        </div>
      </div>

      <div class="grid grid-cols-1 @sm:grid-cols-3 gap-2 @sm:gap-3">
        ${metrics.map((m) => {
          const gradId = `hero-sg-${m.key}`
          const gradFill = `url(#${gradId})`
          return html`
            <div class="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 p-3.5 overflow-hidden">
              <div class="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">${m.label}</div>
              <div class="mt-1.5 flex items-baseline gap-1.5">
                <span class="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">${() => dashData[st.range][m.key].value}</span>
                <span
                  class="${() =>
                    `text-[11px] font-semibold ${dashData[st.range][m.key].up ? 'text-emerald-500' : 'text-blue-500'}`}"
                >
                  ${() => dashData[st.range][m.key].trend}
                </span>
              </div>
              <svg class="mt-2 w-full h-8" viewBox="0 0 120 28" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${m.color}" stop-opacity="0.15" />
                    <stop offset="100%" stop-color="${m.color}" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="${() => sparklineArea(dashData[st.range][m.key].spark, 120, 28)}"
                  fill="${gradFill}"
                />
                <path
                  d="${() => sparklinePath(dashData[st.range][m.key].spark, 120, 28)}"
                  fill="none"
                  stroke="${m.color}"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
            </div>
          `
        })}
      </div>
    </div>
  `
})

// ============================================================
// Scenario 3 — Coffee Order Builder (overflow demo)
// ============================================================

const drinks = ['Latte', 'Cappuccino', 'Americano', 'Cold Brew', 'Matcha']
const coffeeSizes = ['S', 'M', 'L']
const extras = [
  { id: 'shot', label: 'Xtra Shot' },
  { id: 'oat', label: 'Oat' },
  { id: 'van', label: 'Vanilla' },
  { id: 'whip', label: 'Whip' },
]

const allNames = ['Sarah', 'Marcus', 'Priya', 'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor']

const chevron = html`<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 flex-shrink-0"><path d="M3 4.5l3 3 3-3" /></svg>`

export const CoffeeBuilder = component(() => {
  const st = reactive({
    rows: [
      { name: 'Sarah', drink: 'Latte', size: 'M', extras: ['oat'] },
      { name: 'Marcus', drink: 'Cappuccino', size: 'S', extras: ['shot'] },
      { name: 'Priya', drink: 'Cold Brew', size: 'L', extras: ['oat', 'whip'] },
      { name: 'Alex', drink: '', size: 'M', extras: [] as string[] },
    ],
    open: null as string | null,
  })

  function toggleOpen(key: string) {
    st.open = st.open === key ? null : key
  }

  function setDrink(i: number, d: string) {
    st.rows[i].drink = d
    st.open = null
  }

  function setSize(i: number, s: string) {
    st.rows[i].size = s
    st.open = null
  }

  function toggleExtra(i: number, id: string) {
    const ex = st.rows[i].extras
    const idx = ex.indexOf(id)
    if (idx === -1) ex.push(id)
    else ex.splice(idx, 1)
  }

  function addMember(name: string) {
    st.rows.push({ name, drink: '', size: 'M', extras: [] })
    st.open = null
  }

  const btnBase =
    'flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border text-xs cursor-pointer outline-none transition-colors '
  const btnIdle =
    'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
  const btnEmpty =
    'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
  const dropBase =
    'absolute left-0 right-0 mt-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl z-[60] transition-all origin-top '
  const dropShow = 'opacity-100 scale-y-100'
  const dropHide = 'opacity-0 scale-y-95 pointer-events-none'
  const chipOn =
    'border-violet-400 bg-violet-500/15 text-violet-600 dark:text-violet-300'
  const chipOff =
    'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'

  return html`
    <div class="overflow-visible">
      <div
        class="grid gap-x-2 @sm:gap-x-3 gap-y-2 items-center overflow-visible grid-cols-[2.5rem_1fr_2rem_auto] @sm:grid-cols-[3.5rem_1fr_2.5rem_auto]"
      >
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"></span>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Drink</span>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Size</span>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Extras</span>

        ${() => st.rows.map((row, i) => {
          const dk = i + '-drink'
          const sk = i + '-size'
          const isLast = i === st.rows.length - 1
          return html`
            <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">${row.name}</span>

            <div class="relative overflow-visible">
              <button
                @click="${() => toggleOpen(dk)}"
                class="${() => btnBase + (st.rows[i].drink ? btnIdle : btnEmpty)}"
              >
                <span class="truncate">${() => st.rows[i].drink || 'Select\u2026'}</span>
                ${chevron}
              </button>
              <div
                class="${() => dropBase + (st.open === dk ? dropShow : dropHide)}"
              >
                ${drinks.map(
                  (d) => html`
                    <button
                      @click="${() => setDrink(i, d)}"
                      class="${() =>
                        'w-full text-left px-2.5 py-1.5 text-xs cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg outline-none ' +
                        (st.rows[i].drink === d
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300 font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50')}"
                    >
                      ${d}
                    </button>
                  `
                )}
              </div>
            </div>

            <div class="relative">
              <button
                @click="${() => toggleOpen(sk)}"
                class="${() => btnBase + btnIdle + ' justify-center'}"
              >
                <span>${() => st.rows[i].size}</span>
              </button>
              <div
                class="${() =>
                  dropBase + 'min-w-[4rem] ' + (st.open === sk ? dropShow : dropHide)}"
              >
                ${coffeeSizes.map(
                  (s) => html`
                    <button
                      @click="${() => setSize(i, s)}"
                      class="${() =>
                        'w-full text-center px-2 py-1.5 text-xs cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg outline-none ' +
                        (st.rows[i].size === s
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300 font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50')}"
                    >
                      ${s}
                    </button>
                  `
                )}
              </div>
            </div>

            <div class="flex gap-1 flex-wrap">
              ${extras.map(
                (e) => html`
                  <button
                    @click="${() => toggleExtra(i, e.id)}"
                    class="${() =>
                      'px-1.5 py-0.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer outline-none ' +
                      (st.rows[i].extras.includes(e.id) ? chipOn : chipOff)}"
                  >
                    ${() => (st.rows[i].extras.includes(e.id) ? '\u2713 ' : '')}${e.label}
                  </button>
                `
              )}
            </div>
          `
        })}
      </div>
      <div class="relative mt-2 overflow-visible">
        <button
          @click="${() => toggleOpen('add')}"
          class="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-arrow-500 dark:hover:text-arrow-400 transition-colors cursor-pointer outline-none"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 3v6M3 6h6" /></svg>
          Add team-mate
        </button>
        <div
          class="${() =>
            'absolute left-0 bottom-full mb-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl z-[60] transition-all origin-bottom min-w-[8rem] ' +
            (st.open === 'add' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none')}"
        >
          ${() => {
            const taken = st.rows.map((r: { name: string }) => r.name)
            return allNames
              .filter((n) => !taken.includes(n))
              .map(
                (n) => html`
                  <button
                    @click="${() => addMember(n)}"
                    class="w-full text-left px-2.5 py-1.5 text-xs cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg outline-none text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    ${n}
                  </button>
                `
              )
          }}
        </div>
      </div>
    </div>
  `
})

// ============================================================
// Scenario 4 — Cocktail Scaler
// ============================================================

const cocktail = {
  name: 'Classic Margarita',
  base: 1,
  ingredients: [
    { name: 'Tequila Blanco', amount: 2, unit: 'oz' },
    { name: 'Fresh Lime Juice', amount: 1, unit: 'oz' },
    { name: 'Cointreau', amount: 0.75, unit: 'oz' },
    { name: 'Agave Syrup', amount: 0.5, unit: 'oz' },
    { name: 'Limes', amount: 0.25, unit: '', whole: true },
  ],
  steps: 'Run a lime wedge around each glass rim and dip in salt. Combine tequila, lime juice, Cointreau, and agave in a shaker with ice. Shake hard for 15 seconds, strain into glasses over fresh ice, and garnish with a lime wheel.',
}

export const CocktailScaler = component(() => {
  const st = reactive({ servings: 6 })

  function fmt(n: number): string {
    if (n === Math.floor(n)) return String(n)
    const frac = n - Math.floor(n)
    const base = Math.floor(n)
    if (Math.abs(frac - 0.25) < 0.01) return (base ? base + ' ' : '') + '\u00BC'
    if (Math.abs(frac - 0.5) < 0.01) return (base ? base + ' ' : '') + '\u00BD'
    if (Math.abs(frac - 0.75) < 0.01) return (base ? base + ' ' : '') + '\u00BE'
    return n.toFixed(1)
  }

  return html`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            src="/margarita-thumb.jpg"
            alt="Classic Margarita"
            class="w-8 h-8 @sm:w-10 @sm:h-10 rounded-lg object-cover"
          />
          <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">${cocktail.name}</span>
        </div>
        <div class="flex items-center gap-1.5 @sm:gap-2">
          <button
            @click="${() => { if (st.servings > 1) st.servings-- }}"
            class="w-6 h-6 @sm:w-7 @sm:h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs @sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:border-rose-400 hover:text-rose-500 cursor-pointer outline-none transition-colors"
          >\u2212</button>
          <span class="text-base @sm:text-lg font-extrabold text-zinc-900 dark:text-white min-w-[1.5rem] @sm:min-w-[2rem] text-center">${() => st.servings}</span>
          <button
            @click="${() => { if (st.servings < 12) st.servings++ }}"
            class="w-6 h-6 @sm:w-7 @sm:h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs @sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:border-rose-400 hover:text-rose-500 cursor-pointer outline-none transition-colors"
          >+</button>
          <span class="text-[11px] text-zinc-400 dark:text-zinc-500">${() => st.servings === 1 ? 'serving' : 'servings'}</span>
        </div>
      </div>

      <div class="space-y-1.5">
        ${cocktail.ingredients.map(
          (ing) => html`
            <div class="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
              <span class="text-xs text-zinc-600 dark:text-zinc-400">${ing.name}</span>
              <span class="text-xs font-semibold text-zinc-900 dark:text-white">
                ${() => {
                  const val = ing.amount * st.servings
                  return ((ing as { whole?: boolean }).whole ? String(Math.ceil(val)) : fmt(val)) + (ing.unit ? ' ' + ing.unit : '')
                }}
              </span>
            </div>
          `
        )}
      </div>

      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed">${cocktail.steps}</p>
    </div>
  `
})

// ============================================================
// Scenario 5 — D&D Character Creator
// ============================================================

const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Tiefling']
const classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Bard']
const abilityNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
type AbilityName = typeof abilityNames[number]

const raceBonuses: Record<string, Record<string, number>> = {
  Human: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
  Elf: { DEX: 2, INT: 1 },
  Dwarf: { CON: 2, WIS: 1 },
  Halfling: { DEX: 2, CHA: 1 },
  Dragonborn: { STR: 2, CHA: 1 },
  Tiefling: { CHA: 2, INT: 1 },
}

function modifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? '+' + mod : String(mod)
}

export const DndCreator = component(() => {
  const st = reactive({
    race: 'Elf',
    cls: 'Wizard',
    raceOpen: false,
    clsOpen: false,
    scores: { STR: 8, DEX: 14, CON: 12, INT: 15, WIS: 10, CHA: 10 },
    budget: 27,
  })

  function pointCost(score: number): number {
    if (score <= 13) return score - 8
    return 5 + (score - 13) * 2
  }

  function spent(): number {
    return abilityNames.reduce((sum, a) => sum + pointCost(st.scores[a]), 0)
  }

  function canInc(a: AbilityName): boolean {
    return st.scores[a] < 15 && spent() < st.budget
  }

  function canDec(a: AbilityName): boolean {
    return st.scores[a] > 8
  }

  function totalScore(a: AbilityName): number {
    return st.scores[a] + (raceBonuses[st.race]?.[a] || 0)
  }

  function selectRace(r: string) { st.race = r; st.raceOpen = false }
  function selectCls(c: string) { st.cls = c; st.clsOpen = false }

  const dBtn = 'flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold cursor-pointer outline-none transition-colors hover:border-red-300 dark:hover:border-red-800 text-zinc-800 dark:text-zinc-200'
  const dPanel = 'absolute left-0 right-0 mt-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl z-[60] transition-all origin-top '
  const dItem = 'w-full text-left px-2.5 py-1.5 text-xs cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg outline-none text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
  const dSel = ' font-semibold text-red-600 dark:text-red-400'
  const chev = html`<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-400"><path d="M3 4.5l3 3 3-3" /></svg>`
  const pm = (on: boolean) => 'w-5 h-5 @sm:w-6 @sm:h-6 rounded-md border flex items-center justify-center text-[11px] font-bold cursor-pointer outline-none transition-all ' + (on ? 'border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:border-red-400 hover:text-red-500 active:bg-red-50 dark:active:bg-red-500/10' : 'border-zinc-100 dark:border-zinc-800 text-zinc-200 dark:text-zinc-700 cursor-default')

  return html`
    <div class="space-y-4 overflow-visible">
      <div class="grid grid-cols-2 gap-3 overflow-visible">
        <div class="relative overflow-visible">
          <label class="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Race</label>
          <button @click="${() => { st.raceOpen = !st.raceOpen; st.clsOpen = false }}" class="${dBtn + ' w-full mt-1'}">
            <span>${() => st.race}</span>
            ${chev}
          </button>
          <div class="${() => dPanel + (st.raceOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none')}">
            ${races.map((r) => html`
              <button @click="${() => selectRace(r)}" class="${() => dItem + (st.race === r ? dSel : '')}">${r}</button>
            `)}
          </div>
        </div>
        <div class="relative overflow-visible">
          <label class="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Class</label>
          <button @click="${() => { st.clsOpen = !st.clsOpen; st.raceOpen = false }}" class="${dBtn + ' w-full mt-1'}">
            <span>${() => st.cls}</span>
            ${chev}
          </button>
          <div class="${() => dPanel + (st.clsOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none')}">
            ${classes.map((c) => html`
              <button @click="${() => selectCls(c)}" class="${() => dItem + (st.cls === c ? dSel : '')}">${c}</button>
            `)}
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3 text-xs">
            <span class="text-zinc-400 dark:text-zinc-500">HP <strong class="text-zinc-800 dark:text-zinc-200 ml-0.5">${() => {
              const conMod = Math.floor((totalScore('CON') - 10) / 2)
              const hd: Record<string, number> = { Fighter: 10, Wizard: 6, Rogue: 8, Cleric: 8, Ranger: 10, Bard: 8 }
              return (hd[st.cls] || 8) + conMod
            }}</strong></span>
            <span class="text-zinc-400 dark:text-zinc-500">AC <strong class="text-zinc-800 dark:text-zinc-200 ml-0.5">${() => 10 + Math.floor((totalScore('DEX') - 10) / 2)}</strong></span>
            <span class="text-zinc-400 dark:text-zinc-500">Init <strong class="text-zinc-800 dark:text-zinc-200 ml-0.5">${() => modifier(totalScore('DEX'))}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 w-12 overflow-hidden">
              <div class="${() => 'h-full rounded-full transition-all bg-red-500 dark:bg-red-400'}" style="${() => 'width:' + Math.min(100, (spent() / st.budget) * 100) + '%'}"></div>
            </div>
            <span class="${() => 'text-[10px] font-bold tabular-nums ' + (spent() >= st.budget ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500')}">${() => spent()}/${st.budget}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 @sm:grid-cols-3 gap-2 @sm:gap-2.5 text-center">
          ${abilityNames.map(
            (a) => html`
              <div class="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 py-2 @sm:py-3 px-1.5 @sm:px-2 flex flex-col items-center">
                <div class="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">${a}</div>
                <div class="text-2xl @sm:text-3xl font-extrabold text-zinc-900 dark:text-white leading-none mt-1">${() => totalScore(a)}</div>
                <div class="text-xs font-bold text-red-500 dark:text-red-400 mt-0.5">${() => modifier(totalScore(a))}</div>
                ${() => {
                  const bonus = raceBonuses[st.race]?.[a]
                  return bonus ? html`<div class="text-[9px] font-semibold text-emerald-500 mt-0.5">+${bonus} racial</div>` : ''
                }}
                <div class="flex items-center justify-center gap-1.5 mt-auto pt-2">
                  <button
                    @click="${() => { if (canDec(a)) st.scores[a]-- }}"
                    class="${() => pm(canDec(a))}"
                  >\u2212</button>
                  <button
                    @click="${() => { if (canInc(a)) st.scores[a]++ }}"
                    class="${() => pm(canInc(a))}"
                  >+</button>
                </div>
              </div>
            `
          )}
        </div>
      </div>
    </div>
  `
})

// ============================================================
// Scenario 6 — Leaflet Map Search
// ============================================================

const mapResults = [
  { name: 'The Whiskey Jar', type: 'Southern', rating: 4.7, lat: 38.03087, lng: -78.48455 },
  { name: 'Zocalo', type: 'Latin', rating: 4.8, lat: 38.03076, lng: -78.48034 },
  { name: 'Rapture', type: 'New American', rating: 4.6, lat: 38.03037, lng: -78.47983 },
  { name: 'Caf\xE9 Frank', type: 'Franco-Italian', rating: 4.8, lat: 38.03040, lng: -78.47950 },
  { name: 'The Nook', type: 'American Diner', rating: 4.6, lat: 38.03006, lng: -78.47879 },
]

let leafletLoaded: Promise<void> | null = null

function loadLeaflet(): Promise<void> {
  if (leafletLoaded) return leafletLoaded
  leafletLoaded = new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return leafletLoaded
}

export const MapSearch = component(() => {
  const st = reactive({ selected: -1 })
  const mapId = 'hero-map-' + Math.random().toString(36).slice(2, 8)
  let mapInstance: unknown = null

  function initMap() {
    if (typeof window === 'undefined') return
    loadLeaflet().then(() => {
      const L = (window as unknown as { L: {
        map: (id: string, opts?: Record<string, unknown>) => {
          setView: (c: [number, number], z: number) => unknown
          invalidateSize: () => void
        }
        tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (m: unknown) => void }
        circleMarker: (c: [number, number], opts?: Record<string, unknown>) => {
          addTo: (m: unknown) => {
            bindPopup: (s: string) => {
              on: (e: string, fn: () => void) => unknown
            }
          }
          bindPopup: (s: string) => unknown
          on: (e: string, fn: () => void) => unknown
        }
      } }).L
      const el = document.getElementById(mapId)
      if (!el || mapInstance) return
      const map = L.map(mapId, { zoomControl: false, attributionControl: false })
      map.setView([38.03050, -78.48150], 16)
      mapInstance = map
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      L.tileLayer(
        isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(map)
      mapResults.forEach((r, i) => {
        L.circleMarker([r.lat, r.lng], {
          radius: 7,
          fillColor: '#8b5cf6',
          color: '#7c3aed',
          weight: 2,
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(r.name)
          .on('click', () => { st.selected = i })
      })
      setTimeout(() => map.invalidateSize(), 100)
    })
  }

  if (typeof window !== 'undefined') {
    setTimeout(initMap, 50)
  }

  return html`
    <div class="space-y-3">
      <div
        id="${mapId}"
        class="w-full h-40 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
      ></div>
      <div class="space-y-1.5">
        ${mapResults.map(
          (r, i) => html`
            <button
              @click="${() => { st.selected = st.selected === i ? -1 : i }}"
              class="${() =>
                'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left cursor-pointer outline-none transition-all ' +
                (st.selected === i
                  ? 'border-violet-500/50 bg-violet-500/10 dark:bg-violet-500/15'
                  : 'border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600')}"
            >
              <div>
                <div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">${r.name}</div>
                <div class="text-[11px] text-zinc-500 dark:text-zinc-400">${r.type}</div>
              </div>
              <div class="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="#facc15"><path d="M8 1l2.2 4.6L15 6.3l-3.5 3.5.8 4.8L8 12.4l-4.3 2.2.8-4.8L1 6.3l4.8-.7z"/></svg>
                <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">${r.rating}</span>
              </div>
            </button>
          `
        )}
      </div>
    </div>
  `
})

// ============================================================
// Scenario registry
// ============================================================

export interface ChatMessage {
  role: 'user' | 'agent'
  text: string
}

export interface Scenario {
  id: string
  label: string
  messages: ChatMessage[]
  ui: () => unknown
}

export const scenarios: Scenario[] = [
  {
    id: 'hvac',
    label: 'Comparing Quotes',
    messages: [
      { role: 'user', text: "Here are the 3 HVAC quotes. Which one\u2019s the best deal?" },
      { role: 'agent', text: "I\u2019ve broken down the key details from each quote. Here\u2019s a side-by-side:" },
    ],
    ui: HvacComparison,
  },
  {
    id: 'dashboard',
    label: 'API Monitoring',
    messages: [
      { role: 'user', text: "How\u2019s the API doing after yesterday\u2019s deploy?" },
      { role: 'agent', text: "I pulled your latest metrics. Here\u2019s a quick view:" },
    ],
    ui: ApiDashboard,
  },
  {
    id: 'coffee',
    label: 'Team Coffee Order',
    messages: [
      { role: 'user', text: 'Can you put together a coffee order for the team meeting?' },
      { role: 'agent', text: "Here\u2019s a builder \u2014 pick drinks and customize:" },
    ],
    ui: CoffeeBuilder,
  },
  {
    id: 'cocktail',
    label: 'Cocktail Recipe',
    messages: [
      { role: 'user', text: 'I need to make margaritas for 6\u20138 people tonight. What do I need?' },
      { role: 'agent', text: 'Here\u2019s the recipe scaled up \u2014 adjust the count to match your crowd:' },
    ],
    ui: CocktailScaler,
  },
  {
    id: 'dnd',
    label: 'Character Builder',
    messages: [
      { role: 'user', text: 'Help me roll up a new D&D character for tonight\u2019s session.' },
      { role: 'agent', text: 'Here\u2019s a point-buy character builder. Pick your race and class, then allocate ability scores:' },
    ],
    ui: DndCreator,
  },
  {
    id: 'map',
    label: 'Restaurant Search',
    messages: [
      { role: 'user', text: 'What are the best lunch spots on the downtown mall in Charlottesville?' },
      { role: 'agent', text: 'Here are 5 top-rated spots right on or near the mall:' },
    ],
    ui: MapSearch,
  },
]
