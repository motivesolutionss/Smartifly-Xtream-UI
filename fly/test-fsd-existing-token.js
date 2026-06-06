// test-fsd-existing-token.js

const API_BASE_URL = 'https://fsdameeremillattourism.com'

const FSD_AUTH_TOKEN = process.env.FSD_AUTH_TOKEN || 'PASTE_EXISTING_TOKEN_HERE'

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch (error) {
    return null
  }
}

async function testExistingToken() {
  console.log('====================================')
  console.log('FSD Existing Token Test')
  console.log('====================================')

  if (!FSD_AUTH_TOKEN || FSD_AUTH_TOKEN === 'PASTE_EXISTING_TOKEN_HERE') {
    console.error('❌ Please provide FSD_AUTH_TOKEN first.')
    console.error('')
    console.error('PowerShell example:')
    console.error('$env:FSD_AUTH_TOKEN="your_existing_token"; node test-fsd-existing-token.js')
    process.exit(1)
  }

  const payload = decodeJwtPayload(FSD_AUTH_TOKEN)

  if (payload) {
    console.log('✅ JWT decoded successfully')
    console.log('Subject/user ID:', payload.sub || 'N/A')

    if (payload.iat) {
      console.log('Issued at:', new Date(payload.iat * 1000).toLocaleString())
    }

    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000)
      console.log('Expires at:', expiryDate.toLocaleString())

      if (Date.now() > expiryDate.getTime()) {
        console.log('❌ Token is expired according to JWT exp.')
      } else {
        console.log('✅ Token is not expired according to JWT exp.')
      }
    }
  } else {
    console.log('⚠️ Could not decode JWT payload. Continuing API test...')
  }

  console.log('')
  console.log('🔄 Testing /api/available/groups...')

  const response = await fetch(`${API_BASE_URL}/api/available/groups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${FSD_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error('❌ API request failed')
    console.error('Status:', response.status)
    console.error('Response:', data)
    process.exit(1)
  }

  console.log('✅ API request successful')

  const groups = data?.groups || []

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
    console.log('Raw response preview:', JSON.stringify(data).slice(0, 500))
  }

  console.log('')
  console.log('====================================')
  console.log('✅ Existing token works')
  console.log('====================================')
}

testExistingToken().catch((error) => {
  console.error('')
  console.error('❌ Test failed')
  console.error(error.message || error)
  process.exit(1)
})
