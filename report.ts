import fs from 'fs'
import moment from 'moment'
import axios from 'axios'

require('dotenv').config()

// Import historical usage from the defunct Helium L1
const heliumL1Data = JSON.parse(
  fs.readFileSync('helium_blockchain_data_usage.json', 'utf-8')
)

const duneApi = axios.create({
  baseURL: 'https://api.dune.com/api/v1/',
  headers: {
    'x-dune-api-key': process.env.DUNE_API_KEY,
  },
})

type UsageDataRecord = {
  date: string
  usd_cost: string
}

export interface Report {
  revenue: {
    now: number
    oneDayAgo: number
    twoDaysAgo: number
    oneWeekAgo: number
    twoWeeksAgo: number
    thirtyDaysAgo: number
    sixtyDaysAgo: number
    ninetyDaysAgo: number
  }
  days: { date: number; revenue: number }[]
}

interface DuneApiResponse {
  execution_id: string // "01GXDTYMM2CKFRBEW44X5S0WZE",
  query_id: number // 1252207,
  state: string // "QUERY_STATE_COMPLETED",
  submitted_at: string // "2023-04-07T12:27:09.314513Z",
  expires_at: string // "2025-04-06T12:27:15.749155Z",
  execution_started_at: string // "2023-04-07T12:27:09.387366Z",
  execution_ended_at: string // "2023-04-07T12:27:15.749154Z",
  result: {
    rows: { block_date: string; dc_burned: string }[]
    result_set_bytes: number // 1524
    total_row_count: number // 26
    datapoint_count: number // 135
    pending_time_millis: number // 72
    execution_time_millis: number // 6361
  }
}

let report: Report = {
  revenue: {
    now: 0,
    oneDayAgo: 0,
    twoDaysAgo: 0,
    oneWeekAgo: 0,
    twoWeeksAgo: 0,
    thirtyDaysAgo: 0,
    sixtyDaysAgo: 0,
    ninetyDaysAgo: 0,
  },
  days: [],
}

function updateRevenueReport(dateString: string, revenue: number) {
  const date = moment(new Date(dateString))
  const timestamp = date.unix()

  // Update total revenue
  report.revenue.now += revenue

  // Update revenue for specific days ago
  const daysAgo = moment().diff(date, 'days')
  if (daysAgo >= 1) {
    report.revenue.oneDayAgo += revenue
  }
  if (daysAgo >= 2) {
    report.revenue.twoDaysAgo += revenue
  }
  if (daysAgo >= 7) {
    report.revenue.oneWeekAgo += revenue
  }
  if (daysAgo >= 14) {
    report.revenue.twoWeeksAgo += revenue
  }
  if (daysAgo >= 30) {
    report.revenue.thirtyDaysAgo += revenue
  }
  if (daysAgo >= 60) {
    report.revenue.sixtyDaysAgo += revenue
  }
  if (daysAgo >= 90) {
    report.revenue.ninetyDaysAgo += revenue
  }

  // Add daily revenue
  report.days.push({
    date: timestamp,
    revenue,
  })

  // Limit to most recent 1000 days (web3index limitation as they haven't implemented pagination)
  if (report.days.length > 1000) {
    report.days.shift()
  }
}

export async function generateReport() {
  const duneRes = await duneApi.get('query/2615088/results')
  const duneData: DuneApiResponse = duneRes.data
  const solanaData = duneData.result.rows

  heliumL1Data.forEach((record: UsageDataRecord) => {
    updateRevenueReport(record.date, +record.usd_cost)
  })

  solanaData.forEach((record) => {
    updateRevenueReport(record.block_date, +record.dc_burned)
  })

  return report
}
