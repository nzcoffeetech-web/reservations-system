const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REPORT_TIMEZONE = 'Asia/Kuala_Lumpur';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function dateKeyFromUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey, days) {
  return dateKeyFromUtc(new Date(dateFromKey(dateKey).getTime() + days * MS_PER_DAY));
}

function daysBetweenInclusive(from, to) {
  return Math.max(1, Math.round((dateFromKey(to) - dateFromKey(from)) / MS_PER_DAY) + 1);
}

function startOfMonth(dateKey) {
  return `${dateKey.slice(0, 7)}-01`;
}

function previousMonthRange(nowKey) {
  const now = dateFromKey(nowKey);
  const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const firstPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastPrevMonth = new Date(firstThisMonth.getTime() - MS_PER_DAY);

  return {
    from: dateKeyFromUtc(firstPrevMonth),
    to: dateKeyFromUtc(lastPrevMonth),
  };
}

export function toMalaysiaDateKey(value) {
  if (!value) return '';

  const parts = new Intl.DateTimeFormat('en', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function getLatestStartDate(bookings = []) {
  return bookings
    .map((booking) => booking.start_time)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];
}

export function buildDateRange(preset, bookings = [], custom = {}) {
  const datedBookings = bookings.filter((booking) => booking.start_time);
  const latestKey = toMalaysiaDateKey(getLatestStartDate(datedBookings) || new Date());
  const sortedKeys = datedBookings
    .map((booking) => toMalaysiaDateKey(booking.start_time))
    .sort();

  if (preset === 'custom') {
    return {
      from: custom.from || sortedKeys[0] || latestKey,
      to: custom.to || sortedKeys.at(-1) || latestKey,
    };
  }

  if (preset === 'prev-month') return previousMonthRange(latestKey);

  if (preset === 'last-7') return { from: addDays(latestKey, -6), to: latestKey };
  if (preset === 'last-30') return { from: addDays(latestKey, -29), to: latestKey };
  if (preset === 'last-90') return { from: addDays(latestKey, -89), to: latestKey };

  if (preset === 'all-time') {
    return {
      from: sortedKeys[0] || latestKey,
      to: sortedKeys.at(-1) || latestKey,
    };
  }

  return { from: startOfMonth(latestKey), to: latestKey };
}

export function getPriorRange(range) {
  const length = daysBetweenInclusive(range.from, range.to);
  const to = addDays(range.from, -1);

  return {
    from: addDays(to, -(length - 1)),
    to,
  };
}

export function filterBookings(bookings = [], range) {
  return bookings.filter((booking) => {
    const key = toMalaysiaDateKey(booking.start_time);
    return key && key >= range.from && key <= range.to;
  });
}

function isCanceled(booking) {
  return booking.canceled === true || booking.canceled === 'true';
}

function getPax(booking) {
  const pax = Number(booking.pax);
  return Number.isFinite(pax) ? pax : 0;
}

function rounded(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function deltaPct(current, previous) {
  if (!previous) return current ? null : 0;
  return rounded(((current - previous) / previous) * 100);
}

function metric(current, previous, digits = 0) {
  return {
    value: rounded(current, digits),
    previous: rounded(previous, digits),
    deltaPct: deltaPct(current, previous),
  };
}

function summarizePeriod(bookings) {
  const active = bookings.filter((booking) => !isCanceled(booking));
  const totalPax = active.reduce((sum, booking) => sum + getPax(booking), 0);
  const group8Pax = active
    .filter((booking) => getPax(booking) >= 8)
    .reduce((sum, booking) => sum + getPax(booking), 0);

  const midweekBookings = active.filter((booking) => {
    const day = dayIndexForBooking(booking);
    return day === 2 || day === 3;
  }).length;

  const weekendBookings = active.filter((booking) => {
    const day = dayIndexForBooking(booking);
    return day === 0 || day === 6;
  }).length;

  return {
    reservations: active.length,
    totalPax,
    avgGroupSize: active.length ? totalPax / active.length : 0,
    cancellationRate: bookings.length
      ? (bookings.filter(isCanceled).length / bookings.length) * 100
      : 0,
    group8PaxShare: totalPax ? (group8Pax / totalPax) * 100 : 0,
    midweekBookings,
    weekendBookings,
  };
}

export function computePeriodMetrics(bookings = [], range) {
  const currentBookings = filterBookings(bookings, range);
  const previousBookings = filterBookings(bookings, getPriorRange(range));
  const current = summarizePeriod(currentBookings);
  const previous = summarizePeriod(previousBookings);

  return {
    reservations: metric(current.reservations, previous.reservations),
    totalPax: metric(current.totalPax, previous.totalPax),
    avgGroupSize: metric(current.avgGroupSize, previous.avgGroupSize, 2),
    cancellationRate: rounded(current.cancellationRate),
    group8PaxShare: rounded(current.group8PaxShare),
    midweekBookings: current.midweekBookings,
    weekendBookings: current.weekendBookings,
    currentBookings,
    previousBookings,
  };
}

export function dayIndexForBooking(booking) {
  return new Date(`${toMalaysiaDateKey(booking.start_time)}T00:00:00.000Z`).getUTCDay();
}

export function groupByDayOfWeek(bookings = []) {
  const buckets = DAY_NAMES.map((day) => ({ label: day, bookings: 0 }));
  bookings
    .filter((booking) => !isCanceled(booking))
    .forEach((booking) => {
      buckets[dayIndexForBooking(booking)].bookings += 1;
    });
  return buckets;
}

export function groupByBookingHour(bookings = []) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: REPORT_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  });
  const counts = new Map();

  bookings
    .filter((booking) => !isCanceled(booking))
    .forEach((booking) => {
      const hour = formatter.format(new Date(booking.start_time));
      const label = `${hour}:00`;
      counts.set(label, (counts.get(label) || 0) + 1);
    });

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, bookingsCount]) => ({ label, bookings: bookingsCount }));
}

export function groupAcquisitionSources(bookings = []) {
  const counts = new Map();
  bookings
    .filter((booking) => !isCanceled(booking))
    .forEach((booking) => {
      const source = (booking.utm_source || 'Direct / unknown').trim() || 'Direct / unknown';
      counts.set(source, (counts.get(source) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, bookingsCount]) => ({ label, bookings: bookingsCount }));
}

export function topCustomersByPax(bookings = []) {
  const customers = new Map();

  bookings
    .filter((booking) => !isCanceled(booking))
    .forEach((booking) => {
      const name = (booking.name || 'Unknown customer').trim() || 'Unknown customer';
      const current = customers.get(name) || { name, pax: 0, bookings: 0 };
      current.pax += getPax(booking);
      current.bookings += 1;
      customers.set(name, current);
    });

  return [...customers.values()]
    .sort((a, b) => b.pax - a.pax || b.bookings - a.bookings || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function formatPct(value) {
  return `${rounded(value)}%`;
}

function isApril(range) {
  return range.from.slice(5, 7) === '04' && range.to.slice(5, 7) === '04';
}

export function buildIntelligenceCards({ metrics, customerBase = {}, range }) {
  const cards = [];
  const totalCustomers = Number(customerBase.total_customers) || 0;
  const oneTimeShare = totalCustomers ? ((Number(customerBase.one_time) || 0) / totalCustomers) * 100 : 0;
  const midweekThreshold = metrics.weekendBookings * 0.4;

  if (metrics.reservations.deltaPct !== null && metrics.reservations.deltaPct < -30) {
    const aprilNote = isApril(range) ? ' This looks like a post-Ramadan dip.' : '';
    cards.push({
      tag: 'Warning',
      tone: 'warning',
      finding: `Bookings are down ${Math.abs(metrics.reservations.deltaPct)}% vs the prior period.${aprilNote}`,
      action: 'Push a short weekday reservation offer on WhatsApp and pin it on Instagram for 72 hours.',
    });
  }

  if (metrics.cancellationRate > 10) {
    cards.push({
      tag: 'Warning',
      tone: 'warning',
      finding: `Cancellation rate is ${formatPct(metrics.cancellationRate)}.`,
      action: 'Send same-day confirmation messages and ask large groups to reconfirm before lunch service.',
    });
  }

  if ((Number(customerBase.sleeping_giants) || 0) >= 50) {
    cards.push({
      tag: 'Warning',
      tone: 'warning',
      finding: `Sleeping giants count is ${Number(customerBase.sleeping_giants)} customers.`,
      action: 'Run a direct WhatsApp winback with a family-set hook for high-value dormant guests.',
    });
  }

  if (oneTimeShare > 60) {
    cards.push({
      tag: 'Watch',
      tone: 'watch',
      finding: `One-time customers are ${formatPct(oneTimeShare)} of the base.`,
      action: 'Add a second-visit bounce-back note to receipts and post-visit messages.',
    });
  }

  if (metrics.weekendBookings > 0 && metrics.midweekBookings < midweekThreshold) {
    cards.push({
      tag: 'Watch',
      tone: 'watch',
      finding: `Tue/Wed bookings are ${metrics.midweekBookings}, below 40% of weekend volume (${metrics.weekendBookings}).`,
      action: 'Create a Tue-Wed kampung lunch bundle and promote it to nearby Rawang offices.',
    });
  }

  if ((Number(customerBase.winback_ready) || 0) >= 10) {
    cards.push({
      tag: 'Action',
      tone: 'action',
      finding: `${Number(customerBase.winback_ready)} customers are winback-ready.`,
      action: 'Send a personal return invite with a limited weekend table allocation.',
    });
  }

  if ((Number(customerBase.almost_habitual) || 0) >= 10) {
    cards.push({
      tag: 'Action',
      tone: 'action',
      finding: `${Number(customerBase.almost_habitual)} customers are almost habitual.`,
      action: 'Offer them a simple visit-three reward to convert repeat intent into habit.',
    });
  }

  if ((Number(customerBase.birthdays_this_month) || 0) >= 1) {
    cards.push({
      tag: 'Action',
      tone: 'action',
      finding: `${Number(customerBase.birthdays_this_month)} birthday guests are due this month.`,
      action: 'Invite them for a small birthday table setup and pre-book the group.',
    });
  }

  if (metrics.group8PaxShare > 35) {
    cards.push({
      tag: 'Action',
      tone: 'action',
      finding: `Groups of 8+ represent ${formatPct(metrics.group8PaxShare)} of pax.`,
      action: 'Feature a large-group reservation slot and prepare family-style add-ons.',
    });
  }

  if ((Number(customerBase.vips) || 0) >= 5) {
    cards.push({
      tag: 'Action',
      tone: 'action',
      finding: `${Number(customerBase.vips)} VIP customers are in the all-time base.`,
      action: 'Give VIPs first notice for seasonal specials and premium weekend tables.',
    });
  }

  return cards;
}

