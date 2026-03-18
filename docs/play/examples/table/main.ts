import { html } from '@arrow-js/core'
import { TableApp } from './TableApp'

const root = document.getElementById('app')

if (!root) {
  throw new Error('Missing #app root')
}

html`${TableApp()}`(root)
