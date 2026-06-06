// probe-fsd-token-endpoints.js

const API_BASE_URL = 'https://fsdameeremillattourism.com'

const EMAIL = process.env.FSD_CLIENT_EMAIL || 'flyndealtravels@gmail.com'
const PASSWORD = process.env.FSD_CLIENT_PASSWORD || 'PUT_PASSWORD_HERE'
const OLD_TOKEN = (process.env.FSD_AUTH_TOKEN || '').trim()

const endpoints = [
  { method: 'POST', path: '/api/login', auth: 'credentials' },
  { method: 'POST', path: '/api/token', auth: 'credentials' },
  { method: 'POST', path: '/api/get-token', auth: 'credentials' },
  { method: 'POST', path: '/api/access-token', auth: 'credentials' },
  { method: 'POST', path: '/api/auth/token', auth: 'credentials' },
  { method: 'POST', path: '/api/refresh-token', auth: 'credentials' },

  { method: 'GET', path: '/api/user', auth: 'bearer' },
  { method: 'GET', path: '/api/me', auth: 'bearer' },
  { method: 'GET', path: '/api/profile', auth: 'bearer' },
  { method: 'GET', path: '/api/account', auth: 'bearer' },
  { method: 'GET', path: '/api/token', auth: 'bearer' },
  { method: 'GET', path: '/api/auth/token', auth: 'bearer' },
]

function findToken(obj) {
  if (!obj || typeof obj !== 'object') return null

  const possibleKeys = [
    'token',
    'access_token',
    'bearer_token',
    'auth_token',
    'api_token',
    'plainTextToken',
  ]

  for (const key of possibleKeys) {
    if (typeof obj[key] === 'string' && obj[key].length > 50) {
      return obj[key]
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const nested = findToken(value)
      if (nested) return nested
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

async function callEndpoint(endpoint) {
  const url = `${API_BASE_URL}${endpoint.path}`

  const headers = {
    Accept: 'application/json',
  }

  let body

  if (endpoint.auth === 'credentials') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams({
      email: EMAIL,
      password: PASSWORD,
    })
  }

  if (endpoint.auth === 'bearer') {
    headers['Content-Type'] = 'application/json'

    if (OLD_TOKEN) {
      headers.Authorization = `Bearer ${OLD_TOKEN}`
    }
  }

  console.log('')
  console.log('====================================')
  console.log(`${endpoint.method} ${url}`)
  console.log('Auth type:', endpoint.auth)
  console.log('====================================')

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body,
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    console.log('Status:', response.status)
    console.log('Response:')
    console.dir(data, { depth: 10 })

    const token = findToken(data)

    if (token) {
      console.log('')
      console.log('✅ TOKEN FOUND')
      console.log(token)

      const payload = decodeJwtPayload(token)

      if (payload) {
        console.log('')
        console.log('Decoded token:')
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

      return token
    }

    return null
  } catch (error) {
    console.log('Request failed:', error.message)
    return null
  }
}

async function testToken(token) {
  console.log('')
  console.log('====================================')
  console.log('Testing found token on /api/available/groups')
  console.log('====================================')

  const response = await fetch(`${API_BASE_URL}/api/available/groups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => null)

  console.log('Status:', response.status)
  console.log('Response:')
  console.dir(data, { depth: 5 })

  if (response.ok) {
    console.log('')
    console.log('✅ Found token works.')
  } else {
    console.log('')
    console.log('❌ Found token does not work on protected endpoint.')
  }
}

async function main() {
  console.log('====================================')
  console.log('FSD Token Endpoint Probe')
  console.log('====================================')

  if (!PASSWORD || PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('')
    console.error('❌ Missing password.')
    console.error('Run:')
    console.error('$env:FSD_CLIENT_PASSWORD="your_real_password"; node probe-fsd-token-endpoints.js')
    process.exit(1)
  }

  if (!OLD_TOKEN) {
    console.log('')
    console.log('⚠️ No OLD_TOKEN provided.')
    console.log('Bearer endpoints will probably return 401.')
    console.log('You can add:')
    console.log('$env:FSD_AUTH_TOKEN="your_old_token"')
  }

  for (const endpoint of endpoints) {
    const token = await callEndpoint(endpoint)

    if (token) {
      await testToken(token)
      return
    }
  }

  console.log('')
  console.log('====================================')
  console.log('❌ No token found from tested endpoints')
  console.log('====================================')
  console.log('')
  console.log('This means the provider likely does not expose a token retrieval endpoint.')
  console.log('Ask them for the exact endpoint to regenerate or retrieve the active token.')
}

main()