// diagnose-fsd-auth.js

const API_BASE_URL = 'https://fsdameeremillattourism.com'

const TOKEN = (process.env.FSD_AUTH_TOKEN || 'PASTE_TOKEN_HERE').trim()

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

async function testRequest(name, url, headers) {
  console.log('')
  console.log('====================================')
  console.log(`Testing: ${name}`)
  console.log('URL:', url)
  console.log('Headers:', {
    ...headers,
    Authorization: headers.Authorization
      ? headers.Authorization.substring(0, 40) + '...'
      : undefined,
    token: headers.token ? headers.token.substring(0, 40) + '...' : undefined,
    'x-api-token': headers['x-api-token']
      ? headers['x-api-token'].substring(0, 40) + '...'
      : undefined,
  })
  console.log('====================================')

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    console.log('Status:', response.status)
    console.log('OK:', response.ok)
    console.log('Response headers:')
    console.log(Object.fromEntries(response.headers.entries()))
    console.log('Response body:')
    console.dir(data, { depth: 10 })

    return {
      name,
      status: response.status,
      ok: response.ok,
      data,
    }
  } catch (error) {
    console.log('Request crashed:', error.message)
    return {
      name,
      status: null,
      ok: false,
      error: error.message,
    }
  }
}

async function main() {
  console.log('====================================')
  console.log('FSD Auth Diagnostic Test')
  console.log('====================================')

  if (!TOKEN || TOKEN === 'PASTE_TOKEN_HERE') {
    console.error('❌ Please provide token first.')
    console.error('')
    console.error('PowerShell:')
    console.error('$env:FSD_AUTH_TOKEN="paste_token_here"; node diagnose-fsd-auth.js')
    process.exit(1)
  }

  console.log('Token preview:', TOKEN.substring(0, 40) + '...')

  const payload = decodeJwtPayload(TOKEN)

  if (payload) {
    console.log('')
    console.log('Decoded JWT:')
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
      console.log(
        Date.now() > expiryDate.getTime()
          ? 'JWT date status: ❌ expired'
          : 'JWT date status: ✅ not expired'
      )
    }
  }

  const endpoints = [
    `${API_BASE_URL}/api/available/groups`,
    `${API_BASE_URL}/api/available/groups/`,
  ]

  const authStyles = [
    {
      name: 'Authorization: Bearer TOKEN',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'Authorization: TOKEN without Bearer',
      headers: {
        Authorization: TOKEN,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'token header',
      headers: {
        token: TOKEN,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'x-api-token header',
      headers: {
        'x-api-token': TOKEN,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'api_token query param',
      queryParam: `api_token=${encodeURIComponent(TOKEN)}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    {
      name: 'token query param',
      queryParam: `token=${encodeURIComponent(TOKEN)}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  ]

  const results = []

  for (const endpoint of endpoints) {
    for (const style of authStyles) {
      const url = style.queryParam
        ? `${endpoint}?${style.queryParam}`
        : endpoint

      const result = await testRequest(
        `${style.name} -> ${endpoint}`,
        url,
        style.headers
      )

      results.push(result)

      if (result.ok) {
        console.log('')
        console.log('✅ SUCCESS FOUND')
        console.log('Working method:', style.name)
        console.log('Working endpoint:', endpoint)
        console.log('')
        console.log('Use this auth style in your deployed code.')
        return
      }
    }
  }

  console.log('')
  console.log('====================================')
  console.log('Summary')
  console.log('====================================')

  for (const result of results) {
    console.log(`${result.status || 'ERR'} - ${result.name}`)
  }

  console.log('')
  console.log('❌ No auth method worked with this token.')
  console.log('')
  console.log('Conclusion:')
  console.log('The token is not accepted by the provider server.')
  console.log('Even if JWT exp says valid, the provider backend has rejected/revoked it.')
  console.log('')
  console.log('Ask provider to share the current active token or reset the token.')
}

main().catch((error) => {
  console.error('Script crashed:', error)
  process.exit(1)
})