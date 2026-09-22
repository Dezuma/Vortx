-- Contractor Check funnel (optional sales_leads use_case extension).
alter table public.sales_leads drop constraint if exists sales_leads_use_case_check;

alter table public.sales_leads add constraint sales_leads_use_case_check check (
  use_case = any (
    array[
      'investors'::text,
      'smb'::text,
      'journalism'::text,
      'real_estate'::text,
      'legal_ops'::text,
      'hr_workforce'::text,
      'credit'::text,
      'litigation'::text,
      'collections'::text,
      'competitive'::text,
      'other'::text,
      'blind_spot_scan'::text,
      'contractor_check'::text
    ]
  )
);
