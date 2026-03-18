import { html } from '@arrow-js/core'
import {
  docsExampleMeta,
  playgroundExampleHref,
  starterExampleId,
} from '../../../play/example-meta.js'
import { CliCommand } from '../../components/CliCommand'

/**
 * All docs content sections. Each is a plain function — no local state needed
 * for static documentation content. The component() wrapper is reserved for
 * interactive widgets with local state.
 */

export function WhyArrow() {
  return html`
    <section id="why-arrow" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Why Arrow
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Arrow is a small reactive UI framework built around platform primitives:
          JavaScript modules, functions, and template literals. Arrow is just TypeScript, so your coding agent already knows how to use it really well.
        </p>
        <p>
          You only need 3 functions:
          <ul>
            <li><code>html</code></li>
            <li><code>reactive</code></li>
            <li><code>component</code></li>
          </ul>
        </p>
        <p>
           Unlike other major frameworks, there is no "idomatic" way to use Arrow since it's just TypeScript functions and template literals. The entire documentation fits in less than 5% of a 200k context window.
        </p>
        <p>
          Arrow requires no build step, no JSX compilation, no React compiler, no Vite plugin (there is one if you need SSR), no Vue template complier, and yet it runs incredibly fast at with less than 5kb over the wire. It's perfect for things like inline interfaces produced by chat agents.
        </p>
      </div>
    </section>
  `
}

export function Quickstart() {
  return html`
    <section id="quick-start" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Quickstart
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Scaffold a complete Vite 8 Arrow app with SSR, hydration, route-based
          metadata, and the full framework stack in one command:
        </p>

        ${CliCommand()}

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-6">
          Client only
        </h3>
        <p>
          If you only need the tiny client runtime:
        </p>
        <div class="code-block">
          <pre><code class="language-shell">pnpm add @arrow-js/core</code></pre>
        </div>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Editor support
        </h3>
        <p>
          If you're still using an IDE you can use the <a href="https://marketplace.visualstudio.com/items?itemName=StandardAgents.arrowjs-syntax">ArrowJS VSCode extension</a> to get syntax highlighting for the html template literals.
        </p>
      </div>
    </section>
  `
}

export function Components() {
  return html`
    <section id="components" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Components
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Arrow components are plain functions wrapped with
          <code>component()</code>. A component mounts once per render slot and
          keeps local state while that slot survives parent rerenders.
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Pass a reactive object as props.</li>
          <li>
            Read props lazily inside expressions like
            <code>() =&gt; props.count</code>.
          </li>
          <li>
            Keep local component state with <code>reactive()</code> inside the
            component.
          </li>
          <li>
            Use <code>.key(...)</code> when rendering components in keyed lists.
          </li>
        </ul>

        <div class="code-block">
          <pre><code class="language-ts">import { component, html, reactive } from '@arrow-js/core'
import type { Props } from '@arrow-js/core'

const parentState = reactive({ count: 1 })

const Counter = component((props: Props&lt;{ count: number }&gt;) =&gt; {
  const local = reactive({ clicks: 0 })

  return html\`&lt;button @click="\${() =&gt; local.clicks++}"&gt;
    Root count \${() =&gt; props.count} | Local clicks \${() =&gt; local.clicks}
  &lt;/button&gt;\`
})

html\`\${Counter(parentState)}\`</code></pre>
        </div>

        <div class="callout callout-tip">
          <div class="callout-label">Key concept</div>
          <p>
            The component function itself is not rerun on every parent update.
            Arrow keeps the instance for that slot and retargets its props when
            needed. That makes local state stable across higher-order rerenders.
          </p>
        </div>

        <p>
          If you only want part of a larger reactive object, use
          <code>pick(source, ...keys)</code> to create a live narrowed prop view
          without writing a call-site closure.
        </p>

        <div class="code-block">
          <pre><code class="language-ts">import { component, html, pick, reactive } from '@arrow-js/core'

const state = reactive({ count: 1, theme: 'dark' })
const Counter = component((props) =&gt;
  html\`&lt;strong&gt;\${() =&gt; props.count}&lt;/strong&gt;\`
)

html\`\${Counter(pick(state, 'count'))}\`</code></pre>
        </div>

        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            Props stay live when you read them lazily. Avoid destructuring them
            once at component creation time if you expect updates.
          </p>
        </div>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Async components
        </h3>
        <p>
          The same core <code>component()</code> also accepts async factories
          when the Arrow async runtime is present:
        </p>

        <div class="code-block">
          <pre><code class="language-ts">import { component, html } from '@arrow-js/core'

type User = { id: string; name: string }

const UserName = component(async ({ id }: { id: string }) =&gt; {
  const user = await fetch(\`/api/users/\${id}\`)
    .then((r) =&gt; r.json() as Promise&lt;User&gt;)
  return user.name
})

const UserCard = component((props: { id: string }) =&gt;
  html\`&lt;article&gt;\${UserName(props)}&lt;/article&gt;\`
)</code></pre>
        </div>

        <p>
          The async body resolves data, and the surrounding template stays
          reactive in the usual Arrow way. SSR waits for async components to
          settle, and hydration resumes JSON-safe results from serialized
          payload data automatically.
        </p>

        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            Most async components need no extra options. Arrow assigns ids,
            snapshots JSON-safe results, and renders resolved values directly by
            default. Reach for <code>fallback</code>, <code>render</code>,
            <code>serialize</code>, <code>deserialize</code>, or
            <code>idPrefix</code> only when the default behavior is not enough.
          </p>
        </div>
      </div>
    </section>
  `
}

export function ReactiveData() {
  return html`
    <section id="reactive-data" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Reactive Data
        <code class="text-lg ml-2">r</code>
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          <code>reactive(value)</code> or <code>reactive(() =&gt; value)</code>
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Wrap objects or arrays to create observable state.</li>
          <li>Pass an expression to create a computed value.</li>
          <li>
            Use it for local component state, shared stores, and mutable props.
          </li>
          <li>
            Read properties normally. Arrow tracks those reads inside watchers
            and template expressions.
          </li>
          <li>
            Use <code>$on</code> and <code>$off</code> when you want manual
            subscriptions.
          </li>
        </ul>

        <div class="code-block">
          <pre><code class="language-ts">import { reactive } from '@arrow-js/core'

const data = reactive({
  price: 25,
  quantity: 10
})

console.log(data.price) // 25</code></pre>
        </div>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Computed values
        </h3>
        <p>
          <code>reactive(() =&gt; value)</code> reruns when its tracked reads
          change.
        </p>

        <div class="code-block">
          <pre><code class="language-ts">import { reactive } from '@arrow-js/core'

const props = reactive({ count: 2, multiplier: 10 })

const data = reactive({
  total: reactive(() =&gt; props.count * props.multiplier)
})

console.log(data.total) // 20
props.count = 3
console.log(data.total) // 30</code></pre>
        </div>

        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            <code>data.total</code> reads like a normal value even though it is
            backed by a tracked expression.
          </p>
        </div>
      </div>
    </section>
  `
}

export function WatchingData() {
  return html`
    <section id="watching-data" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Watching Data
        <code class="text-lg ml-2">w</code>
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          <code>watch(effect)</code> or
          <code>watch(getter, afterEffect)</code>
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Use it for derived side effects outside templates.</li>
          <li>
            Dependencies are discovered automatically from reactive reads.
          </li>
          <li>
            Arrow also drops dependencies that are no longer touched on later
            runs.
          </li>
        </ul>

        <p>Single-effect form:</p>
        <div class="code-block">
          <pre><code class="language-ts">import { reactive, watch } from '@arrow-js/core'

const data = reactive({ price: 25, quantity: 10, logTotal: true })

watch(() =&gt; {
  if (data.logTotal) {
    console.log(\`Total: \${data.price * data.quantity}\`)
  }
})</code></pre>
        </div>

        <p>Getter plus effect form:</p>
        <div class="code-block">
          <pre><code class="language-ts">import { reactive, watch } from '@arrow-js/core'

const data = reactive({ price: 25, quantity: 10, logTotal: true })

watch(
  () =&gt; data.logTotal ? data.price * data.quantity : null,
  (total) =&gt; total !== null && console.log(\`Total: \${total}\`)
)</code></pre>
        </div>
      </div>
    </section>
  `
}

export function Templates() {
  return html`
    <section id="templates" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Templates
        <code class="text-lg ml-2">t</code>
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p><code>html\`...\`</code> &mdash; create a mountable template</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            Templates can be mounted directly, passed around, or returned from
            components.
          </li>
          <li>
            Arrow is static by default. Expressions only stay live when they are
            functions.
          </li>
          <li>
            Templates can render text, attributes, properties, lists, nested
            templates, and events.
          </li>
        </ul>

        <p>Static expressions render once. Function expressions stay live.</p>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Attributes
        </h3>
        <p>Use a function expression to keep an attribute in sync.</p>
        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            Returning <code>false</code> from an attribute expression will
            remove the attribute. This makes it easy to toggle attributes.
          </p>
        </div>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Properties
        </h3>
        <p>Prefix an attribute with <code>.</code> to write an IDL property.</p>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Lists
        </h3>
        <p>
          Return an array of templates to render a list. Add
          <code>.key(...)</code> when identity must survive reorders.
        </p>
        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            Keys are only necessary if you want to preserve the DOM nodes and
            their state. Avoid using the index as a key.
          </p>
        </div>

        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white pt-4">
          Events
        </h3>
        <p><code>@eventName</code> attaches an event listener.</p>
        <div class="code-block">
          <pre><code class="language-ts">import { html } from '@arrow-js/core'

html\`&lt;button @click="\${(e) =&gt; console.log(e)}"&gt;Click&lt;/button&gt;\`</code></pre>
        </div>
      </div>
    </section>
  `
}

export function ServerRendering() {
  return html`
    <section id="ssr" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Server Rendering
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          <code>render(root, view)</code> and
          <code>renderToString(view)</code>
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <code>@arrow-js/core</code> stays DOM-first and framework-agnostic.
          </li>
          <li>
            <code>@arrow-js/framework</code> adds async render tracking and
            boundaries.
          </li>
          <li><code>@arrow-js/ssr</code> renders HTML and payload data.</li>
          <li>
            <code>@arrow-js/hydrate</code> resumes the same view in the browser.
          </li>
        </ul>
        <p>
          During SSR, <code>renderToString()</code> waits for nested async
          components and dependent async work before it returns HTML.
        </p>
      </div>
    </section>

    <section id="hydration" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Hydration
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          <code>hydrate(root, view, payload)</code>
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>The server emits HTML plus a small JSON payload.</li>
          <li>
            The client stages the same view, adopts matching DOM, and reconnects
            reactivity.
          </li>
          <li>
            JSON-safe async results resume from serialized payload data, so
            matching components do not refetch.
          </li>
          <li>
            If a subtree does not match, Arrow repairs marked boundaries before
            falling back further up.
          </li>
        </ul>
      </div>
    </section>

    <section id="ecosystem" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Ecosystem Packages
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>The current split is intentionally simple:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <code>@arrow-js/core</code> exposes <code>reactive</code>,
            <code>watch</code>, <code>html</code>, and the stable
            <code>component</code> primitive.
          </li>
          <li>
            <code>@arrow-js/framework</code> installs the async runtime behind
            <code>component()</code>, and adds <code>boundary()</code> and
            <code>render()</code>.
          </li>
          <li>
            <code>@arrow-js/ssr</code> exposes <code>renderToString()</code> and
            <code>serializePayload()</code>.
          </li>
          <li>
            <code>@arrow-js/hydrate</code> exposes <code>hydrate()</code> and
            <code>readPayload()</code>.
          </li>
        </ul>
        <div class="callout callout-tip">
          <div class="callout-label">Tip</div>
          <p>
            If the default async behavior works for your case, keep the
            component declaration simple. The option bag is for custom
            fallbacks, custom serialization, or easier-to-read SSR ids, not for
            the common case.
          </p>
        </div>
      </div>
    </section>
  `
}

export function Routing() {
  return html`
    <section id="routing" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Routing
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          The Vite scaffold uses a simple <code>createPage(url)</code> entry so
          the server and browser both resolve the same route tree.
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Choose a route from the incoming URL.</li>
          <li>Return the page status, metadata, and Arrow view together.</li>
          <li>
            Reuse the same routing function for SSR and hydration so both sides
            render the same page shape.
          </li>
        </ul>

        <div class="code-block">
          <pre><code class="language-ts">import { html } from '@arrow-js/core'

export function createPage(url: string) {
  if (url === '/') {
    return {
      status: 200,
      title: 'Home',
      view: html\`&lt;main&gt;Home&lt;/main&gt;\`,
    }
  }

  return {
    status: 404,
    title: 'Not Found',
    view: html\`&lt;main&gt;Not found&lt;/main&gt;\`,
  }
}</code></pre>
        </div>
      </div>
    </section>
  `
}

interface ExampleEntry {
  id: string
  title: string
  description: string
  sourceUrl?: string
}

const examples = docsExampleMeta as ExampleEntry[]

export function Examples() {
  return html`
    <section id="examples" class="mb-16">
      <h2
        class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4"
      >
        Examples
      </h2>
      <div class="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Each example runs in the playground with full source you can edit
          live.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          ${examples.map(
            (entry) => html`
              <a
                href="${playgroundExampleHref(entry.id)}"
                class="group block rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 no-underline transition-colors hover:border-arrow-400 dark:hover:border-arrow-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <h3
                  class="text-base font-semibold text-zinc-900 dark:text-white mb-1.5"
                >
                  <span class="mr-1.5 example-icon">${entry.icon}</span>${entry.title}
                </h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  ${entry.description}
                </p>
                <span
                  class="text-sm font-medium text-arrow-600 dark:text-arrow-400 group-hover:underline underline-offset-2"
                >Open in Playground &rarr;</span>
              </a>
            `,
          )}
        </div>

        <a
          href="${playgroundExampleHref(starterExampleId)}"
          class="playground-cta"
        >
          <span class="playground-cta-label">Playground</span>
          <span class="playground-cta-heading">Build something with Arrow</span>
          <span class="playground-cta-desc"
            >Open a live editor with a starter template, hot reloading, and
            every Arrow package ready to import.</span
          >
          <span class="playground-cta-action"
            >Open Playground<span aria-hidden="true"> &rarr;</span></span
          >
        </a>
      </div>
    </section>
  `
}
