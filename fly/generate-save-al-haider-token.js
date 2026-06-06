// generate-save-al-haider-token.js

const fs = require('fs')
const path = require('path')

const API_BASE_URL = 'https://alhaidertravel.pk'

const CLIENT_EMAIL = process.env.AL_HAIDER_EMAIL || 'flyndealtravels@gmail.com'
const CLIENT_PASSWORD = process.env.AL_HAIDER_PASSWORD || 'PUT_PASSWORD_HERE'

const ENV_FILE = process.argv.includes('--env')
  ? process.argv[process.argv.indexOf('--env') + 1]
  : '.env.local'

function findToken(obj) {
  if (!obj || typeof obj !== 'object') return null

  const keys = [
    'token',
    'access_token',
    'bearer_token',
    'auth_token',
    'api_token',
  ]

  for (const key of keys) {
    if (typeof obj[key] === 'string' && obj[key].length > 50) {
      return obj[key]
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const nestedToken = findToken(value)
      if (nestedToken) return nestedToken
    }
  }

  return null
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

async function generateToken() {
  console.log('🔄 Calling Al Haider /api/login to generate token...')

  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    }),
  })

  const data = await response.json().catch(() => null)

  console.log('Login status:', response.status)
  console.log('Login response:')
  console.dir(data, { depth: 10 })

  const token = findToken(data)

  if (!response.ok || !token) {
    throw new Error(
      data?.message ||
        data?.error ||
        'Al Haider did not return a token from /api/login.'
    )
  }

  return token
}

async function testToken(token) {
  console.log('')
  console.log('🔄 Testing generated token with /api/available/groups...')

  const response = await fetch(`${API_BASE_URL}/api/available/groups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  const data = await response.json().catch(() => null)

  console.log('Groups status:', response.status)

  if (!response.ok) {
    console.log('Groups response:')
    console.dir(data, { depth: 10 })
    throw new Error('Generated token failed on /api/available/groups.')
  }

  const records =
    data?.groups ||
    data?.filteredRecords ||
    (Array.isArray(data) ? data : [])

  console.log('✅ Token works with /api/available/groups')
  console.log('Records count:', Array.isArray(records) ? records.length : 'Unknown')

  if (Array.isArray(records) && records.length > 0) {
    console.log('Sample record:')
    console.log({
      id: records[0]?.id,
      sector: records[0]?.sector,
      price: records[0]?.price,
      status: records[0]?.status,
      available_no_of_pax: records[0]?.available_no_of_pax,
    })
  }

  return data
}

function saveTokenToEnv(token) {
  const envPath = path.resolve(process.cwd(), ENV_FILE)

  let content = ''

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8')
  }

  const lines = content
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('AL_HAIDER_TOKEN='))

  lines.push(`AL_HAIDER_TOKEN=${token}`)

  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n')

  console.log('')
  console.log(`✅ Token saved to ${envPath}`)
}

async function main() {
  console.log('====================================')
  console.log('Generate + Save Al Haider Token')
  console.log('====================================')
  console.log('Email:', CLIENT_EMAIL)
  console.log('Env file:', ENV_FILE)

  if (!CLIENT_PASSWORD || CLIENT_PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('')
    console.error('❌ Password missing.')
    console.error('')
    console.error('Run like this in PowerShell:')
    console.error(
      '$env:AL_HAIDER_PASSWORD="your_real_password"; node generate-save-al-haider-token.js'
    )
    process.exit(1)
  }

  try {
    const token = await generateToken()

    console.log('')
    console.log('✅ Token generated successfully')
    console.log('Token preview:', token.substring(0, 50) + '...')

    const payload = decodeJwtPayload(token)

    if (payload) {
      console.log('')
      console.log('Decoded token info:')
      console.log({
        sub: payload.sub || null,
        jti: payload.jti || null,
        iat: payload.iat
          ? new Date(Number(payload.iat) * 1000).toLocaleString()
          : null,
        exp: payload.exp
          ? new Date(Number(payload.exp) * 1000).toLocaleString()
          : null,
      })
    }

    await testToken(token)

    saveTokenToEnv(token)

    console.log('')
    console.log('====================================')
    console.log('✅ DONE')
    console.log('Al Haider token generated, tested, and saved.')
    console.log('Now restart/redeploy your server.')
    console.log('====================================')
  } catch (error) {
    console.log('')
    console.log('====================================')
    console.log('❌ Token generation failed')
    console.log('====================================')
    console.error(error.message || error)

    console.log('')
    console.log('Possible causes:')
    console.log('- Password is wrong')
    console.log('- Sessions were not fully revoked')
    console.log('- Al Haider login response format changed')
    console.log('- Provider server is rejecting the request')

    process.exit(1)
  }
}

main()