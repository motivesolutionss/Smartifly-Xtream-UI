import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, watch } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const distPath = resolve(root, 'dist')
const tmpWitsPackage = resolve(root, 'tmp', 'WITs.wgt')
const remoteWitsPackage = '/home/owner/share/tmp/sdk_tools/WITs.wgt'
const witsAppId = 'SmrTFly001.SmartiflySamsungTVWITs'
const witsInstallName = 'SmartiflySamsungTVWITs'
const pushDelayMs = 1200
const relaunchDelayMs = 1400
const launchRetryDelayMs = 1200

let shuttingDown = false
let viteWatcher
let distWatcher
let pushTimer
let relaunchTimer
let isPushing = false
let shouldPushAgain = false

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.error) {
    console.error(`[wits:dev] Failed to run ${command}: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function findSdbPath() {
  const candidates = [
    process.env.SDB_PATH,
    'C:\\tizentv-tools\\sdb\\sdb.exe',
    process.env.TIZEN_TOOLS_PATH
      ? resolve(process.env.TIZEN_TOOLS_PATH, 'sdb.exe')
      : undefined,
  ].filter(Boolean)

  const sdbPath = candidates.find((candidate) => existsSync(candidate))
  if (!sdbPath) {
    console.error(
      'Unable to find sdb. Set SDB_PATH or install Samsung TV tools at C:\\tizentv-tools\\sdb\\sdb.exe.',
    )
    process.exit(1)
  }

  return sdbPath
}

function findWitsPackagePath() {
  const packagePath = process.env.APPDATA
    ? resolve(process.env.APPDATA, 'npm', 'node_modules', '@tizentv', 'wits', 'container', 'WITs.wgt')
    : undefined

  if (packagePath && existsSync(packagePath)) {
    return packagePath
  }

  console.error('Unable to find the WITS container package. Run `wits -s` once to generate it.')
  process.exit(1)
}

function getDeviceName(sdbPath) {
  const result = spawnSync(sdbPath, ['devices'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  const devices = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\sdevice\s/.test(` ${line} `))
    .map((line) => line.split(/\s+/)[0])

  if (devices.length === 0) {
    console.error('No connected Tizen device or emulator found by sdb.')
    process.exit(1)
  }

  const preferredDeviceName = process.env.SDB_DEVICE_NAME
  if (preferredDeviceName) {
    if (devices.includes(preferredDeviceName)) {
      return preferredDeviceName
    }

    console.error(
      `[wits:dev] Requested SDB_DEVICE_NAME "${preferredDeviceName}" was not found. Connected devices: ${devices.join(', ')}`,
    )
    process.exit(1)
  }

  if (devices.length > 1) {
    console.warn(
      `[wits:dev] Multiple Tizen devices detected (${devices.join(', ')}). Using ${devices[0]}. Set SDB_DEVICE_NAME to target a specific emulator.`,
    )
  }

  return devices[0]
}

const sdbPath = findSdbPath()
const deviceName = getDeviceName(sdbPath)
console.log(`[wits:dev] Target device: ${deviceName}`)

function sdb(args, options = {}) {
  return spawnSync(sdbPath, ['-s', deviceName, ...args], {
    cwd: root,
    encoding: options.encoding,
    stdio: options.stdio ?? 'inherit',
  })
}

function launchWitsApp(retries = 1) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = sdb(['shell', '0', 'was_execute', witsAppId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (!output.includes('launch failed') && !output.includes('failed[') && result.status === 0) {
      process.stdout.write(output)
      return true
    }

    if (attempt < retries) {
      console.warn(`[wits:dev] Launch attempt ${attempt} failed; retrying`)
      sleep(launchRetryDelayMs)
    }
  }

  return false
}

function installWitsContainer() {
  const sourcePackage = findWitsPackagePath()
  copyFileSync(sourcePackage, tmpWitsPackage)

  console.log('[wits:dev] Installing WITS container')
  sdb(['shell', '0', 'vd_appuninstall', witsInstallName])
  sdb(['push', tmpWitsPackage, remoteWitsPackage])
  sdb(['shell', '0', 'vd_appinstall', witsInstallName, remoteWitsPackage])
}

function ensureWitsContainerLaunched({ allowInstall = true } = {}) {
  console.log('[wits:dev] Launching emulator app')
  if (launchWitsApp(4)) {
    return
  }

  if (!allowInstall) {
    console.warn('[wits:dev] Emulator app did not relaunch yet; leaving WITS container installed')
    return
  }

  installWitsContainer()
  if (!launchWitsApp(4)) {
    console.error('[wits:dev] WITS container installed, but Samsung was_execute still failed.')
    process.exit(1)
  }
}

function relaunchWitsApp() {
  if (shuttingDown) {
    return
  }

  clearTimeout(relaunchTimer)
  relaunchTimer = setTimeout(() => {
    sdb(['shell', '0', 'was_kill', witsAppId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    sleep(relaunchDelayMs)
    ensureWitsContainerLaunched({ allowInstall: false })
  }, relaunchDelayMs)
}

function pushDistToEmulator() {
  if (shuttingDown) {
    return
  }

  if (isPushing) {
    shouldPushAgain = true
    return
  }

  isPushing = true
  console.log('[wits:dev] Pushing rebuilt dist to emulator')
  run('node', ['scripts/preload-wits-content.mjs'])
  isPushing = false
  relaunchWitsApp()

  if (shouldPushAgain) {
    shouldPushAgain = false
    scheduleDistPush()
  }
}

function scheduleDistPush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushDistToEmulator, pushDelayMs)
}

function startViteBuildWatch() {
  viteWatcher = spawn(
    npmCmd(),
    ['exec', '--', 'vite', 'build', '--watch', '--emptyOutDir', 'false'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )

  viteWatcher.on('exit', (code) => {
    if (!shuttingDown) {
      console.warn(`[wits:dev] Vite build watcher exited with code ${code}`)
      shutdown(code ?? 1)
    }
  })
}

function startDistPushWatch() {
  if (!existsSync(distPath)) {
    console.warn('[wits:dev] dist does not exist yet; skipping direct dist push watcher')
    return
  }

  distWatcher = watch(distPath, { recursive: true }, (_eventType, filename) => {
    if (!filename || shuttingDown) {
      return
    }

    scheduleDistPush()
  })
}

function shutdown(code = 0) {
  shuttingDown = true

  if (viteWatcher && !viteWatcher.killed) {
    viteWatcher.kill()
  }

  distWatcher?.close()
  clearTimeout(pushTimer)
  clearTimeout(relaunchTimer)
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('[wits:dev] Building and preloading content')
run(npmCmd(), ['run', 'wits:preload'])
ensureWitsContainerLaunched()
startViteBuildWatch()
startDistPushWatch()
