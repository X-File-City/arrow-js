import { component, html } from '@arrow-js/core'

export const TableRow = component((props: {
  id: number
  name: string
  species: string
  tricks: number
}) =>
  html`<div class="tbl-row">
    <div class="tbl-cell tbl-name">${() => props.name}</div>
    <div class="tbl-cell"><span class="tbl-badge">${() => props.species}</span></div>
    <div class="tbl-cell tbl-tricks">${() => props.tricks}</div>
  </div>`
)
