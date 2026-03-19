import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const packageRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
)
const runtimeRoot = path.resolve(packageRoot, 'src/vm/runtime')
const outputPath = path.resolve(packageRoot, 'src/vm/generated-modules.ts')

async function readRuntimeFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await readRuntimeFiles(entryPath)))
      continue
    }

    if (entry.name.endsWith('.ts')) {
      files.push(entryPath)
    }
  }

  return files.sort()
}

function runtimeModuleId(filePath) {
  const relative = path.relative(runtimeRoot, filePath).replace(/\\/g, '/')
  return `/__arrow_sandbox/runtime/${relative.replace(/\.ts$/, '.js')}`
}

async function main() {
  const files = await readRuntimeFiles(runtimeRoot)
  const modules = {}

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8')
    const output = ts.transpileModule(source, {
      fileName: filePath,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
    })

    modules[runtimeModuleId(filePath)] = output.outputText
  }

  const contents = [
    "export const VM_BOOTSTRAP_MODULE_ID = '/__arrow_sandbox/runtime/bootstrap.js'",
    "export const VM_CORE_MODULE_ID = '/__arrow_sandbox/runtime/core.js'",
    '',
    `export const vmRuntimeModules: Record<string, string> = ${JSON.stringify(modules, null, 2)}\n`,
  ].join('\n')

  await fs.writeFile(outputPath, contents)
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`)
  process.exit(1)
})
