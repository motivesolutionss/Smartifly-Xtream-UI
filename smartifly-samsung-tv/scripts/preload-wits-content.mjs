import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const destination = '/home/owner/share/tmp/sdk_tools/SmartiflySamsungTVWITs'
const distPath = resolve('dist')

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

const devicesResult = spawnSync(sdbPath, ['devices'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
})

if (devicesResult.status !== 0) {
  process.exit(devicesResult.status ?? 1)
}

const devices = devicesResult.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /\sdevice\s/.test(` ${line} `))
  .map((line) => line.split(/\s+/)[0])

if (devices.length === 0) {
  console.error('No connected Tizen device or emulator found by sdb.')
  process.exit(1)
}

const preferredDeviceName = process.env.SDB_DEVICE_NAME
if (preferredDeviceName && !devices.includes(preferredDeviceName)) {
  console.error(
    `[wits:preload] Requested SDB_DEVICE_NAME "${preferredDeviceName}" was not found. Connected devices: ${devices.join(', ')}`,
  )
  process.exit(1)
}

const device = preferredDeviceName ?? devices[0]

if (!preferredDeviceName && devices.length > 1) {
  console.warn(
    `[wits:preload] Multiple Tizen devices detected (${devices.join(', ')}). Using ${device}. Set SDB_DEVICE_NAME to target a specific emulator.`,
  )
}

console.log(`[wits:preload] Target device: ${device}`)

const pushResult = spawnSync(sdbPath, ['-s', device, 'push', distPath, destination], {
  stdio: 'inherit',
})

process.exit(pushResult.status ?? 1)
