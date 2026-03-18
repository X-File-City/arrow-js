import { component, html } from '@arrow-js/core'

export const TabPanel = component((props: { id: string; active: boolean }) => {
  const content = () => {
    switch (props.id) {
      case 'menu':
        return html`<div class="panel-content">
          <ul class="menu-list">
            <li class="menu-item"><span>Drip Coffee</span><span class="menu-price">$3.50</span></li>
            <li class="menu-item"><span>Oat Latte</span><span class="menu-price">$5.75</span></li>
            <li class="menu-item"><span>Cold Brew</span><span class="menu-price">$4.50</span></li>
            <li class="menu-item"><span>Matcha Latte</span><span class="menu-price">$6.00</span></li>
            <li class="menu-item"><span>Chai Tea</span><span class="menu-price">$4.25</span></li>
          </ul>
        </div>`
      case 'hours':
        return html`<div class="panel-content">
          <ul class="hours-list">
            <li class="hours-row"><span>Monday \u2013 Friday</span><span>7:00 AM \u2013 6:00 PM</span></li>
            <li class="hours-row"><span>Saturday</span><span>8:00 AM \u2013 5:00 PM</span></li>
            <li class="hours-row"><span>Sunday</span><span>9:00 AM \u2013 3:00 PM</span></li>
          </ul>
          <div class="feature-card">
            <span class="feature-card-icon">\u2600</span>
            <div>
              <strong>Patio seating</strong>
              <p>Weather permitting, our garden patio is open with
              full table service on weekends.</p>
            </div>
          </div>
        </div>`
      case 'about':
        return html`<div class="panel-content">
          <p class="panel-intro">
            The Daily Grind has been serving handcrafted coffee since 2012.
            We source our beans directly from small farms in Colombia
            and Ethiopia, and roast in-house every Tuesday and Friday.
          </p>
          <ul class="checklist">
            <li class="check-item">\u2713<span>Single-origin beans roasted in-house</span></li>
            <li class="check-item">\u2713<span>Oat, almond, and coconut milk</span></li>
            <li class="check-item">\u2713<span>Fresh pastries from local bakeries</span></li>
            <li class="check-item">\u2713<span>Free Wi-Fi and cozy reading nooks</span></li>
          </ul>
        </div>`
      default:
        return html`<div class="panel-content"><p>Unknown tab.</p></div>`
    }
  }

  return html`<div
    class="tab-panel"
    role="tabpanel"
    id="${() => `panel-${props.id}`}"
    aria-labelledby="${() => `tab-${props.id}`}"
    data-active="${() => String(props.active)}"
  >${() => content()}</div>`
})
