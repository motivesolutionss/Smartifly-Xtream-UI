import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const rootConfigPath = resolve('.witsconfig.json')
const distDir = resolve('dist')
const distConfigPath = resolve(distDir, '.witsconfig.json')

const config = JSON.parse(await readFile(rootConfigPath, 'utf8'))

config.connectionInfo = {
  ...config.connectionInfo,
  baseAppPath: '.',
}

await mkdir(distDir, { recursive: true })
await writeFile(distConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
