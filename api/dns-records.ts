import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { domain } = req.body
  if (!domain) return res.status(400).json({ error: 'Missing domain' })

  const vercelToken = process.env.VERCEL_TOKEN
  if (!vercelToken) return res.status(500).json({ error: 'Missing VERCEL_TOKEN' })

  try {
    const configResponse = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config`,
      { headers: { 'Authorization': `Bearer ${vercelToken}` } }
    )

    if (!configResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch domain config from Vercel' })
    }

    const configData = await configResponse.json()

    const dnsRecords: Array<{type: string, name: string, value: string}> = []

    // Recommended IPv4 (rank 1 = Vercel's top recommendation)
    const ip = configData.recommendedIPv4?.find((r: { rank: number }) => r.rank === 1)?.value?.[0]
    if (ip) {
      dnsRecords.push({ type: 'A', name: '@', value: ip })
    }

    // Recommended CNAME (rank 1 = Vercel's top recommendation)
    const cname = configData.recommendedCNAME?.find((r: { rank: number }) => r.rank === 1)?.value?.replace(/\.$/, '')
    if (cname) {
      dnsRecords.push({ type: 'CNAME', name: 'www', value: cname })
    }

    return res.status(200).json({ dnsRecords, raw: configData })
  } catch (error) {
    console.error('Error fetching DNS records:', error)
    return res.status(500).json({ error: 'Failed to fetch DNS records' })
  }
}
