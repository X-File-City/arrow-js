import { html } from '@arrow-js/core'
import { RunnerApp } from './RunnerApp'

const root = document.getElementById('app')

if (!root) {
  throw new Error('Missing #app root')
}

html`${RunnerApp()}`(root)
