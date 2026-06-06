// test-al-haider-existing-token.js

const API_BASE_URL = 'https://alhaidertravel.pk'

const TOKEN = (process.env.AL_HAIDER_TOKEN || '').trim()

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

async function main() {
  console.log('====================================')
  console.log('Al Haider Existing Token Test')
  console.log('====================================')

  if (!TOKEN) {
    console.log('❌ Missing token')
    console.log('')
    console.log('Run like this in PowerShell:')
    console.log('')
    console.log('$env:AL_HAIDER_TOKEN="paste_your_token_here"')
    console.log('node test-al-haider-existing-token.js')
    process.exit(1)
  }

  console.log('Token preview:', TOKEN.substring(0, 40) + '...')

  const payload = decodeJwtPayload(TOKEN)

  if (payload) {
    console.log('')
    console.log('✅ JWT decoded successfully')
    console.log('Decoded token:')
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
  } else {
    console.log('')
    console.log('⚠️ Could not decode token as JWT. Continuing API test...')
  }

  console.log('')
  console.log('Testing /api/available/groups...')

  const response = await fetch(`${API_BASE_URL}/api/available/groups`, {
    method: 'GET',
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

  console.log('')
  console.log('Status:', response.status)
  console.log('OK:', response.ok)

  console.log('')
  console.log('Response preview:')

  if (typeof data === 'string') {
    console.log(data.slice(0, 500))
  } else {
    console.dir(
      {
        error: data?.error,
        message: data?.message,
        groups: Array.isArray(data?.groups)
          ? `Array(${data.groups.length})`
          : data?.groups,
        filteredRecords: Array.isArray(data?.filteredRecords)
          ? `Array(${data.filteredRecords.length})`
          : data?.filteredRecords,
        records: Array.isArray(data)
          ? `Array(${data.length})`
          : undefined,
      },
      { depth: 10 }
    )
  }

  if (response.ok) {
    const records =
      data?.groups ||
      data?.filteredRecords ||
      (Array.isArray(data) ? data : [])

    console.log('')
    console.log('✅ Existing token works. Do not generate another token.')
    console.log('Records count:', Array.isArray(records) ? records.length : 'Unknown')

    if (Array.isArray(records) && records.length > 0) {
      console.log('')
      console.log('Sample record:')
      console.log({
        id: records[0]?.id,
        sector: records[0]?.sector,
        price: records[0]?.price,
        status: records[0]?.status,
        available_no_of_pax: records[0]?.available_no_of_pax,
      })
    }
  } else {
    console.log('')
    console.log('❌ Existing token does not work.')
    console.log('If status is 401, the provider server is rejecting this token.')
  }
}

main().catch((error) => {
  console.error('')
  console.error('❌ Script crashed')
  console.error(error.message || error)
  process.exit(1)
})