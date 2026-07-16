import prisma from '../config/db.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseBoundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getDateRange(query, mode = 'month') {
  const now = new Date();
  const year = parseBoundedInt(query.year, now.getUTCFullYear(), 2000, 2100);
  let startMonth;
  let endMonth;

  if (mode === 'year') {
    startMonth = 1;
    endMonth = 12;
  } else if (mode === 'range') {
    startMonth = parseBoundedInt(query.start_month, 1, 1, 12);
    endMonth = parseBoundedInt(query.end_month, startMonth, startMonth, 12);
  } else {
    startMonth = parseBoundedInt(query.month, now.getUTCMonth() + 1, 1, 12);
    endMonth = startMonth;
  }

  const start = new Date(Date.UTC(year, startMonth - 1, 1));
  const endExclusive = new Date(Date.UTC(year, endMonth, 1));
  const period = startMonth === endMonth
    ? `${MONTH_NAMES[startMonth - 1]} ${year}`
    : `${MONTH_NAMES[startMonth - 1]} - ${MONTH_NAMES[endMonth - 1]} ${year}`;

  return { year, startMonth, endMonth, start, endExclusive, period };
}

function getAgentId(req) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'superadmin') {
    const agentId = parseBoundedInt(req.user?.agent_id, 0, 0, Number.MAX_SAFE_INTEGER);
    return agentId > 0 ? agentId : -1;
  }

  const requested = parseBoundedInt(req.query.agent_id, 0, 0, Number.MAX_SAFE_INTEGER);
  return requested > 0 ? requested : null;
}

function getTripWhere(req, range) {
  const where = {
    created_at: {
      gte: range.start,
      lt: range.endExclusive
    }
  };
  const agentId = getAgentId(req);
  if (agentId) where.agent_id = agentId;
  return where;
}

function isBooking(trip) {
  const status = String(trip.status || '').trim().toLowerCase();
  return trip.is_booking === true || trip.approved === true || status === 'in progress' || status === 'inprogress' || status === 'confirmed';
}

function buildMetrics(trips, range, agentName = null) {
  const bookings = trips.filter(isBooking);
  const totalQuotations = trips.length;
  const approvedBookings = bookings.length;
  const conversionRate = totalQuotations > 0 ? approvedBookings / totalQuotations * 100 : 0;

  const totalRevenue = bookings.reduce((sum, trip) => sum + toNumber(trip.final_amount), 0);
  const grossRevenue = bookings.reduce((sum, trip) => sum + toNumber(trip.total_amount), 0);
  const totalDiscount = bookings.reduce((sum, trip) => sum + toNumber(trip.discount_amount), 0);
  const amountCollected = bookings.reduce((sum, trip) => {
    const received = toNumber(trip.received_amount);
    const paid = toNumber(trip.amount_paid);
    return sum + Math.max(received, paid);
  }, 0);
  const outstandingAmount = Math.max(0, totalRevenue - amountCollected);

  const closingDays = bookings
    .filter((trip) => trip.created_at && trip.updated_at)
    .map((trip) => Math.max(0, (new Date(trip.updated_at) - new Date(trip.created_at)) / 86400000));
  const averageClosingDays = closingDays.length
    ? closingDays.reduce((sum, days) => sum + days, 0) / closingDays.length
    : 0;

  const clientBookingCounts = new Map();
  for (const trip of bookings) {
    const client = String(trip.client_name || '').trim().toLowerCase();
    if (client) clientBookingCounts.set(client, (clientBookingCounts.get(client) || 0) + 1);
  }
  const uniqueClients = new Set(
    trips.map((trip) => String(trip.client_name || '').trim().toLowerCase()).filter(Boolean)
  );
  const repeatClients = [...clientBookingCounts.values()].filter((count) => count > 1).length;

  const daysInPeriod = Math.max(1, (range.endExclusive - range.start) / 86400000);
  const weeksInPeriod = Math.max(1, daysInPeriod / 7);

  return {
    period: range.period,
    year: range.year,
    start_month: range.startMonth,
    end_month: range.endMonth,
    agent_name: agentName,
    sales: {
      period: range.period,
      year: range.year,
      month: range.startMonth === range.endMonth ? range.startMonth : 0,
      total_quotations: totalQuotations,
      approved_bookings: approvedBookings,
      conversion_rate: conversionRate,
      average_deal_size: approvedBookings > 0 ? totalRevenue / approvedBookings : 0,
      avg_quote_to_close_days: averageClosingDays
    },
    revenue: {
      monthly_revenue: totalRevenue,
      total_revenue: totalRevenue,
      gross_revenue: grossRevenue,
      total_discount: totalDiscount,
      amount_collected: amountCollected,
      outstanding_amount: outstandingAmount,
      payment_collection_rate: totalRevenue > 0 ? Math.min(100, amountCollected / totalRevenue * 100) : 0
    },
    efficiency: {
      win_rate_percent: conversionRate,
      quotations_per_week: totalQuotations / weeksInPeriod,
      avg_processing_time: averageClosingDays,
      approval_rate: conversionRate
    },
    customers: {
      total_unique_clients: uniqueClients.size,
      total_customers: uniqueClients.size,
      repeat_customer_rate: uniqueClients.size > 0 ? repeatClients / uniqueClients.size * 100 : 0,
      high_value_bookings: bookings.filter((trip) => toNumber(trip.final_amount) >= 100000).length,
      medium_value_bookings: bookings.filter((trip) => {
        const amount = toNumber(trip.final_amount);
        return amount >= 50000 && amount < 100000;
      }).length
    }
  };
}

async function loadMetrics(req, mode) {
  const range = getDateRange(req.query, mode);
  const agentId = getAgentId(req);
  const [trips, agent] = await Promise.all([
    prisma.trips.findMany({
      where: getTripWhere(req, range),
      select: {
        id: true,
        client_name: true,
        total_amount: true,
        discount_amount: true,
        final_amount: true,
        approved: true,
        is_booking: true,
        status: true,
        amount_paid: true,
        received_amount: true,
        created_at: true,
        updated_at: true
      }
    }),
    agentId ? prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } }) : Promise.resolve(null)
  ]);
  return buildMetrics(trips, range, agent?.name || null);
}

function metricHandler(mode, section = null) {
  return async (req, res, next) => {
    try {
      const metrics = await loadMetrics(req, mode);
      return res.json(section ? metrics[section] : metrics);
    } catch (error) {
      next(error);
    }
  };
}

export const getSalesMetrics = metricHandler('month', 'sales');
export const getRevenueMetrics = metricHandler('month', 'revenue');
export const getEfficiencyMetrics = metricHandler('month', 'efficiency');
export const getCustomerMetrics = metricHandler('month', 'customers');
export const getDashboardSummary = metricHandler('month');

export const getSalesMetricsForDateRange = metricHandler('range', 'sales');
export const getRevenueMetricsForDateRange = metricHandler('range', 'revenue');
export const getEfficiencyMetricsForDateRange = metricHandler('range', 'efficiency');
export const getCustomerMetricsForDateRange = metricHandler('range', 'customers');
export const getDashboardSummaryForDateRange = metricHandler('range');

export const getSalesMetricsForFullYear = metricHandler('year', 'sales');
export const getRevenueMetricsForFullYear = metricHandler('year', 'revenue');
export const getEfficiencyMetricsForFullYear = metricHandler('year', 'efficiency');
export const getCustomerMetricsForFullYear = metricHandler('year', 'customers');
export const getDashboardSummaryForFullYear = metricHandler('year');

export async function getMonthlyTrends(req, res, next) {
  try {
    const now = new Date();
    const months = parseBoundedInt(req.query.months, 12, 1, 36);
    const metricType = ['revenue', 'conversions', 'quotations'].includes(req.query.metric_type)
      ? req.query.metric_type
      : 'revenue';
    const endExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const start = new Date(Date.UTC(endExclusive.getUTCFullYear(), endExclusive.getUTCMonth() - months, 1));
    const where = { created_at: { gte: start, lt: endExclusive } };
    const agentId = getAgentId(req);
    if (agentId) where.agent_id = agentId;

    const trips = await prisma.trips.findMany({
      where,
      select: { created_at: true, final_amount: true, approved: true, is_booking: true, status: true }
    });
    const buckets = new Map();
    for (let offset = 0; offset < months; offset += 1) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
      buckets.set(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`, {
        year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, value: 0
      });
    }
    for (const trip of trips) {
      if (!trip.created_at) continue;
      const date = new Date(trip.created_at);
      const bucket = buckets.get(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`);
      if (!bucket) continue;
      if (metricType === 'revenue') {
        if (isBooking(trip)) bucket.value += toNumber(trip.final_amount);
      } else if (metricType === 'conversions') {
        if (isBooking(trip)) bucket.value += 1;
      } else {
        bucket.value += 1;
      }
    }
    return res.json([...buckets.values()]);
  } catch (error) {
    next(error);
  }
}

export async function getAgentPerformance(req, res, next) {
  try {
    const range = getDateRange(req.query, req.query.month ? 'month' : 'year');
    const agents = await prisma.agent.findMany({ select: { id: true, name: true } });
    const performance = await Promise.all(agents.map(async (agent) => {
      const trips = await prisma.trips.findMany({
        where: { agent_id: agent.id, created_at: { gte: range.start, lt: range.endExclusive } },
        select: { client_name: true, final_amount: true, total_amount: true, discount_amount: true, approved: true, is_booking: true, status: true, amount_paid: true, received_amount: true, created_at: true, updated_at: true }
      });
      return { agent_id: agent.id, agent_name: agent.name, ...buildMetrics(trips, range, agent.name) };
    }));
    return res.json(performance);
  } catch (error) {
    next(error);
  }
}

export async function getGlobalSummary(req, res, next) {
  try {
    return res.json(await loadMetrics(req, req.query.month ? 'month' : 'year'));
  } catch (error) {
    next(error);
  }
}

export async function invalidateCache(req, res, next) {
  try { return res.json({ status: 'invalidated' }); } catch (error) { next(error); }
}
export async function getUserActivities(req, res, next) {
  try { return res.json([]); } catch (error) { next(error); }
}
export async function getActivityStats(req, res, next) {
  try { return res.json({}); } catch (error) { next(error); }
}
export async function getUserStats(req, res, next) {
  try { return res.json({}); } catch (error) { next(error); }
}
export async function getEntityPopularity(req, res, next) {
  try { return res.json([]); } catch (error) { next(error); }
}
