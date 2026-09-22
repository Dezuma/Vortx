-- Allow trading-transparency event types alongside existing public-record types.
alter table public.legal_events
  drop constraint if exists legal_events_event_type_check;

alter table public.legal_events
  add constraint legal_events_event_type_check
  check (
    event_type in (
      'warn_notice',
      'mechanics_lien',
      'notice_of_intent',
      'civil_docket',
      'bankruptcy_docket',
      'bankruptcy_chapter_11',
      'bankruptcy_chapter_7',
      'bankruptcy_adversary',
      'receivership',
      'creditor_dispute',
      'regulatory_notice',
      'form_4',
      'congress_trade',
      'institutional_13f'
    )
  );
