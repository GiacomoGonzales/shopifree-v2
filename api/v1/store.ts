/**
 * GET /api/v1/store — return basic store info to validate an API key.
 *
 * First endpoint of the Shopifree public API. Integrations call this on
 * setup to confirm the key works and to display the connected store name
 * to the merchant. No state-mutating side effects.
 *
 * Response example:
 * {
 *   "store": {
 *     "id": "abc123",
 *     "name": "Alien Store",
 *     "subdomain": "alienstore",
 *     "currency": "PEN",
 *     "language": "es",
 *     "plan": "pro"
 *   }
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withApiKey } from '../_shared/api-auth'

export default withApiKey(['GET'], async (_req: VercelRequest, res: VercelResponse, auth) => {
  const data = auth.store.data()
  if (!data) {
    return res.status(404).json({ error: 'Store not found' })
  }
  return res.status(200).json({
    store: {
      id: auth.storeId,
      name: data.name,
      subdomain: data.subdomain,
      customDomain: data.customDomain || null,
      currency: data.currency,
      language: data.language || 'es',
      plan: data.plan,
      country: data.location?.country || null,
    },
  })
})
