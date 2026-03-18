import { component, html, reactive } from '@arrow-js/core'
import { TableRow } from './TableRow'

type Pet = { id: number; name: string; species: string; tricks: number }

const data: Pet[] = [
  { id: 1, name: 'Biscuit', species: 'Dog', tricks: 14 },
  { id: 2, name: 'Whiskers', species: 'Cat', tricks: 3 },
  { id: 3, name: 'Captain Fluff', species: 'Hamster', tricks: 7 },
  { id: 4, name: 'Nugget', species: 'Dog', tricks: 11 },
  { id: 5, name: 'Pickles', species: 'Cat', tricks: 2 },
  { id: 6, name: 'Sir Hops', species: 'Rabbit', tricks: 5 },
  { id: 7, name: 'Waffles', species: 'Dog', tricks: 9 },
  { id: 8, name: 'Mochi', species: 'Cat', tricks: 6 },
  { id: 9, name: 'Turbo', species: 'Hamster', tricks: 12 },
]

type SortKey = 'name' | 'species' | 'tricks'

export const TableApp = component(() => {
  const state = reactive({
    sortBy: 'tricks' as SortKey,
    asc: false,
  })

  const sorted = () => {
    const key = state.sortBy
    const dir = state.asc ? 1 : -1
    return [...data].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (typeof av === 'string') return dir * av.localeCompare(bv as string)
      return dir * ((av as number) - (bv as number))
    })
  }

  const toggleSort = (key: SortKey) => {
    if (state.sortBy === key) {
      state.asc = !state.asc
    } else {
      state.sortBy = key
      state.asc = true
    }
  }

  const indicator = (key: SortKey) =>
    state.sortBy === key ? (state.asc ? '\u2191' : '\u2193') : '\u2195'

  const columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'species', label: 'Species' },
    { key: 'tricks', label: 'Tricks' },
  ]

  return html`<main class="tbl">
    <header class="tbl-header">
      <h1>Pet Tricks</h1>
      <span class="tbl-count">${data.length} pets</span>
    </header>

    <div class="tbl-card">
      <div class="tbl-head">
        ${columns.map(
          (col) => html`<button
            class="tbl-th"
            data-active="${() => String(state.sortBy === col.key)}"
            @click="${() => toggleSort(col.key)}"
          >${col.label} <span class="tbl-indicator">${() => indicator(col.key)}</span></button>`
        )}
      </div>
      <div class="tbl-body">
        ${() =>
          sorted().map((pet) =>
            TableRow({
              id: pet.id,
              name: pet.name,
              species: pet.species,
              tricks: pet.tricks,
            }).key(pet.id)
          )}
      </div>
    </div>
  </main>`
})
