import { html } from '@arrow-js/core'
import { GalleryApp } from './GalleryApp'

const root = document.getElementById('app')

if (!root) {
  throw new Error('Missing #app root')
}

html`${GalleryApp()}`(root)
