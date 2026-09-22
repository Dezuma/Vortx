# Vortx audience & go-to-market

Vortx is public-record legal intelligence for **all** of the segments below;not only credit desks or law firms. Use this doc for website copy, X posts, sales conversations, and product prioritization.

## Product promise (shared)

- Aggregate **public or licensed** records: WARN notices, liens, bankruptcy dockets, pre-suit notices, and related filings.
- **Daily refresh**, entity timelines, friction scores, source links (subscriber), watchlists, alerts, exports.
- **Research and business intelligence only**;not legal, financial, credit, trading, or investment advice.

---

## 1. Retail investors & day traders

**Job:** Due diligence before taking or holding a position. WARN + bankruptcy dockets can signal financial distress before price moves.

**Hook:** *Before you hold a position in [company], here's what the public record shows…*

**Reach:** X, Reddit (r/investing, r/WallStreetBets), stock trading Discord servers, StockTwits.

**Sell:** Free signal queue → paid source links and watchlists. Always include "research only / not trading advice."

---

## 2. Small business owners

**Job:** Vet vendors, suppliers, and clients before signing contracts. Lien clusters or WARN notices = payment or operational risk.

**Hook:** *Before you sign a 6-figure contract, run these 3 public record checks.*

**Reach:** LinkedIn, local business Facebook groups, email.

**Sell:** Operator tier for a handful of counterparties; Professional for teams monitoring many vendors.

---

## 3. Journalists & researchers

**Job:** Find stories before they break. WARN and PACER filings are tips before the press release.

**Hook:** *The story ran March 22. The WARN notice was February 28. The record was public.*

**Reach:** Press Gazette newsletter, journalism X communities, ProPublica-adjacent accounts.

**Sell:** Timelines + source URLs + jurisdiction filters; emphasize **dated receipts** for fact-checking.

---

## 4. Real estate professionals

**Job:** Lien records for property transactions, title research, commercial due diligence.

**Hook:** *Lien clusters show up before the default story. Here's what to watch.*

**Reach:** BiggerPockets, RE-focused LinkedIn groups.

**Sell:** County/lien coverage in source transparency; watchlists per property or borrower entity.

---

## 5. Paralegals & legal ops

**Job:** Pre-litigation research, counterparty vetting, conflict checks. **Strongest Pro ($1,500/mo) buyers.**

**Hook:** *The adversary proceeding started in January. The public record showed the strain in October.*

**Reach:** LinkedIn, CLOC community, ACC (Association of Corporate Counsel).

**Sell:** Entity timelines, evidence packets, CSV export, API on Galactic;position as **professional research workflow**, not case outcome prediction.

---

## 6. HR & workforce professionals

**Job:** Monitor competitor WARN filings, sector layoff trends, workforce planning.

**Hook:** *Your competitor filed a WARN notice. The public knew before your team did.*

**Reach:** HR-focused LinkedIn, SHRM community.

**Sell:** Jurisdiction and sector filters; alerts on WARN record types;sticky monitoring use case.

---

## 7. Curious general public

**Job:** Understand what's happening with companies in their area, sector, or portfolio.

**Hook:** *Did you know this information is public and updated daily? Most people don't.*

**Reach:** X, Reddit, TikTok awareness content.

**Sell:** Top-of-funnel virality; route to free queue and pricing without consumer speculation language.

---

## 8. Credit & vendor risk teams

**Job:** Monitor counterparties, vendors, and portfolio companies before quarterly reviews, credit committees, and vendor onboarding.

**Hook:** *Receipts before the quarterly review.*

**Reach:** Enterprise email, credit/risk LinkedIn, vendor management forums, collections and competitive intelligence teams.

**Sell:** Friction scores, entity timelines, watchlists, CSV export, and audit-ready source links. **Core B2B dashboard buyer** — aligns with Litigation Lightning product surfaces.

**Marketing vs product:** Primary in-app segment (see `Vortx-Litigation-Lightning.mdc`). Segments 1–7 drive awareness and lead gen; segment 8 converts to paid tiers.

---

## Messaging matrix (quick)

| Segment | Lead record types | Tier bias |
| --- | --- | --- |
| Investors | WARN, bankruptcy | Nebula → Pulsar |
| SMB | WARN, liens, bankruptcy | Pulsar → Supernova |
| Journalists | WARN, dockets, dated timeline | Pulsar → Supernova |
| Real estate | Liens, county records | Pulsar |
| Legal ops | Adversary, dockets, full timeline | **Supernova → Galactic** |
| HR | WARN, sector queue | Pulsar |
| General public | Rotating free signals | Nebula entry |
| Credit & vendor risk | WARN, liens, friction scores, full timeline | **Supernova → Galactic** |

---

## Website `use_case` values (lead form)

`investors`, `smb`, `journalism`, `real_estate`, `legal_ops`, `hr_workforce`, `credit`, `litigation`, `collections`, `competitive`, `other`

---

## X marketing templates

See `worker/x-marketing-cron.js` ; templates `template-2` through `template-17` map to segment hooks. Ollama creative mode must rotate hooks across segments and stay compliance-safe.
