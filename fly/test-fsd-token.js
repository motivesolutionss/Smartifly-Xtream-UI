// test-fsd-token.js

const API_BASE_URL = 'https://fsdameeremillattourism.com'

const CLIENT_EMAIL = process.env.FSD_CLIENT_EMAIL || 'flyndealtravels@gmail.com'
const CLIENT_PASSWORD = process.env.FSD_CLIENT_PASSWORD || 'PUT_PASSWORD_HERE'

let cachedToken = null
let tokenExpiry = null

const TOKEN_CACHE_MS = 12 * 60 * 60 * 1000 // 12 hours

const isTokenValid = () => {
  if (!cachedToken || !tokenExpiry) return false
  return Date.now() < tokenExpiry - 5 * 60 * 1000
}

async function fetchAuthToken(forceRefresh = false) {
  try {
    if (!forceRefresh && isTokenValid()) {
      console.log('✅ Using cached token')
      return cachedToken
    }

    console.log('🔄 Fetching fresh FSD token...')

    const body = new URLSearchParams({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    })

    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('❌ Login failed with status:', response.status)
      console.error('Response:', data)
      throw new Error('Login request failed')
    }

    const token = data?.token

    if (!token) {
      console.error('❌ Login response did not contain token')
      console.error('Response:', data)
      throw new Error('Token missing from login response')
    }

    cachedToken = token
    tokenExpiry = Date.now() + TOKEN_CACHE_MS

    console.log('✅ Token received successfully')
    console.log('Token preview:', `${token.substring(0, 30)}...`)
    console.log('Cache expires at:', new Date(tokenExpiry).toLocaleString())

    return token
  } catch (error) {
    cachedToken = null
    tokenExpiry = null
    throw error
  }
}

async function fsdRequest(config) {
  try {
    const token = await fetchAuthToken()

    const response = await fetch(config.url, {
      method: config.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config.headers || {}),
      },
      body: config.data ? JSON.stringify(config.data) : undefined,
    })

    const data = await response.json().catch(() => null)

    if (response.status === 401) {
      throw {
        isUnauthorized: true,
        status: response.status,
        data,
      }
    }

    if (!response.ok) {
      throw {
        status: response.status,
        data,
      }
    }

    return data
  } catch (error) {
    if (error.isUnauthorized) {
      console.log('⚠️ Token rejected with 401. Refreshing and retrying once...')

      const freshToken = await fetchAuthToken(true)

      const retryResponse = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(config.headers || {}),
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
      })

      const retryData = await retryResponse.json().catch(() => null)

      if (!retryResponse.ok) {
        console.error('❌ Retry failed with status:', retryResponse.status)
        console.error('Response:', retryData)
        throw new Error('Retry request failed')
      }

      return retryData
    }

    throw error
  }
}

async function main() {
  console.log('====================================')
  console.log('FSD Ameer Token/API Test')
  console.log('====================================')

  if (!CLIENT_PASSWORD || CLIENT_PASSWORD === 'PUT_PASSWORD_HERE') {
    console.error('❌ Please set your password first.')
    console.error('')
    console.error('Option 1: edit this file and replace PUT_PASSWORD_HERE')
    console.error('Option 2: run with env variable:')
    console.error('')
    console.error('FSD_CLIENT_PASSWORD="your_password" node test-fsd-token.js')
    process.exit(1)
  }

  try {
    // 1. Test login/token
    const token = await fetchAuthToken(true)

    if (!token) {
      throw new Error('No token received')
    }

    // 2. Test available groups API
    console.log('')
    console.log('🔄 Testing /api/available/groups...')

    const groupsData = await fsdRequest({
      method: 'GET',
      url: `${API_BASE_URL}/api/available/groups`,
    })

    console.log('✅ /api/available/groups request successful')

    const groups = groupsData?.groups || []

    console.log('Groups count:', Array.isArray(groups) ? groups.length : 'Unknown')

    if (Array.isArray(groups) && groups.length > 0) {
      console.log('')
      console.log('Sample group:')
      console.log({
        id: groups[0]?.id,
        sector: groups[0]?.sector,
        price: groups[0]?.price,
        status: groups[0]?.status,
      })
    } else {
      console.log('⚠️ No groups found in response')
      console.log('Raw response preview:', JSON.stringify(groupsData).slice(0, 500))
    }

    // 3. Test cached token reuse
    console.log('')
    console.log('🔄 Testing cached token reuse...')
    await fetchAuthToken()
    console.log('✅ Cache test successful')

    console.log('')
    console.log('====================================')
    console.log('✅ All tests passed')
    console.log('Your proposed token flow is working.')
    console.log('====================================')
  } catch (error) {
    console.error('')
    console.error('====================================')
    console.error('❌ Test failed')
    console.error('====================================')
    console.error(error.data || error.message || error)
    process.exit(1)
  }
}

main()