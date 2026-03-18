import { html } from '@arrow-js/core'
import { TabsApp } from './TabsApp'

const root = document.getElementById('app')

if (!root) {
  throw new Error('Missing #app root')
}

html`${TabsApp()}`(root)
