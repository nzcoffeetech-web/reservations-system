-- =============================================================
-- v_kpi_summary  – single-row dashboard KPIs (avoids 1k cap)
-- =============================================================
create or replace view v_kpi_summary as
select
  (select count(*)                                from v_leads)                                                  as total_leads,
  (select count(*)                                from storehub_customers)                                       as total_customers,
  (select coalesce(sum(total_spent), 0)           from storehub_customers)                                       as lifetime_revenue,
  (select round(avg(total_spent))                 from v_leads where lead_type = 'customer + booker')            as avg_booker_spend,
  (select round(avg(total_spent))                 from v_leads where lead_type = 'customer (walk-in)')           as avg_walkin_spend;


-- =============================================================
-- v_segment_counts  – pre-aggregated plain-English segments
-- =============================================================
create or replace view v_segment_counts as
select
  segment_label,
  segment_meaning,
  segment_action,
  count(*)                as customers,
  sum(total_spent)::bigint as total_value
from v_segments_plain
group by segment_label, segment_meaning, segment_action
order by total_value desc;


-- =============================================================
-- v_rfm_counts  – pre-aggregated RFM tiers
-- =============================================================
create or replace view v_rfm_counts as
select
  rfm_segment,
  count(*)                       as customers,
  round(avg(rfm_score))::int     as avg_score,
  sum(total_spent)::bigint       as total_value
from v_segments_rfm
group by rfm_segment
order by customers desc;


-- =============================================================
-- RLS — strip anon, grant authenticated, set security_invoker
-- =============================================================
revoke select on v_kpi_summary, v_segment_counts, v_rfm_counts from anon;
grant  select on v_kpi_summary, v_segment_counts, v_rfm_counts to authenticated;

alter view v_kpi_summary    set (security_invoker = on);
alter view v_segment_counts set (security_invoker = on);
alter view v_rfm_counts     set (security_invoker = on);
