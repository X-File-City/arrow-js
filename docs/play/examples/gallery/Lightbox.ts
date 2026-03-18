import { component, html } from '@arrow-js/core'

export const Lightbox = component(
  (props: {
    src: string
    index: number
    total: number
    onClose: () => void
    onPrev: () => void
    onNext: () => void
  }) => {
    return html`<div
      class="gal-overlay"
      @click="${(e: MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains('gal-overlay')) {
          props.onClose()
        }
      }}"
    >
      <button class="gal-close" @click="${() => props.onClose()}">×</button>
      <button class="gal-arrow gal-arrow--prev" @click="${() => props.onPrev()}">‹</button>
      <img class="gal-full" src="${() => props.src}" alt="" />
      <button class="gal-arrow gal-arrow--next" @click="${() => props.onNext()}">›</button>
      <span class="gal-counter">${() => props.index + 1} / ${() => props.total}</span>
    </div>`
  }
)
