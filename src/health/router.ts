import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'advnt-haloitsm-mcp',
    version: '0.1.0',
    platform: 'ADVNT-585',
    timestamp: new Date().toISOString(),
  })
})
