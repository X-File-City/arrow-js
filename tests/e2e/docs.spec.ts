import { expect, test } from '@playwright/test'

test('home page is server rendered without javascript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
  })
  const page = await context.newPage()

  await page.goto('/')

  await expect(page.locator('#hero h1')).toContainText('The UI framework for')
  await expect(page.locator('#hero-counter')).toContainText('Clicked 0 times')

  await context.close()
})

test('api page is server rendered without javascript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
  })
  const page = await context.newPage()

  await page.goto('/api')

  await expect(page.locator('h1')).toHaveText('API Reference')
  await expect(page.locator('article')).toContainText('reactive()')
  await expect(page.locator('nav .nav-group-title').first()).toHaveText('@arrow-js/core')
  await expect(page.locator('body')).not.toContainText('Changelog')
  await expect(page.locator('#reactive')).not.toContainText('---cut-start---')
  await expect(page.locator('#reactive')).not.toContainText('---cut-end---')
  await expect(page.locator('#reactive .code-block').first()).toContainText(
    '// Observable state'
  )

  await context.close()
})

test('home page hydrates component state without remounting the app root', async ({
  page,
}) => {
  await trackAppRootReplacements(page)
  await page.goto('/')

  const counter = page.locator('#hero-counter')
  const hero = page.locator('#hero')

  await expect
    .poll(() => page.evaluate(() => window.__arrowAppReplaceChildrenCalls))
    .toBe(0)
  await expect(counter).toHaveText('Clicked 0 times')
  await counter.click()
  await expect(counter).toHaveText('Clicked 1 times')
  await hero.click({ position: { x: 40, y: 40 } })
  await expect(counter).toHaveText('Clicked 1 times')
})

test('home page repairs a tampered counter subtree without remounting the app root', async ({
  page,
}) => {
  await trackAppRootReplacements(page)
  await tamperDocument(page, '/', (html) =>
    injectBeforeModuleScript(
      html,
      '<script>document.getElementById("hero-counter")?.remove()</script>'
    )
  )
  await page.goto('/')

  const counter = page.locator('#hero-counter')

  await expect
    .poll(() => page.evaluate(() => window.__arrowAppReplaceChildrenCalls))
    .toBe(0)
  await expect(counter).toContainText('Clicked 0 times')
  await counter.click()
  await expect(counter).toHaveText('Clicked 1 times')
})

test('api page hydrates the copy menu without remounting the app root', async ({
  page,
}) => {
  await trackAppRootReplacements(page)
  await page.goto('/api')

  const toggle = page.locator('.copy-menu-toggle')
  const dropdown = page.locator('.copy-menu-dropdown')

  await expect
    .poll(() => page.evaluate(() => window.__arrowAppReplaceChildrenCalls))
    .toBe(0)
  await toggle.click()
  await expect(dropdown).toHaveAttribute('data-open', '')
  const article = page.locator('article')
  const box = await article.boundingBox()

  if (!box) {
    throw new Error('Unable to measure api article content.')
  }

  await page.mouse.click(box.x + box.width / 2, box.y + 32)
  await expect(dropdown).not.toHaveAttribute('data-open', '')
})

test('shared header shows icon controls and theme toggle works', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('arrow-theme', 'light')
  })
  await page.goto('/')

  await expect(page.locator('a[aria-label="GitHub"]')).toBeVisible()
  await expect(page.locator('a[aria-label="Follow on X"]')).toBeVisible()
  await expect(page.locator('a.header-nav-link')).toHaveCount(2)

  const html = page.locator('html')
  const toggle = page.getByRole('button', { name: 'Toggle theme' })

  await expect(html).toHaveAttribute('data-theme', 'light')
  await toggle.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
})

test('docs TypeScript examples expose Twoslash hover data', async ({ page }) => {
  const messages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      messages.push(msg.text())
    }
  })

  await page.goto('/')

  await expect
    .poll(() => page.locator('pre.twoslash').count())
    .toBeGreaterThan(8)

  const block = page.locator('pre.twoslash').first()
  await expect(block).toBeVisible()

  const hoverToken = block.locator('.twoslash-hover').first()
  await hoverToken.scrollIntoViewIfNeeded()
  const box = await hoverToken.boundingBox()

  if (!box) {
    throw new Error('Unable to measure Twoslash hover token.')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  await expect(block.locator('.twoslash-popup-container').first()).toBeVisible()
  expect(messages).toEqual([])
})

test('api TypeScript examples expose Twoslash hover data', async ({ page }) => {
  const messages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      messages.push(msg.text())
    }
  })

  await page.goto('/api')

  await expect
    .poll(() => page.locator('article pre.twoslash').count())
    .toBeGreaterThan(10)

  const block = page.locator('article pre.twoslash').first()
  await expect(block).toBeVisible()

  const hoverToken = block.locator('.twoslash-hover').first()
  await hoverToken.scrollIntoViewIfNeeded()
  const box = await hoverToken.boundingBox()

  if (!box) {
    throw new Error('Unable to measure API Twoslash hover token.')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  await expect(block.locator('.twoslash-popup-container').first()).toBeVisible()
  expect(messages).toEqual([])
})

test('api and docs TypeScript samples render as Twoslash without placeholder aliases', async ({
  page,
}) => {
  for (const path of ['/api', '/docs/']) {
    await page.goto(path)
    await expect.poll(() => page.locator('pre.twoslash').count()).toBeGreaterThan(0)

    const summary = await page.evaluate(() => {
      const article = document.querySelector('article')

      if (!article) {
        throw new Error('Missing article container.')
      }

      return {
        twoslash: article.querySelectorAll('pre.twoslash').length,
        rawTs: article.querySelectorAll('pre code.language-ts').length,
        text: article.textContent ?? '',
      }
    })

    expect(summary.twoslash).toBeGreaterThan(0)
    expect(summary.rawTs).toBe(0)
    expect(summary.text).not.toContain('---cut-start---')
    expect(summary.text).not.toContain('---cut-end---')
  }

  const apiArticle = page.locator('article')
  await expect(apiArticle).not.toContainText('type ArrowTemplate = unknown')
  await expect(apiArticle).not.toContainText('type Component = unknown')
  await expect(apiArticle).not.toContainText('type ComponentWithProps<T> = unknown')
  await expect(apiArticle).not.toContainText('type RenderPayload = unknown')
})

test('reactive api examples all render as Twoslash blocks', async ({ page }) => {
  await page.goto('/api')

  await expect
    .poll(() => page.locator('#reactive pre.twoslash').count())
    .toBe(4)

  const firstBlock = page.locator('#reactive pre.twoslash').first()
  const hoverToken = firstBlock.locator('.twoslash-hover').first()
  await hoverToken.scrollIntoViewIfNeeded()

  const box = await hoverToken.boundingBox()

  if (!box) {
    throw new Error('Unable to measure reactive() Twoslash hover token.')
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  await expect(firstBlock.locator('.twoslash-popup-container').first()).toBeVisible()
})

test('home and docs code samples highlight Arrow template HTML segments', async ({ page }) => {
  await page.goto('/')

  const heroCode = page.locator('#hero .hero-code pre.shiki').first()
  await expect(heroCode).toHaveClass(/one-light/)
  await expect(heroCode).toHaveClass(/one-dark-pro/)

  const heroHtmlTokens = await heroCode.locator('code .line span').evaluateAll((nodes) => {
    const tokens = new Map<string, string>()

    for (const node of nodes) {
      const text = node.textContent ?? ''
      const style = node.getAttribute('style') ?? ''

      if (
        text === 'button' ||
        text === ' @click' ||
        text === '      Clicked '
      ) {
        tokens.set(text, style)
      }
    }

    return Object.fromEntries(tokens)
  })

  expect(heroHtmlTokens.button).toContain('--shiki-light:#E45649')
  expect(heroHtmlTokens[' @click']).toContain('--shiki-light:#986801')
  expect(heroHtmlTokens['      Clicked ']).toContain('--shiki-light:#50A14F')
  expect(heroHtmlTokens.button).not.toBe(heroHtmlTokens[' @click'])
  await expect
    .poll(() => heroCode.evaluate((pre) => pre.scrollWidth - pre.clientWidth))
    .toBeLessThan(2)

  await page.goto('/docs/')

  await expect.poll(() => page.locator('article pre.shiki').count()).toBeGreaterThan(10)

  const docsArrowHtmlTokens = await page.locator('article pre.shiki code .line span').evaluateAll(
    (nodes) =>
      nodes
        .map((node) => ({
          text: node.textContent,
          style: node.getAttribute('style') ?? '',
        }))
        .filter((token) => token.text === 'button' || token.text === ' @click')
  )

  expect(docsArrowHtmlTokens).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: 'button',
        style: expect.stringContaining('--shiki-light:#E45649'),
      }),
      expect.objectContaining({
        text: ' @click',
        style: expect.stringContaining('--shiki-light:#986801'),
      }),
    ])
  )
})

test('docs examples link into the playground and changelog is absent', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('article')).not.toContainText('Changelog')
  await expect(page.locator('#examples .grid > div')).toHaveCount(6)
  await expect(page.locator('#examples .grid > div a[href^="/play/"]')).toHaveCount(6)
})

async function trackAppRootReplacements(page) {
  await page.addInitScript(() => {
    const original = Element.prototype.replaceChildren
    window.__arrowAppReplaceChildrenCalls = 0

    Element.prototype.replaceChildren = function (...args) {
      if (this instanceof Element && this.id === 'app') {
        window.__arrowAppReplaceChildrenCalls += 1
      }

      return original.apply(this, args)
    }
  })
}

async function tamperDocument(page, pathname, mutate) {
  await page.route('**/*', async (route) => {
    const request = route.request()

    if (request.resourceType() !== 'document') {
      await route.fallback()
      return
    }

    const url = new URL(request.url())
    if (url.pathname !== pathname) {
      await route.fallback()
      return
    }

    const response = await route.fetch()
    const body = await response.text()

    await route.fulfill({
      response,
      body: mutate(body),
      headers: {
        ...response.headers(),
        'content-type': 'text/html; charset=utf-8',
      },
    })
  })
}

function injectBeforeModuleScript(html, injection) {
  return html.replace(/(<script type="module"[^>]*>)/, `${injection}$1`)
}
