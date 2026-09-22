#!/usr/bin/env node
import { normalizeServicePlan } from '../frontend/functions/lib/scan-watchlist.js'

if (normalizeServicePlan('scout') !== 'scout') throw new Error('scout')
if (normalizeServicePlan('unknown') !== 'nebula') throw new Error('fallback')
console.log('scan-watchlist plan normalization ok')
