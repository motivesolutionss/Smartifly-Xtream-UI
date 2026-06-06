// find-al-haider-active-token.js

const API_BASE_URL = 'https://alhaidertravel.pk'

const EMAIL = process.env.AL_HAIDER_EMAIL || 'flyndealtravels@gmail.com'
const PASSWORD = process.env.AL_HAIDER_PASSWORD || 'PUT_PASSWORD_HERE'
const OLD_TOKEN = (process.env.AL_HAIDER_TOKEN || '').trim()

const endpoints = [
  // credential-based possible token endpoints
  { method: 'POST', path: '/api/login', auth: 'credentials' },
  { method: 'POST', path: '/api/token', auth: 'credentials' },
  { method: 'POST', path: '/api/get-token', auth: 'credentials' },
  { method: 'POST', path: '/api/access-token', auth: 'credentials' },
  { method: 'POST', path: '/api/auth/token', auth: 'credentials' },
  { method: 'POST', path: '/api/tokens', auth: 'credentials' },
  { method: 'POST', path: '/api/personal-access-tokens', auth: 'credentials' },

  // bearer-based account/token endpoints
  { method: 'GET', path: '/api/user', auth: 'bearer' },
  { method: 'GET', path: '/api/me', auth: 'bearer' },
  { method: 'GET', path: '/api/profile', auth: 'bearer' },
  { method: 'GET', path: '/api/account', auth: 'bearer' },
  { method: 'GET', path: '/api/token', auth: 'bearer' },
  { method: 'GET', path: '/api/tokens', auth: 'bearer' },
  { method: 'GET', path: '/api/access-tokens', auth: 'bearer' },
  { method: 'GET', path: '/api/personal-access-tokens', auth: 'bearer' },
]

function findTokens(obj, found = []) {
  if (!obj) return found

  if (typeof obj === 'string') {
    if (obj.length > 50 && (obj.startsWith('eyJ') || obj.includes('.'))) {
      found.push(obj)
    }
    return found
  }

  if (Array.isArray(obj)) {
    for (const item of obj) findTokens(item, found)
    return found
  }

  if (typeof obj === 'object') {
    const tokenKeys = [
      'token',
      'access_token',
      'bearer_token',
      'auth_token',
      'api_token',
      'plainTextToken',
      'plain_text_token',
    ]

    for (const key of tokenKeys) {
      if (typeof obj[key] === 'string' && obj[key].length > 50) {
        found.push(obj[key])
      }
    }

    for (const value of Object.values(obj)) {
      findTokens(value, found)
    }
  }

  return found
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

async function testToken(token) {
  console.log('')
  console.log('Testing found token on /api/available/groups...')

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
  console.log('Response preview:')
  console.dir(
    {
      error: data?.error,
      message: data?.message,
      groups: Array.isArray(data?.groups) ? `Array(${data.groups.length})` : data?.groups,
      filteredRecords: Array.isArray(data?.filteredRecords)
        ? `Array(${data.filteredRecords.length})`
        : data?.filteredRecords,
    },
    { depth: 5 }
  )

  return response.ok
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
  console.log('Auth:', endpoint.auth)
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

    const tokens = findTokens(data)

    if (tokens.length > 0) {
      console.log('')
      console.log(`✅ Found ${tokens.length} possible token(s)`)

      for (const token of tokens) {
        console.log('')
        console.log('Token:')
        console.log(token)

        const payload = decodeJwtPayload(token)

        if (payload) {
          console.log('Decoded:')
          console.log({
            sub: payload.sub || null,
            jti: payload.jti || null,
            iat: payload.iat ? new Date(Number(payload.iat) * 1000).toLocaleString() : null,
            exp: payload.exp ? new Date(Number(payload.exp) * 1000).toLocaleString() : null,
          })
        }

        const works = await testToken(token)

        if (works) {
          console.log('')
          console.log('✅ This token works. Use it in AL_HAIDER_TOKEN/FSD_AUTH style env.')
          return token
        }

        console.log('❌ This token did not work on /api/available/groups.')
      }
    }

    return null
  } catch (error) {
    console.log('Request failed:', error.message)
    return null
  }
}

async function main() {
  console.log('====================================')
  console.log('Find Al Haider Active Token')
  console.log('====================================')

  if (!PASSWORD || PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('')
    console.error('❌ Missing password.')
    console.error('Run:')
    console.error('$env:AL_HAIDER_PASSWORD="your_real_password"; node find-al-haider-active-token.js')
    process.exit(1)
  }

  if (!OLD_TOKEN) {
    console.log('')
    console.log('⚠️ No old token provided. Bearer endpoints may return 401.')
    console.log('Optional:')
    console.log('$env:AL_HAIDER_TOKEN="your_old_token"')
  }

  for (const endpoint of endpoints) {
    const workingToken = await callEndpoint(endpoint)

    if (workingToken) {
      console.log('')
      console.log('====================================')
      console.log('✅ WORKING TOKEN FOUND')
      console.log('====================================')
      console.log(workingToken)
      return
    }
  }

  console.log('')
  console.log('====================================')
  console.log('❌ No active token could be retrieved')
  console.log('====================================')
  console.log('')
  console.log('This likely means Al Haider does not expose an API endpoint to view active tokens.')
  console.log('Ask them to revoke old tokens or provide the current valid token.')
}

main().catch((error) => {
  console.error('Script crashed:', error.message || error)
  process.exit(1)
})
