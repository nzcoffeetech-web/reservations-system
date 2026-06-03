-- =============================================================
-- v_segments_plain  – plain-English customer segmentation
-- =============================================================
create or replace view v_segments_plain as
with base as (
  select
    phone_e164,
    name,
    total_spent,
    total_visits,
    last_visit,
    (current_date - last_visit)::int                                      as days_since_visit,
    case
      when total_spent >= 500 then 'High'
      when total_spent >= 100 then 'Mid'
      else 'Low'
    end                                                                   as spend_tier,
    case
      when last_visit is not null and (current_date - last_visit) <= 120 then 'Active'
      else 'Lapsed'
    end                                                                   as recency_tier
  from storehub_customers
)
select
  phone_e164,
  name,
  total_spent,
  total_visits,
  last_visit,
  days_since_visit,
  case spend_tier || '-' || recency_tier
    when 'Mid-Active'  then 'Regulars'
    when 'High-Active' then 'Big spenders, still around'
    when 'High-Lapsed' then 'Big spenders gone quiet'
    when 'Mid-Lapsed'  then 'Used to come, faded out'
    when 'Low-Active'  then 'Tried us once or twice'
    when 'Low-Lapsed'  then 'Long gone'
  end                  as segment_label,
  case spend_tier || '-' || recency_tier
    when 'Mid-Active'  then 'Your bread and butter'
    when 'High-Active' then 'Your best people'
    when 'High-Lapsed' then 'High value, haven''t returned'
    when 'Mid-Lapsed'  then 'Biggest recoverable group'
    when 'Low-Active'  then 'New or light customers'
    when 'Low-Lapsed'  then 'Low spend, long ago'
  end                  as segment_meaning,
  case spend_tier || '-' || recency_tier
    when 'Mid-Active'  then 'Keep them happy'
    when 'High-Active' then 'Protect these'
    when 'High-Lapsed' then 'Win these back first'
    when 'Mid-Lapsed'  then 'Re-engage with an offer'
    when 'Low-Active'  then 'Turn them into regulars'
    when 'Low-Lapsed'  then 'Low priority'
  end                  as segment_action
from base;


-- =============================================================
-- v_segments_rfm  – technical RFM drill-down
-- =============================================================
create or replace view v_segments_rfm as
with scored as (
  select
    phone_e164,
    name,
    total_spent,
    total_visits,
    (current_date - last_visit)::int as days_since_visit,
    -- Recency
    case
      when last_visit is null                        then 0
      when (current_date - last_visit) <= 30         then 40
      when (current_date - last_visit) <= 90         then 30
      when (current_date - last_visit) <= 180        then 20
      when (current_date - last_visit) <= 365        then 10
      else 0
    end as r_pts,
    -- Frequency
    case
      when total_visits >= 20 then 30
      when total_visits >= 10 then 25
      when total_visits >= 5  then 20
      when total_visits >= 3  then 15
      when total_visits >= 2  then 10
      else 5
    end as f_pts,
    -- Monetary
    case
      when total_spent >= 1000 then 30
      when total_spent >= 500  then 25
      when total_spent >= 200  then 20
      when total_spent >= 50   then 10
      else 0
    end as m_pts
  from storehub_customers
)
select
  phone_e164,
  name,
  total_spent,
  total_visits,
  days_since_visit,
  r_pts + f_pts + m_pts as rfm_score,
  case
    when r_pts + f_pts + m_pts >= 85                             then 'vip'
    when r_pts + f_pts + m_pts >= 65                             then 'loyal'
    when r_pts + f_pts + m_pts >= 45                             then 'needs_nudge'
    when r_pts + f_pts + m_pts >= 30 and days_since_visit > 180 then 'win_back'
    when days_since_visit > 365                                  then 'sleeping_giant'
    else 'low_value'
  end as rfm_segment
from scored;


-- =============================================================
-- RLS lockdown – storehub_customers + calendly_bookings
-- =============================================================
alter table storehub_customers enable row level security;
alter table calendly_bookings  enable row level security;

revoke select on storehub_customers, calendly_bookings from anon;
grant  select on storehub_customers, calendly_bookings to authenticated;

create policy "authed read" on storehub_customers
  for select to authenticated using (true);

create policy "authed read" on calendly_bookings
  for select to authenticated using (true);


-- =============================================================
-- View security – flip to SECURITY INVOKER so views respect
-- base-table RLS (Supabase default is SECURITY DEFINER which
-- would bypass RLS since views are owned by postgres superuser)
-- Requires PostgreSQL 15+
-- =============================================================
alter view v_leads          set (security_invoker = on);
alter view v_segments_plain set (security_invoker = on);
alter view v_segments_rfm   set (security_invoker = on);
