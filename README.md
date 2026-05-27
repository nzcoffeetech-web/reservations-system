# NZ Coffee Intelligence

Single-page analytics dashboard for NZ Coffee in Sungai Choh, Rawang. The app ships as a static `dist/index.html` page with vanilla browser JavaScript and Chart.js. It reads Supabase REST views at runtime and renders a monthly intelligence report.

## Setup

```sh
npm install
cp .env.example .env
```

Add the read-only browser anon key:

```sh
SUPABASE_ANON_KEY=...
```

The Supabase project URL is configured in `src/pages/index.astro`. The build script injects `SUPABASE_ANON_KEY` into the generated static HTML without hardcoding it in committed source.

## Commands

```sh
npm run dev
npm test
npm run build
npm run preview
```

`npm run build` outputs a static site to `dist/`, suitable for Vercel static hosting.

## Monthly Workflow

1. Export the latest Calendly bookings CSV.
2. Export the latest StoreHub customer CSV.
3. In Supabase Table Editor, import the Calendly CSV into `stg_calendly`.
4. In Supabase Table Editor, import the StoreHub CSV into `stg_storehub`.
5. Reload the dashboard. It reads:
   - `v_cal` for filtered booking activity.
   - `dash_booking_trend` for monthly booking and pax trend.
   - `dash_segments` for all-time RFM customer segments.
   - `dash_customer_base` for all-time customer base value and action counts.

## Data Notes

Calendly booking rows are true time series data, so the dashboard date filter applies to reservations, pax, day-of-week, booking-hour, acquisition, and top-customer views.

StoreHub "Total Spent" is cumulative lifetime value, not monthly revenue. Customer base value and segment metrics are displayed as all-time snapshots and do not change with the date filter.

## Vercel

Set `SUPABASE_ANON_KEY` in the Vercel project environment variables, then deploy with the default build command:

```sh
npm run build
```

Use `dist` as the output directory.
