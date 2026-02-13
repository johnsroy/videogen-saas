#!/usr/bin/env node

/**
 * Dev server watchdog — auto-restarts `next dev` on crash.
 * Usage: node scripts/dev-watch.js
 */

const { spawn } = require('child_process')

const MAX_RESTARTS = 10
const COOLDOWN_MS = 2000
let restarts = 0
let child = null

function start() {
  console.log(`\n[dev-watch] Starting Next.js dev server (restart #${restarts})...\n`)

  child = spawn('npx', ['next', 'dev', '--turbopack'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
  })

  child.on('exit', (code, signal) => {
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      console.log('\n[dev-watch] Received shutdown signal, exiting.')
      process.exit(0)
    }

    restarts++
    if (restarts > MAX_RESTARTS) {
      console.error(`\n[dev-watch] Max restarts (${MAX_RESTARTS}) reached. Giving up.`)
      process.exit(1)
    }

    console.log(`\n[dev-watch] Server exited with code ${code}. Restarting in ${COOLDOWN_MS / 1000}s...`)
    setTimeout(start, COOLDOWN_MS)
  })
}

// Forward signals to child process
function shutdown(signal) {
  if (child) {
    child.kill(signal)
  } else {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()
