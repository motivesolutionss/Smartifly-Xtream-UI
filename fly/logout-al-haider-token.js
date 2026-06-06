// logout-al-haider-token.js

const API_BASE_URL = 'https://alhaidertravel.pk'

const TOKEN = (process.env.AL_HAIDER_TOKEN || '').trim()

const logoutEndpoints = [
  { method: 'POST', path: '/api/logout' },
  { method: 'GET', path: '/api/logout' },
  { method: 'POST', path: '/api/auth/logout' },
  { method: 'POST', path: '/api/user/logout' },
]

async function callLogout(endpoint) {
  const url = `${API_BASE_URL}${endpoint.path}`

  console.log('')
  console.log('====================================')
  console.log(`${endpoint.method} ${url}`)
  console.log('====================================')

  const response = await fetch(url, {
    method: endpoint.method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
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

  return response.ok
}

async function main() {
  console.log('====================================')
  console.log('Al Haider Logout Test')
  console.log('====================================')

  if (!TOKEN) {
    console.error('❌ Missing AL_HAIDER_TOKEN')
    console.error('')
    console.error('PowerShell:')
    console.error('$env:AL_HAIDER_TOKEN="paste_token_here"; node logout-al-haider-token.js')
    console.error('')
    console.error('Linux/server:')
    console.error("AL_HAIDER_TOKEN='paste_token_here' node logout-al-haider-token.js")
    process.exit(1)
  }

  console.log('Token preview:', TOKEN.substring(0, 50) + '...')

  for (const endpoint of logoutEndpoints) {
    const ok = await callLogout(endpoint)

    if (ok) {
      console.log('')
      console.log('✅ Logout endpoint worked.')
      console.log('Now try generating a new token.')
      return
    }
  }

  console.log('')
  console.log('❌ No logout endpoint worked with this token.')
  console.log('If token is already unauthenticated, provider must revoke it from backend.')
}

main().catch((error) => {
  console.error('')
  console.error('❌ Script crashed')
  console.error(error.message || error)
  process.exit(1)
})