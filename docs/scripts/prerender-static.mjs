import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientDistDir = path.resolve(docsDir, 'dist/client')
const serverEntryPath = path.resolve(docsDir, 'dist/server/entry-server.js')
const staticDistDir = path.resolve(docsDir, 'dist/static')

const htmlRoutes = [
  ['/', 'index.html'],
  ['/api', 'api/index.html'],
]

const textRoutes = [
  ['docs.md', () => renderMarkdown('/')],
  ['api.md', () => renderMarkdown('/api')],
  ['play.md', () => renderPlayground()],
  ['llms.txt', () => renderLlms()],
]

const { renderLlms, renderMarkdown, renderPage, renderPlayground } = await import(
  pathToFileURL(serverEntryPath).href
)

await fs.rm(staticDistDir, { force: true, recursive: true })
await fs.cp(clientDistDir, staticDistDir, { recursive: true })

const template = await fs.readFile(path.resolve(clientDistDir, 'index.html'), 'utf8')

for (const [url, outputPath] of htmlRoutes) {
  const page = await renderPage(url)
  const html = template
    .replace('<!--app-head-->', page.head ?? '')
    .replace('<!--app-html-->', page.html)
    .replace('<!--app-payload-->', page.payloadScript ?? '')

  await writeOutput(outputPath, html)
}

for (const [outputPath, render] of textRoutes) {
  await writeOutput(outputPath, await render())
}

async function writeOutput(relativePath, content) {
  const outputPath = path.resolve(staticDistDir, relativePath)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, content)
}
