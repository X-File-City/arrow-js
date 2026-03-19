#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootPackagePath = path.join(rootDir, 'package.json')
const createArrowVersionsPath = path.join(rootDir, 'packages/create-arrow-js/versions.json')
const releasablePackages = [
  'packages/core',
  'packages/framework',
  'packages/highlight',
  'packages/hydrate',
  'packages/sandbox',
  'packages/skill',
  'packages/ssr',
  'packages/vite-plugin-arrow',
  'packages/create-arrow-js',
]

const args = process.argv.slice(2)

if (args[0] === 'sync') {
  const version = readFlagValue(args, '--version')
  if (!version) {
    fail('Missing --version for sync.')
  }
  syncVersions(version)
  process.stdout.write(`Synced releasable packages to ${version}\n`)
  process.exit(0)
}

await runInteractiveRelease({
  requestedTag: readFlagValue(args, '--tag'),
  requestedBump: readFlagValue(args, '--bump'),
  dryRun: args.includes('--dry-run'),
  skipConfirm: args.includes('--yes'),
})

async function runInteractiveRelease({ requestedTag, requestedBump, dryRun, skipConfirm }) {
  if (!isWorkingDirectoryClean()) {
    fail('Working directory is not clean. Commit or stash changes first.')
  }

  const branch = exec('git branch --show-current')
  const stableVersion = getStableVersion(readJson(rootPackagePath).version || readPackageVersion('packages/core'))
  const releaseTag = await resolveReleaseTag(branch, requestedTag)
  const bumpType = requestedBump
    ? validateBumpType(requestedBump)
    : await promptChoice(
        'Select version bump type:',
        [
          { key: '1', value: 'patch', label: `patch (${stableVersion} -> ${bumpVersion(stableVersion, 'patch')})` },
          { key: '2', value: 'minor', label: `minor (${stableVersion} -> ${bumpVersion(stableVersion, 'minor')})` },
          { key: '3', value: 'major', label: `major (${stableVersion} -> ${bumpVersion(stableVersion, 'major')})` },
        ]
      )
  const nextStable = bumpVersion(stableVersion, bumpType)
  const commitHash = exec('git rev-parse --short=7 HEAD')
  const version = releaseTag === 'latest'
    ? nextStable
    : `${nextStable}-${releaseTag}.${commitHash}`
  const gitTag = `v${version}`

  process.stdout.write(
    [
      '',
      `Branch: ${branch}`,
      `Version: ${version}`,
      `Git tag: ${gitTag}`,
      `npm tag: ${releaseTag}`,
      '',
    ].join('\n')
  )

  const confirmed = skipConfirm
    ? true
    : await promptConfirm(dryRun ? 'Continue with dry run?' : 'Continue with release?')
  if (!confirmed) {
    process.stdout.write('Release cancelled.\n')
    process.exit(0)
  }

  if (releaseTag === 'latest') {
    if (!dryRun) {
      syncVersions(version)
      exec('git add package.json packages')
      exec(`git commit -m "chore: release ${gitTag}"`)
      exec(`git tag ${gitTag}`)
      exec('git push origin HEAD')
      exec(`git push origin ${gitTag}`)
    }
    return
  }

  if (!dryRun) {
    exec(`git tag ${gitTag}`)
    exec(`git push origin ${gitTag}`)
  }
}

function syncVersions(version) {
  const rootPackage = readJson(rootPackagePath)
  rootPackage.version = version
  writeJson(rootPackagePath, rootPackage)

  for (let index = 0; index < releasablePackages.length; index += 1) {
    const packagePath = path.join(rootDir, releasablePackages[index], 'package.json')
    const packageJson = readJson(packagePath)
    packageJson.version = version
    writeJson(packagePath, packageJson)
  }

  const versionMap = readJson(createArrowVersionsPath)
  for (const key of Object.keys(versionMap)) {
    versionMap[key] = version
  }
  writeJson(createArrowVersionsPath, versionMap)
}

async function resolveReleaseTag(branch, requestedTag) {
  if (requestedTag) {
    validateReleaseTag(branch, requestedTag)
    return requestedTag
  }

  const options = branch === 'main'
    ? [
        { key: '1', value: 'latest', label: 'latest' },
        { key: '2', value: 'next', label: 'next' },
        { key: '3', value: 'dev', label: 'dev' },
      ]
    : [
        { key: '1', value: 'next', label: 'next' },
        { key: '2', value: 'dev', label: 'dev' },
      ]

  return promptChoice(
    branch === 'main'
      ? 'Select release channel:'
      : 'Non-main branch detected. Select prerelease channel:',
    options
  )
}

function validateReleaseTag(branch, requestedTag) {
  if (!['latest', 'next', 'dev'].includes(requestedTag)) {
    fail(`Unknown release tag "${requestedTag}". Use latest, next, or dev.`)
  }

  if (requestedTag === 'latest' && branch !== 'main') {
    fail('Cannot publish latest from a non-main branch.')
  }
}

function validateBumpType(value) {
  if (!['patch', 'minor', 'major'].includes(value)) {
    fail(`Unknown bump type "${value}". Use patch, minor, or major.`)
  }

  return value
}

function getStableVersion(version) {
  return version.split('-')[0]
}

function readPackageVersion(packageDir) {
  return readJson(path.join(rootDir, packageDir, 'package.json')).version
}

function bumpVersion(version, bumpType) {
  const parts = version.split('.').map(Number)
  if (bumpType === 'major') {
    return `${parts[0] + 1}.0.0`
  }
  if (bumpType === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
}

function isWorkingDirectoryClean() {
  return exec('git status --short') === ''
}

function readFlagValue(sourceArgs, flag) {
  const direct = sourceArgs.find((value) => value.startsWith(`${flag}=`))
  if (direct) {
    return direct.slice(flag.length + 1)
  }

  const index = sourceArgs.indexOf(flag)
  if (index === -1) {
    return ''
  }

  return sourceArgs[index + 1] ?? ''
}

async function promptChoice(message, options) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    process.stdout.write(
      `${message}\n${options.map((option) => `  ${option.key}. ${option.label}`).join('\n')}\n\n`
    )
    const answer = (await rl.question('Select an option: ')).trim() || options[0].key
    const selected = options.find((option) => option.key === answer)
    if (!selected) {
      fail(`Unknown selection "${answer}".`)
    }
    return selected.value
  } finally {
    rl.close()
  }
}

async function promptConfirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const answer = (await rl.question(`${message} [Y/n] `)).trim()
    return answer === '' || /^y/i.test(answer)
  } finally {
    rl.close()
  }
}

function exec(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
