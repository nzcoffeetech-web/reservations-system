import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDateRange,
  buildIntelligenceCards,
  computePeriodMetrics,
} from '../src/lib/dashboardLogic.js';

const bookings = [
  { name: 'Aina', pax: 2, start_time: '2026-04-12T10:00:00+08:00', canceled: false },
  { name: 'Ben', pax: 12, start_time: '2026-04-18T11:00:00+08:00', canceled: false },
  { name: 'Cara', pax: 3, start_time: '2026-04-12T12:00:00+08:00', canceled: true },
  { name: 'Dina', pax: 8, start_time: '2026-05-01T13:00:00+08:00', canceled: false },
  { name: 'Eddy', pax: 10, start_time: '2026-05-02T14:00:00+08:00', canceled: false },
  { name: 'Farah', pax: 4, start_time: '2026-05-15T15:00:00+08:00', canceled: false },
  { name: 'Gopal', pax: 2, start_time: '2026-05-20T16:00:00+08:00', canceled: true },
];

test('this month preset uses the latest booking start_time as now', () => {
  const range = buildDateRange('this-month', bookings);

  assert.equal(range.from, '2026-05-01');
  assert.equal(range.to, '2026-05-20');
});

test('period metrics exclude canceled reservations and compare with equal-length prior period', () => {
  const metrics = computePeriodMetrics(bookings, {
    from: '2026-05-01',
    to: '2026-05-20',
  });

  assert.equal(metrics.reservations.value, 3);
  assert.equal(metrics.totalPax.value, 22);
  assert.equal(metrics.avgGroupSize.value, 7.33);
  assert.equal(metrics.reservations.deltaPct, 50);
  assert.equal(metrics.totalPax.deltaPct, 57.14);
});

test('intelligence cards render only met thresholds with specific actions', () => {
  const cards = buildIntelligenceCards({
    metrics: {
      reservations: { value: 3, previous: 6, deltaPct: -50 },
      cancellationRate: 12.5,
      group8PaxShare: 40,
      midweekBookings: 1,
      weekendBookings: 4,
    },
    customerBase: {
      total_customers: 100,
      one_time: 70,
      sleeping_giants: 55,
      winback_ready: 12,
      almost_habitual: 11,
      birthdays_this_month: 2,
      vips: 5,
    },
    range: { from: '2026-04-01', to: '2026-04-30' },
  });

  assert.deepEqual(
    cards.map((card) => card.tag),
    [
      'Warning',
      'Warning',
      'Warning',
      'Watch',
      'Watch',
      'Action',
      'Action',
      'Action',
      'Action',
      'Action',
    ],
  );
  assert.match(cards[0].finding, /post-Ramadan dip/i);
  assert.match(cards.find((card) => card.finding.includes('Sleeping giants')).action, /WhatsApp/i);
});
