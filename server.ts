require('dotenv').config()

import * as cron from 'node-cron'
import { Report, generateReport } from './report'

import express from 'express'

const app = express()

let report: Report

async function cacheReport() {
  report = await generateReport()
  console.log('Report cached')
}

app.get('/', (req, res) => {
  if (!report) {
    return res.status(400).send()
  }

  res.json(report)
})

app.listen(3000, () => {
  console.log('Server started on port 3000')
})

// Cache report on server start and every 8 hours
cacheReport()
cron.schedule('0 */8 * * *', cacheReport)
