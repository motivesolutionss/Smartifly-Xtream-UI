// get-fsd-provider-token.js

const API_BASE_URL = 'https://fsdameeremillattourism.com'

const CLIENT_EMAIL = process.env.FSD_CLIENT_EMAIL || 'flyndealtravels@gmail.com'
const CLIENT_PASSWORD = process.env.FSD_CLIENT_PASSWORD || 'PUT_PASSWORD_HERE'

function findToken(obj) {
  if (!obj || typeof obj !== 'object') return null

  const possibleKeys = [
    'token',
    'access_token',
    'bearer_token',
    'auth_token',
    'api_token',
  ]

  for (const key of possibleKeys) {
    if (typeof obj[key] === 'string' && obj[key].split('.').length === 3) {
      return obj[key]
    }

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

async function requestFormLogin() {
  console.log('')
  console.log('🔄 Trying form-urlencoded login...')

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

  return {
    method: 'form-urlencoded',
    status: response.status,
    ok: response.ok,
    data,
  }
}

async function requestJsonLogin() {
  console.log('')
  console.log('🔄 Trying JSON login...')

  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    }),
  })

  const data = await response.json().catch(() => null)

  return {
    method: 'json',
    status: response.status,
    ok: response.ok,
    data,
  }
}

function printResult(result) {
  console.log('')
  console.log('------------------------------------')
  console.log(`Method: ${result.method}`)
  console.log(`Status: ${result.status}`)
  console.log('Response:')
  console.dir(result.data, { depth: 10 })
  console.log('------------------------------------')
}

function printToken(token) {
  console.log('')
  console.log('====================================')
  console.log('✅ TOKEN FOUND')
  console.log('====================================')
  console.log('')
  console.log(token)
  console.log('')

  const payload = decodeJwtPayload(token)

  if (payload) {
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

  console.log('')
  console.log('PowerShell env command:')
  console.log(`$env:FSD_AUTH_TOKEN="${token}"; node test-existing-fsd-token.js`)
}

async function main() {
  console.log('====================================')
  console.log('Get FSD Provider Existing Token')
  console.log('====================================')

  if (!CLIENT_PASSWORD || CLIENT_PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('')
    console.error('❌ Password missing.')
    console.error('')
    console.error('Run like this in PowerShell:')
    console.error('$env:FSD_CLIENT_PASSWORD="your_real_password"; node get-fsd-provider-token.js')
    process.exit(1)
  }

  const results = []

  results.push(await requestFormLogin())
  results.push(await requestJsonLogin())

  for (const result of results) {
    printResult(result)

    const token = findToken(result.data)

    if (token) {
      printToken(token)
      return
    }
  }

  console.log('')
  console.log('====================================')
  console.log('❌ NO TOKEN RETURNED BY PROVIDER API')
  console.log('====================================')
  console.log('')
  console.log('The provider API responded, but it did not send any token field.')
  console.log('')
  console.log('This means your code cannot fetch the existing token automatically from /api/login.')
  console.log('')
  console.log('You need to ask the provider to do one of these:')
  console.log('1. Send you the current active token')
  console.log('2. Reset/revoke the current token')
  console.log('3. Change /api/login so it returns the existing active token')
  console.log('4. Provide a separate endpoint like /api/token or /api/me/token')
  console.log('')
}

main().catch((error) => {
  console.error('')
  console.error('❌ Script crashed')
  console.error(error.message || error)
  process.exit(1)
})