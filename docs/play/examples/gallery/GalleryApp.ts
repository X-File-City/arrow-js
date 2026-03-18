import { component, html, reactive } from '@arrow-js/core'
import { Lightbox } from './Lightbox'

const photos = [10, 11, 13, 14, 15, 16, 17, 18, 19].map((id) => ({
  id,
  thumb: `https://picsum.photos/id/${id}/300/200`,
  full: `https://picsum.photos/id/${id}/800/600`,
}))

export const GalleryApp = component(() => {
  const state = reactive({ open: -1 })

  const open = (i: number) => { state.open = i }
  const close = () => { state.open = -1 }
  const prev = () => { state.open = (state.open - 1 + photos.length) % photos.length }
  const next = () => { state.open = (state.open + 1) % photos.length }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (state.open < 0) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
  })

  return html`<main class="gal">
    <header class="gal-header">
      <h1>Gallery</h1>
      <span class="gal-count">${photos.length} photos</span>
    </header>

    <section class="gal-grid">
      ${photos.map(
        (photo, i) => html`
          <button class="gal-thumb" @click="${() => open(i)}">
            <img src="${photo.thumb}" alt="" loading="lazy" />
          </button>
        `
      )}
    </section>

    ${() =>
      state.open >= 0
        ? Lightbox({
            src: photos[state.open].full,
            index: state.open,
            total: photos.length,
            onClose: close,
            onPrev: prev,
            onNext: next,
          })
        : ''}
  </main>`
})
