// test-al-haider-token.js

const API_BASE_URL = 'https://alhaidertravel.pk'

const CLIENT_EMAIL = process.env.AL_HAIDER_EMAIL || 'flyndealtravels@gmail.com'
const CLIENT_PASSWORD = process.env.AL_HAIDER_PASSWORD || 'PUT_PASSWORD_HERE'

// Optional: paste existing token through env to test old hardcoded token
const EXISTING_TOKEN = (process.env.AL_HAIDER_TOKEN || '').trim()

function findToken(obj) {
  if (!obj || typeof obj !== 'object') return null

  const keys = ['token', 'access_token', 'bearer_token', 'auth_token', 'api_token']

  for (const key of keys) {
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

function printJwtInfo(token) {
  const payload = decodeJwtPayload(token)

  if (!payload) {
    console.log('⚠️ Could not decode token as JWT')
    return
  }

  console.log('✅ JWT decoded successfully')
  console.log({
    sub: payload.sub || null,
    jti: payload.jti || null,
    aud: payload.aud || null,
    iat: payload.iat
      ? new Date(Number(payload.iat) * 1000).toLocaleString()
      : null,
    nbf: payload.nbf
      ? new Date(Number(payload.nbf) * 1000).toLocaleString()
      : null,
    exp: payload.exp
      ? new Date(Number(payload.exp) * 1000).toLocaleString()
      : null,
  })

  if (payload.exp) {
    const expiryDate = new Date(Number(payload.exp) * 1000)

    if (Date.now() > expiryDate.getTime()) {
      console.log('JWT date status: ❌ expired')
    } else {
      console.log('JWT date status: ✅ not expired')
    }
  }
}

async function loginAndGetToken() {
  console.log('')
  console.log('====================================')
  console.log('Testing Al Haider /api/login')
  console.log('====================================')

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
        'Login did not return a token'
    )
  }

  console.log('')
  console.log('✅ Login returned token')
  console.log('Token preview:', token.substring(0, 40) + '...')

  printJwtInfo(token)

  return token
}

async function testAvailableGroups(token, label) {
  console.log('')
  console.log('====================================')
  console.log(`Testing /api/available/groups using ${label}`)
  console.log('====================================')

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
  console.log('Groups response preview:')
  console.dir(
    Array.isArray(data)
      ? data.slice(0, 2)
      : {
          ...data,
          groups: Array.isArray(data?.groups)
            ? `Array(${data.groups.length})`
            : data?.groups,
          filteredRecords: Array.isArray(data?.filteredRecords)
            ? `Array(${data.filteredRecords.length})`
            : data?.filteredRecords,
        },
    { depth: 10 }
  )

  if (!response.ok) {
    throw new Error('Token failed on /api/available/groups')
  }

  const rawTickets =
    data?.groups ||
    data?.filteredRecords ||
    data ||
    []

  console.log('')
  console.log('✅ Token works with /api/available/groups')
  console.log('Ticket/group count:', Array.isArray(rawTickets) ? rawTickets.length : 'Unknown')

  if (Array.isArray(rawTickets) && rawTickets.length > 0) {
    console.log('')
    console.log('Sample group:')
    console.log({
      id: rawTickets[0]?.id,
      sector: rawTickets[0]?.sector,
      price: rawTickets[0]?.price,
      status: rawTickets[0]?.status,
      available_no_of_pax: rawTickets[0]?.available_no_of_pax,
    })
  }

  return data
}

async function main() {
  console.log('====================================')
  console.log('Al Haider Travel Token/API Test')
  console.log('====================================')

  if (EXISTING_TOKEN) {
    console.log('')
    console.log('Testing existing token from AL_HAIDER_TOKEN...')
    console.log('Token preview:', EXISTING_TOKEN.substring(0, 40) + '...')
    printJwtInfo(EXISTING_TOKEN)

    try {
      await testAvailableGroups(EXISTING_TOKEN, 'existing token')
      console.log('')
      console.log('✅ Existing hardcoded token is working.')
      return
    } catch (error) {
      console.log('')
      console.log('❌ Existing token failed:', error.message)
      console.log('Now trying to login and generate a new token...')
    }
  }

  if (!CLIENT_PASSWORD || CLIENT_PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('')
    console.error('❌ Missing password.')
    console.error('')
    console.error('PowerShell:')
    console.error('$env:AL_HAIDER_PASSWORD="your_real_password"; node test-al-haider-token.js')
    console.error('')
    console.error('Or test existing token only:')
    console.error('$env:AL_HAIDER_TOKEN="paste_token_here"; node test-al-haider-token.js')
    process.exit(1)
  }

  const newToken = await loginAndGetToken()
  await testAvailableGroups(newToken, 'new login token')

  console.log('')
  console.log('====================================')
  console.log('✅ ALL TESTS PASSED')
  console.log('Use this token flow in code.')
  console.log('====================================')
  console.log('')
  console.log('Generated token:')
  console.log(newToken)
}

main().catch((error) => {
  console.log('')
  console.log('====================================')
  console.log('❌ TEST FAILED')
  console.log('====================================')
  console.error(error.message || error)
  process.exit(1)
})