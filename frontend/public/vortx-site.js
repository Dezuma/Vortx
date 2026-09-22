(function () {
  var CANONICAL_SITE = 'https://vortxmkt.com'
  var path = (location.pathname || '/').replace(/\/+$/, '') || '/'

  function consumeAuthReturn() {
    try {
      var params = new URLSearchParams(location.search)
      var hash = location.hash.replace(/^#/, '')
      var hashParams = hash ? new URLSearchParams(hash) : null
      var returnView =
        sessionStorage.getItem('vortx_auth_return_view') ||
        params.get('view') ||
        'customer'
      if (returnView !== 'customer' && returnView !== 'admin') returnView = 'customer'

      if (hashParams && hashParams.get('access_token')) {
        sessionStorage.setItem(
          'vortx_pending_session',
          JSON.stringify({
            access_token: hashParams.get('access_token'),
            refresh_token: hashParams.get('refresh_token') || '',
          }),
        )
        sessionStorage.setItem('vortx_auth_return_view', returnView)
        history.replaceState(null, '', location.pathname + '?view=' + encodeURIComponent(returnView))
        return
      }

      if (params.get('code')) {
        sessionStorage.setItem('vortx_auth_return_view', returnView)
        if (!params.get('view')) {
          params.set('view', returnView)
          history.replaceState(null, '', location.pathname + '?' + params.toString())
        }
      }

      if (params.get('error') || params.get('error_description')) {
        var message = params.get('error_description') || params.get('error') || 'Sign-in failed.'
        sessionStorage.setItem('vortx_auth_error', message)
        params.delete('error')
        params.delete('error_description')
        params.set('view', returnView)
        history.replaceState(null, '', location.pathname + '?' + params.toString())
      }
    } catch (err) {}
  }

  consumeAuthReturn()

  if (location.hostname === 'www.vortxmkt.com') {
    location.replace(CANONICAL_SITE + location.pathname + location.search + location.hash)
    return
  }

  function initPageTheme() {
    if (document.getElementById('vortx-page-theme-style')) return
    if (!document.body) return

    var style = document.createElement('style')
    style.id = 'vortx-page-theme-style'
    style.textContent =
      ':root{' +
      '--color-ink:#f8fafc;--color-muted:#cbd5e1;--color-soft:#94a3b8;--color-accent:#38bdf8;' +
      '--color-line:rgba(148,163,184,.28);--color-panel:#0b1220;--color-metallic:rgba(148,163,184,.4);' +
      '--vortx-page:min(88rem,calc(100vw - 3rem))}' +
      'html{color-scheme:dark;background:#030712;-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
      'body{background:#030712!important;min-height:100svh;max-width:100%;color:var(--color-ink)}' +
      '.vortx-app-shell{background:#030712!important;color:var(--color-ink)}' +
      '.vortx-hero-section{isolation:isolate;overflow:visible;position:relative}' +
      '.vortx-terminal-home__strip{width:100%}' +
      '.vortx-live-pulse--terminal{position:relative;top:auto}' +
      '.vortx-public-proof{box-shadow:0 10px 28px rgba(2,132,199,.12)}' +
      '.vortx-alert-capture input[type="email"]:focus{outline:2px solid #7dd3fc;outline-offset:1px}' +
      '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
      '.vortx-live-pulse .vortx-trade-card--locked:hover{border-color:rgba(125,211,252,.55)!important}' +
      '.vortx-pricing-card--limited{opacity:.92;background:#0b1220!important;border-color:#334155!important;box-shadow:none!important}' +
      '.vortx-pricing-card--limited .vortx-pricing-card__header{background:#0f172a!important}' +
      '.vortx-pricing-card--limited .vortx-pricing-card__eyebrow{color:#94a3b8!important}' +
      '.vortx-pricing-card--limited .vortx-pricing-card__price{color:#cbd5e1!important}' +
      '.vortx-pricing-card--limited .vortx-pricing-card__tag{background:#111827!important;color:#94a3b8!important;border-bottom-color:#334155!important}' +
      '.vortx-pricing-grid:has(.vortx-pricing-card--featured):not(:has(.vortx-pricing-card--limited)){grid-template-columns:minmax(0,22rem);justify-content:start}' +
      'details#pricing-limited-plans summary,details#pricing-api-plans summary{outline:none;cursor:pointer}' +
      'details#pricing-limited-plans[open] summary,details#pricing-api-plans[open] summary{margin-bottom:.25rem}' +
      /* Flush to viewport left edge; fixed across scroll + views */
      '.vortx-app-shell{display:flex;flex-direction:column;min-height:100svh;max-width:100%;position:relative;isolation:isolate}' +
      '.vortx-app-main{min-width:0;max-width:100%}' +
      '.vortx-app-shell > header{position:sticky;z-index:20;flex-shrink:0}' +
      '.vortx-greek-field{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden}' +
      '.vortx-greek-field__col{position:absolute;top:0;bottom:0;width:4.25rem;overflow:hidden}' +
      '.vortx-greek-field__col--left{left:max(0px,env(safe-area-inset-left))}' +
      '.vortx-greek-field__col--right{right:max(0px,env(safe-area-inset-right))}' +
      '.vortx-greek-field__glyph{position:absolute;bottom:-12vh;color:var(--glyph-color,#334155);font-family:"Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif;' +
      'font-weight:400;line-height:1;user-select:none;opacity:var(--glyph-opacity,.11);letter-spacing:0;' +
      'text-shadow:0 0 7px color-mix(in srgb,var(--glyph-color,#64748b) 8%,transparent);' +
      'animation-name:vortx-greek-rise;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}' +
      '@keyframes vortx-greek-rise{from{transform:translate3d(var(--drift,0px),10vh,0) rotate(var(--rot,0deg));opacity:0}' +
      '14%{opacity:var(--glyph-opacity,.11)}86%{opacity:var(--glyph-opacity,.11)}' +
      'to{transform:translate3d(var(--drift,0px),-120vh,0) rotate(calc(var(--rot,0deg) + 22deg));opacity:0}}' +
      '.vortx-app-shell--map .vortx-greek-field{display:none}' +
      '.vortx-page-col,.vortx-terminal-home > .vortx-stage,.vortx-terminal-home > .vortx-live-block,' +
      '.vortx-terminal-home > .vortx-check,.vortx-terminal-home > .vortx-stage__stats,' +
      '.vortx-terminal-home > .vortx-map-inline{width:var(--vortx-page);margin-left:auto;margin-right:auto}' +
      '.vortx-app-shell .max-w-6xl,.vortx-site-header .max-w-6xl{max-width:var(--vortx-page)!important}' +
      '@media (min-width:1400px){.vortx-greek-field__col{width:max(4.25rem,calc((100vw - var(--vortx-page)) / 2 - .4rem))}}' +
      '@media (max-width:720px){.vortx-greek-field{opacity:.62}' +
      '.vortx-greek-field__col{width:2.35rem}' +
      '.vortx-greek-field__glyph{font-weight:400;text-shadow:none}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-greek-field,.vortx-greek-field__glyph{animation:none;opacity:.12}}' +
      '.vortx-site-header{min-height:3.5rem;display:flex;align-items:center;background:rgba(3,7,18,.92)!important;backdrop-filter:blur(16px)}' +
      '.vortx-site-header__inner{width:100%;min-height:3.5rem}' +
      '.vortx-site-header__mark{border:0;background:transparent;color:#f8fafc;font-size:1.05rem;font-weight:650;' +
      'letter-spacing:-.03em;cursor:pointer;padding:0;line-height:1}' +
      '.vortx-site-header__nav{display:flex;align-items:center;gap:.1rem;flex:1;min-width:0}' +
      '.vortx-site-header__link,.vortx-site-header__search,.vortx-site-header__text{border:0;background:transparent;color:#94a3b8;' +
      'padding:.4rem .7rem;font-size:.82rem;border-radius:.45rem;cursor:pointer;transition:color .18s ease,background .18s ease}' +
      '.vortx-site-header__link:hover,.vortx-site-header__search:hover,.vortx-site-header__text:hover{color:#f8fafc;background:rgba(148,163,184,.12)}' +
      '.vortx-site-header__link.is-active{color:#f8fafc;background:rgba(56,189,248,.14)}' +
      '.vortx-site-header__actions{display:flex;align-items:center;gap:.35rem;margin-left:auto;flex-shrink:0}' +
      '.vortx-site-header__plan{color:#94a3b8;font-size:.65rem;letter-spacing:.04em;padding:.2rem .45rem;border:1px solid rgba(148,163,184,.28);border-radius:.4rem}' +
      '.vortx-site-header__cta{border:0;background:#0284c7;color:#fff;font-size:.78rem;font-weight:650;padding:.42rem .85rem;' +
      'border-radius:.5rem;cursor:pointer;transition:background .18s ease}' +
      '.vortx-site-header__cta:hover{background:#0369a1}' +
      '.vortx-site-header__link:focus-visible,.vortx-site-header__search:focus-visible,.vortx-site-header__text:focus-visible,' +
      '.vortx-site-header__cta:focus-visible,.vortx-site-header__mark:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}' +
      '.vortx-text-link{border:0;background:transparent;color:#7dd3fc;font-size:.82rem;font-weight:600;cursor:pointer;padding:0;' +
      'text-decoration:underline;text-underline-offset:3px;transition:color .18s ease}' +
      '.vortx-text-link:hover{color:#e0f2fe}' +
      '.vortx-proof-chip{margin:0;display:inline-flex;align-items:center;border:0;background:transparent;' +
      'color:#94a3b8;padding:0;font-size:.75rem;font-weight:500}' +
      '.vortx-site-header__searchfield{display:inline-flex;align-items:center;gap:.65rem;min-width:12.5rem;max-width:18rem;' +
      'height:2rem;padding:0 .55rem 0 .75rem;border:1px solid rgba(148,163,184,.32);border-radius:.45rem;' +
      'background:#020617;color:#94a3b8;font-size:.78rem;cursor:pointer;transition:border-color .18s ease}' +
      '.vortx-site-header__searchfield:hover,.vortx-site-header__searchfield:focus-visible{border-color:#38bdf8;color:#e2e8f0}' +
      '.vortx-site-header__searchfield-placeholder{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.vortx-site-header__kbd{display:inline-flex;align-items:center;border:1px solid rgba(148,163,184,.28);border-radius:.3rem;' +
      'padding:.05rem .35rem;font-size:.62rem;letter-spacing:.04em;color:#94a3b8;background:#0b1220}' +
      '@media (max-width:900px){.vortx-site-header{min-height:0;padding-top:env(safe-area-inset-top);' +
      'padding-left:max(1rem,env(safe-area-inset-left));padding-right:max(1rem,env(safe-area-inset-right))}' +
      '.vortx-site-header__inner{flex-wrap:wrap;gap:.45rem;padding:.45rem 0;min-height:0}' +
      '.vortx-site-header__mark{font-size:1rem}' +
      '.vortx-site-header__nav{order:3;width:100%;overflow:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;' +
      'padding-bottom:.15rem}' +
      '.vortx-site-header__nav::-webkit-scrollbar{display:none}' +
      '.vortx-site-header__link,.vortx-site-header__text{padding:.45rem .6rem;min-height:2.75rem;' +
      'display:inline-flex;align-items:center;white-space:nowrap}' +
      '.vortx-site-header__actions{flex:1 1 auto;min-width:0;gap:.35rem;flex-wrap:wrap;justify-content:flex-end}' +
      '.vortx-site-header__searchfield{flex:1 1 8rem;min-width:0;width:auto;max-width:none;height:2.75rem;padding:0 .7rem}' +
      '.vortx-site-header__kbd{display:none}' +
      '.vortx-site-header__cta{min-height:2.75rem;padding:.4rem .75rem;white-space:nowrap}}' +
      '@media (max-width:480px){.vortx-site-header__searchfield{flex:0 1 7.25rem;width:auto;min-width:0;max-width:7.25rem}' +
      '.vortx-site-header__actions{flex-wrap:nowrap;gap:.25rem}' +
      '.vortx-site-header__inner{gap:.3rem;padding:.3rem 0}' +
      '.vortx-site-header__link,.vortx-site-header__cta,.vortx-site-header__text{min-height:2.5rem;padding:.35rem .55rem}}' +
      '@media (max-width:360px){.vortx-site-header__searchfield{display:none}}' +
      '.vortx-tape-wrap{width:100%;max-width:100%;min-width:0;overflow:auto;border:1px solid rgba(148,163,184,.22);border-radius:.5rem;background:#0b1220;' +
      '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}' +
      '.vortx-tape{width:100%;border-collapse:collapse;font-size:.8rem}' +
      '.vortx-tape th{text-align:left;font-size:.68rem;font-weight:600;color:#94a3b8;letter-spacing:.02em;' +
      'padding:.55rem .7rem;border-bottom:1px solid rgba(148,163,184,.22);background:#0b1220;white-space:nowrap}' +
      '.vortx-tape td{padding:.55rem .7rem;border-bottom:1px solid rgba(148,163,184,.12);color:#e2e8f0;vertical-align:middle;white-space:nowrap}' +
      '.vortx-tape td.vortx-tape__filer,.vortx-tape td.vortx-tape__source{white-space:normal;max-width:16rem}' +
      '.vortx-filer{display:inline-flex;align-items:center;gap:.55rem;min-width:0;max-width:16rem}' +
      'button.vortx-filer--open{background:none;border:0;padding:0;margin:0;color:inherit;font:inherit;cursor:pointer;text-align:left}' +
      '.vortx-filer__desk{display:block;font-size:.62rem;font-weight:700;color:#7dd3fc;letter-spacing:.04em;' +
      'text-decoration:underline;text-underline-offset:3px}' +
      '.vortx-filer--open:hover .vortx-filer__desk,.vortx-filer--open:focus .vortx-filer__desk{color:#e0f2fe}' +
      '.vortx-tape--home .vortx-filer{max-width:18rem}' +
      'html.vortx-whale-open,html.vortx-whale-open body{overflow:hidden}' +
      '.vortx-whale-layer{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:0 .75rem max(.85rem,env(safe-area-inset-bottom));pointer-events:none}' +
      '.vortx-whale__backdrop{position:absolute;inset:0;border:0;padding:0;background:rgba(2,6,23,.55);cursor:pointer;pointer-events:auto}' +
      '.vortx-whale{position:relative;z-index:1;width:min(36rem,100%);max-height:min(72dvh,34rem);overflow:auto;margin:0;padding:1rem 1.1rem 1.15rem;' +
      'border:1px solid rgba(56,189,248,.28);border-radius:1.1rem 1.1rem .85rem .85rem;background:#020617;box-shadow:0 18px 48px rgba(0,0,0,.45);pointer-events:auto}' +
      '@media (min-width:720px){.vortx-whale-layer{align-items:center;padding:1.25rem}.vortx-whale{border-radius:1.1rem;max-height:min(78dvh,36rem)}}' +
      '.vortx-whale__top{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.8rem}' +
      '.vortx-whale__name{margin:.2rem 0 0;font-size:1.35rem;color:#f8fafc}' +
      '.vortx-whale__mix,.vortx-whale__note{margin:.35rem 0 0;font-size:.78rem;line-height:1.45;color:#94a3b8}' +
      '.vortx-whale__actions{display:flex;flex-wrap:wrap;gap:.45rem}' +
      '.vortx-whale__close{border:1px solid rgba(148,163,184,.35);background:transparent;color:#cbd5e1;border-radius:.65rem;padding:.45rem .7rem;cursor:pointer}' +
      '.vortx-whale__stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem;margin-top:.85rem}' +
      '.vortx-whale__stat{padding:.7rem .75rem;border-radius:.75rem;background:#0b1220;border:1px solid rgba(148,163,184,.16)}' +
      '.vortx-whale__stat--lock{opacity:.78}' +
      '.vortx-whale__stat-kicker{margin:0;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-whale__stat-value{margin:.3rem 0 0;font-size:1.05rem;font-weight:700;color:#f8fafc}' +
      '.vortx-whale__stat-hint{margin:.25rem 0 0;font-size:.7rem;line-height:1.4;color:#94a3b8}' +
      '.vortx-whale__cta{display:inline-flex;margin-top:.85rem;border:0;border-radius:.75rem;padding:.65rem .9rem;background:#0369a1;color:#f8fafc;font-weight:700;cursor:pointer}' +
      '.vortx-most-watched__row--open{cursor:pointer}' +
      '.vortx-most-watched__row--open:hover{background:rgba(56,189,248,.08)}' +
      '@media (max-width:640px){.vortx-whale__stats{grid-template-columns:1fr}.vortx-filer{max-width:12rem}}' +
      '.vortx-filer__name{min-width:0;line-height:1.3;font-weight:650;color:#f8fafc}' +
      '.vortx-filer-face{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;overflow:hidden;' +
      'width:2.75rem;height:2.75rem;border-radius:999px;color:#e2e8f0;' +
      'background:radial-gradient(circle at 30% 20%,hsl(var(--filer-h,210) 28% 28%),hsl(var(--filer-h,210) 34% 14%));' +
      'box-shadow:inset 0 0 0 1px rgba(148,163,184,.3),0 0 0 2px #030712}' +
      '.vortx-filer-face--sm{width:2rem;height:2rem}' +
      '.vortx-filer-face[data-kind="fund"],.vortx-filer-face[data-kind="company"],.vortx-filer-face[data-kind="building"]{border-radius:.55rem}' +
      '.vortx-filer-face[data-kind="locked"]{background:#0b1220}' +
      '.vortx-filer-face[data-kind="locked"] .vortx-filer-face__mark{width:100%;height:100%;' +
      'background:repeating-linear-gradient(-28deg,rgba(148,163,184,.14) 0 3px,transparent 3px 7px)}' +
      '.vortx-filer-face__photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;display:block;background:transparent}' +
      '.vortx-filer-face[data-kind="company"] .vortx-filer-face__photo,' +
      '.vortx-filer-face[data-kind="building"] .vortx-filer-face__photo,' +
      '.vortx-filer-face[data-kind="fund"] .vortx-filer-face__photo{object-fit:contain;object-position:center;padding:3px;background:#0f172a}' +
      '.vortx-filer-face__mark{font-size:.7rem;font-weight:750;letter-spacing:.03em}' +
      '.vortx-filer-face--sm .vortx-filer-face__mark{font-size:.56rem}' +
      '.vortx-filer-face__pip{position:absolute;right:1px;bottom:1px;width:.42rem;height:.42rem;border-radius:999px;' +
      'border:1px solid #030712;background:#94a3b8}' +
      '.vortx-filer-face--sm .vortx-filer-face__pip{width:.34rem;height:.34rem}' +
      '.vortx-filer-face[data-type="congress_trade"] .vortx-filer-face__pip{background:#38bdf8}' +
      '.vortx-filer-face[data-type="form_4"] .vortx-filer-face__pip{background:#a78bfa}' +
      '.vortx-filer-face[data-type="institutional_13f"] .vortx-filer-face__pip{background:#34d399}' +
      '.vortx-desk-card__head{align-items:flex-start}' +
      '.vortx-desk-card__head .vortx-filer-face{margin-top:.1rem}' +
      '.vortx-tape__row{transition:background .15s ease}' +
      '.vortx-tape__row:hover{background:rgba(148,163,184,.08)}' +
      '.vortx-tape__row--locked{cursor:pointer}' +
      '.vortx-tape__row--featured td{background:rgba(56,189,248,.06)}' +
      '.vortx-tape__ticker{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;color:#7dd3fc}' +
      '.vortx-ticker-link{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;color:#7dd3fc;' +
      'background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
      '.vortx-ticker-link:hover{color:#e0f2fe}' +
      'a.vortx-ticker-link{color:#7dd3fc}' +
      '.vortx-ticker-pair{display:inline-flex;align-items:center;gap:.45rem;flex-wrap:wrap}' +
      '.vortx-live-quote{font-size:.68rem;font-weight:700;color:#94a3b8;text-decoration:underline;text-underline-offset:2px}' +
      '.vortx-live-quote:hover{color:#e0f2fe}' +
      '.vortx-tape-source-link{color:#7dd3fc;font-weight:700;text-decoration:underline;text-underline-offset:2px}' +
      '.vortx-tape-source-link:hover{color:#e0f2fe}' +
      '.vortx-tape-source--missing{color:#94a3b8}' +
      '.vortx-tape-source__miss{display:block;font-size:.62rem;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:#64748b}' +
      '.vortx-live-trade{display:grid;gap:.45rem}' +
      '.vortx-live-trade__brokers{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center}' +
      '.vortx-live-trade__hint{margin:.15rem 0 0;font-size:.72rem;line-height:1.4;color:#94a3b8}' +
      '.vortx-live-trade__broker{display:inline-flex;color:#7dd3fc;font-size:.75rem;font-weight:700}' +
      '.vortx-tape__amount{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#cbd5e1}' +
      '.vortx-tape__time,.vortx-tape__muted{color:#94a3b8}' +
      '.vortx-tape--home{min-width:0}' +
      '.vortx-tape__who-lock{color:#94a3b8;font-weight:600}' +
      '.vortx-tape__next{border:1px solid rgba(148,163,184,.35);background:transparent;color:#f8fafc;' +
      'border-radius:.5rem;padding:.32rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer}' +
      '.vortx-tape__next:hover,.vortx-tape__next:focus{border-color:#38bdf8;color:#fff}' +
      '.vortx-tape .vortx-desk-watch-btn{padding:.2rem .5rem;font-size:.68rem;background:transparent;color:#94a3b8;' +
      'border-color:rgba(148,163,184,.35)}' +
      '.vortx-tape .vortx-desk-watch-btn--on{color:#86efac;border-color:rgba(52,211,153,.45)}' +
      '.vortx-skel{display:block;height:.7rem;width:72%;border-radius:.25rem;background:rgba(148,163,184,.16)}' +
      '.vortx-tape__row--skeleton td:nth-child(2) .vortx-skel{width:42%}' +
      '.vortx-tape__row--skeleton td:nth-child(4) .vortx-skel{width:55%}' +
      '.vortx-live-pulse--terminal,.vortx-tape-panel{background:transparent!important;border:0!important;padding:0!important;border-radius:0!important}' +
      '.vortx-more-block{margin-top:.85rem;border-top:1px solid rgba(148,163,184,.18);padding-top:.65rem}' +
      '.vortx-more-block summary{cursor:pointer;color:#94a3b8;font-size:.78rem;font-weight:600}' +
      '.vortx-more-block summary:hover{color:#f8fafc}' +
      '.vortx-map-inline{padding-top:.15rem}' +
      '.vortx-app-main{position:relative;z-index:2;isolation:isolate;flex:1 0 auto;min-width:0}' +
      '.vortx-site-footer{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;' +
      'z-index:4;flex-shrink:0;margin-top:0;background:#030712;isolation:isolate}' +
      '.vortx-site-footer a,.vortx-site-footer button{position:relative}' +
      '.vortx-cases-rail{display:none}' +
      '@media (min-width:1720px){' +
      '.vortx-cases-rail{display:flex;flex-direction:column;gap:.55rem;position:fixed;z-index:15;' +
      'top:5.25rem;bottom:auto;max-height:calc(100vh - 6.5rem);height:auto;width:13.5rem;padding:.85rem .8rem;' +
      'left:calc(50% + (var(--vortx-page) / 2) + .75rem);right:auto;' +
      'border:1px solid rgba(148,163,184,.28);border-radius:1rem;background:rgba(15,23,42,.88);' +
      'backdrop-filter:blur(10px);box-shadow:0 10px 28px rgba(0,0,0,.28);overflow:hidden}' +
      '.vortx-cases-rail__head{display:flex;align-items:center;justify-content:space-between;gap:.5rem}' +
      '.vortx-cases-rail__all{border:0;background:transparent;color:#0369a1;font-size:.7rem;font-weight:700;cursor:pointer}' +
      '.vortx-cases-rail__list{list-style:none;margin:0;padding:0;overflow:auto;flex:1;min-height:0;display:flex;flex-direction:column;gap:.45rem}' +
      '.vortx-cases-rail__item{display:flex;flex-direction:column;gap:.15rem;padding:.55rem .6rem;border-radius:.7rem;' +
      'border:1px solid rgba(148,163,184,.28);background:rgba(2,6,23,.55);text-decoration:none;color:inherit}' +
      '.vortx-cases-rail__item:hover{border-color:#38bdf8;background:rgba(14,165,233,.12)}' +
      '.vortx-cases-rail__type{font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-cases-rail__title{font-size:.78rem;font-weight:600;line-height:1.35;color:#f8fafc;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
      '.vortx-cases-rail__muted{margin:0;font-size:.75rem;color:#94a3b8;line-height:1.4}' +
      '.vortx-cases-rail__substack{margin-top:auto;font-size:.72rem;font-weight:700;color:#7dd3fc;text-decoration:none}' +
      '}' +
      '.vortx-politician-stage{display:none!important;pointer-events:none;position:fixed;z-index:0;overflow:hidden;' +
      'top:0;bottom:0;left:0;width:0}' +
      '.vortx-politician-stage::after{content:"";position:absolute;inset:0;z-index:1;' +
      'background:linear-gradient(90deg,rgba(3,7,18,.55) 0%,rgba(3,7,18,.82) 55%,#030712 100%),' +
      'linear-gradient(180deg,rgba(3,7,18,.4) 0%,transparent 40%,#030712 100%)}' +
      '.vortx-politician-portrait{position:absolute;left:0;top:4.75rem;' +
      'width:100%;max-width:18rem;height:calc(100vh - 5rem);' +
      'object-fit:contain;object-position:left top;opacity:.14;' +
      'filter:grayscale(.35) contrast(1.05) brightness(.7);' +
      'animation:none}' +
      '.vortx-overview-shell .vortx-hero-section .display-font,' +
      '.vortx-overview-shell .vortx-hero-section .text-muted,' +
      '.vortx-overview-shell .vortx-hero-section .eyebrow{' +
      'text-shadow:none}' +
      '@keyframes vortx-politician-drift{from{transform:none}to{transform:none}}' +
      '@media (max-width:1023px){.vortx-politician-stage{width:min(42vw,12rem)}' +
      '.vortx-politician-portrait{top:4.5rem;height:min(50vh,18rem);opacity:.1}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-politician-portrait{animation:none!important}}' +
      '.vortx-statesman-watermark{display:none!important}' +
      '.vortx-trade-card{position:relative;overflow:hidden;background:rgba(2,6,23,.55)!important;border:1px solid rgba(148,163,184,.32)!important}' +
      '.vortx-trade-filer-locked{display:block;height:1.05rem;width:min(42%,11rem);border-radius:.35rem;' +
      'background:linear-gradient(90deg,#cbd5e1 0%,#e2e8f0 40%,#cbd5e1 80%);filter:blur(3px);opacity:.9}' +
      '.vortx-trade-filer-locked--inline{display:inline-block;vertical-align:-0.2em;height:1em;width:7.25rem;margin-right:.2rem}.vortx-trade-locked-chip{display:inline-flex;align-items:center;flex-shrink:0;vertical-align:-0.15em;margin-right:.25rem;padding:.14rem .5rem;border-radius:.4rem;border:1px solid #cbd5e1;background:linear-gradient(90deg,#e2e8f0,#f8fafc,#e2e8f0);background-size:200% 100%;color:#475569;font-size:.72em;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;max-width:100%;animation:vortx-locked-shimmer 2.4s ease-in-out infinite}@keyframes vortx-locked-shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@media (prefers-reduced-motion:reduce){.vortx-trade-locked-chip{animation:none}}.vortx-trade-role{display:inline-flex;align-items:center;border-radius:.4rem;padding:.2rem .5rem;font-size:.65rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:#eff6ff;color:#0369a1;border:1px solid #bfdbfe}.vortx-trade-hot{display:inline-flex;align-items:center;border-radius:.4rem;padding:.2rem .5rem;font-size:.65rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}.glass-panel .vortx-trade-role{background:rgba(14,165,233,.18);color:#7dd3fc;border-color:rgba(125,211,252,.35)}.glass-panel .vortx-trade-hot{background:rgba(249,115,22,.2);color:#fdba74;border-color:rgba(251,146,60,.4)}.vortx-trade-card--locked{cursor:pointer}.vortx-trade-card--locked:hover{border-color:#7dd3fc!important;box-shadow:0 10px 28px rgba(2,132,199,.12)}.glass-panel .vortx-trade-locked-chip{border-color:rgba(148,163,184,.55);background:linear-gradient(90deg,#334155,#475569,#334155);background-size:200% 100%;color:#e2e8f0}' +
      '.vortx-trade-headline{overflow-wrap:anywhere;min-width:0}' +
      '.vortx-trade-filer-name{display:inline}' +
      '.vortx-trade-headline__detail,.vortx-trade-headline__verb{font-weight:600}' +
      '.vortx-trade-card__top{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}' +
      '.vortx-trade-card__time{flex-shrink:0;white-space:nowrap}' +
      '.vortx-trade-hero{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;min-width:0}' +
      '.vortx-trade-ticker{display:inline-flex;align-items:center;padding:.2rem .45rem;border-radius:.4rem;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.72rem;font-weight:700;' +
      'letter-spacing:.04em;color:#0369a1;background:#eff6ff;border:1px solid #bfdbfe}' +
      '.vortx-trade-amount{display:inline-flex;align-items:center;padding:.2rem .45rem;border-radius:.4rem;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.72rem;font-weight:700;' +
      'color:#166534;background:#dcfce7;border:1px solid #bbf7d0}' +
      '.glass-panel .vortx-trade-ticker{color:#7dd3fc;background:rgba(14,165,233,.16);border-color:rgba(125,211,252,.35)}' +
      '.glass-panel .vortx-trade-amount{color:#86efac;background:rgba(22,163,74,.18);border-color:rgba(134,239,172,.35)}' +
      '.vortx-trade-card--exemplar{border-color:rgba(56,189,248,.55)!important;box-shadow:0 0 0 1px rgba(56,189,248,.25),0 12px 32px rgba(2,132,199,.18)}' +
      '.vortx-trade-unlock-line{letter-spacing:.01em}' +
      '.vortx-trade-action{display:inline-flex;align-items:center;gap:.2rem;padding:.14rem .55rem;margin:0;' +
      'font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;flex-shrink:0;white-space:nowrap;' +
      'border:0;border-radius:999px;line-height:1.15}' +
      '.vortx-trade-action__dir{font-size:.62rem;line-height:1;filter:drop-shadow(0 0 2px currentColor)}' +
      '.vortx-trade-action--buy{background:#0a3d28;color:#86efac;border:0;' +
      'box-shadow:0 0 8px rgba(34,197,94,.22);text-shadow:0 0 4px rgba(134,239,172,.28)}' +
      '.vortx-trade-action--sell{background:#4a121c;color:#fda4af;border:0;' +
      'box-shadow:0 0 8px rgba(244,63,94,.22);text-shadow:0 0 4px rgba(253,164,175,.28)}' +
      '.vortx-trade-action--disclose{background:#0c3d5c;color:#7dd3fc;border:0;' +
      'box-shadow:0 0 7px rgba(14,165,233,.2);text-shadow:0 0 4px rgba(125,211,252,.25)}' +
      '.vortx-trade-action--report{background:#0a3d3c;color:#5eead4;border:0;' +
      'box-shadow:0 0 7px rgba(20,184,166,.2);text-shadow:0 0 4px rgba(94,234,212,.25)}' +
      '.vortx-tape__side-head{color:#67e8f9;letter-spacing:.12em;text-transform:uppercase;font-size:.62rem;' +
      'text-shadow:0 0 10px rgba(34,211,238,.45)}' +
      '.vortx-tape td.vortx-tape__side{vertical-align:middle;width:1%;white-space:nowrap}' +
      '.vortx-stack-mini__row .vortx-trade-action{min-width:0}' +
      '.vortx-stack-mini__row--pin{width:100%;border:0;background:transparent;color:inherit;padding:0;cursor:pointer;text-align:inherit}' +
      '.vortx-stack-mini__row--pin:hover span:first-child{color:#7dd3fc}' +
      '.vortx-trade-meter{height:.4rem;width:100%;overflow:hidden;border-radius:999px;background:#e2e8f0}' +
      '.vortx-trade-meter__fill{height:100%;border-radius:999px;transition:width .25s ease}' +
      '.vortx-trade-filters{padding:.35rem 0}' +
      '.vortx-trade-filters--category{padding-bottom:.65rem;margin-bottom:.15rem;' +
      'border-bottom:1px solid rgba(148,163,184,.35)}' +
      '.vortx-trade-filters__axis{margin:0 0 .4rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;' +
      'text-transform:uppercase;color:#64748b}' +
      '.glass-panel .vortx-trade-filters__axis{color:#94a3b8}' +
      '.vortx-trade-filters__chips{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}' +
      '.vortx-trade-filter{border:1px solid rgba(148,163,184,.55);border-radius:999px;background:rgba(15,23,42,.92);color:#f8fafc;' +
      'padding:.35rem .75rem;font-size:.72rem;font-weight:600;cursor:pointer}' +
      '.vortx-trade-filter:hover{border-color:#7dd3fc;color:#e0f2fe;background:rgba(14,165,233,.2)}' +
      '.vortx-trade-filter--active{border-color:#38bdf8;background:#0369a1;color:#f0f9ff}' +
      '.vortx-trade-controls{display:grid;gap:.7rem;padding-top:.35rem}' +
      '.vortx-trade-controls__row{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}' +
      '.vortx-trade-controls__signal{padding-top:.55rem;margin-top:.1rem;' +
      'border-top:1px solid rgba(148,163,184,.28)}' +
      '.vortx-trade-controls__search{display:block;width:100%;max-width:22rem}' +
      '.vortx-trade-controls--compact{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem .7rem;padding:.55rem .9rem .65rem;border-top:1px solid rgba(148,163,184,.14)}' +
      '.vortx-trade-controls--compact .vortx-trade-controls__row,.vortx-trade-controls--compact .vortx-trade-controls__signal{padding:0;margin:0;border:0}' +
      '.vortx-trade-controls--compact .vortx-trade-controls__search{width:auto;min-width:9.5rem;max-width:12.5rem;margin-left:auto}' +
      '.vortx-trade-controls--compact .vortx-trade-filter{padding:.28rem .6rem;font-size:.68rem}' +
      '.vortx-trade-controls--compact input{padding:.4rem .65rem;font-size:.78rem}' +
      '.vortx-trade-controls__search input{width:100%;box-sizing:border-box;border:1px solid rgba(148,163,184,.35);border-radius:.65rem;' +
      'background:rgba(2,6,23,.72);color:#f8fafc;padding:.55rem .75rem;font-size:.8rem}' +
      '.vortx-trade-controls__search input:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.2)}' +
      '.vortx-trade-controls__search input::placeholder{color:#94a3b8}' +
      '.glass-panel .vortx-trade-filter{background:rgba(15,23,42,.92);border-color:rgba(148,163,184,.55);color:#f8fafc}' +
      '.glass-panel .vortx-trade-filter:hover{border-color:#7dd3fc;color:#e0f2fe;background:rgba(14,165,233,.2)}' +
      '.glass-panel .vortx-trade-filter--active{background:#0369a1;border-color:#38bdf8;color:#f0f9ff}' +
      '.glass-panel .vortx-trade-controls__search input{background:rgba(2,6,23,.72);border-color:rgba(148,163,184,.4);color:#fff}' +
      '.vortx-early-badge{position:relative;display:inline-flex;align-items:center;gap:.4rem;max-width:100%;margin-top:.45rem;' +
      'padding:.35rem .65rem;border-radius:.5rem;border:1px solid #16a34a;background:#14532d;color:#f0fdf4;font-size:.72rem;' +
      'font-weight:800;letter-spacing:.01em;line-height:1.25;box-shadow:0 1px 0 rgba(255,255,255,.12) inset;cursor:help}' +
      '.vortx-early-badge__hint{display:inline-flex;align-items:center;justify-content:center;width:1rem;height:1rem;' +
      'border-radius:999px;border:1px solid rgba(240,253,244,.55);font-size:.62rem;font-weight:700;opacity:.9}' +
      '.vortx-tip{position:relative;cursor:help;border-bottom:1px dotted currentColor}' +
      'button.vortx-nebula-tip{background:none;border:0;padding:0;margin:0;color:inherit;font:inherit;line-height:inherit;' +
      'border-bottom:1px dotted currentColor;cursor:pointer}' +
      'button.vortx-nebula-tip:hover,button.vortx-nebula-tip:focus{color:#7dd3fc}' +
      '.vortx-tip:focus{outline:2px solid #38bdf8;outline-offset:2px}' +
      '.vortx-tip::after,.vortx-early-badge::after{content:attr(data-tip);position:absolute;left:0;bottom:calc(100% + .45rem);' +
      'z-index:40;min-width:12rem;max-width:18rem;padding:.55rem .7rem;border-radius:.55rem;border:1px solid #cbd5e1;' +
      'background:#0f172a;color:#f8fafc;font-size:.7rem;font-weight:600;letter-spacing:0;line-height:1.35;text-transform:none;' +
      'box-shadow:0 8px 24px rgba(15,23,42,.25);opacity:0;pointer-events:none;transform:translateY(.15rem);transition:opacity .12s ease}' +
      '.vortx-tip:hover::after,.vortx-tip:focus::after,.vortx-early-badge:hover::after,.vortx-early-badge:focus::after{opacity:1;transform:translateY(0)}' +
      '.glass-panel .vortx-early-badge{border-color:#4ade80;background:#14532d;color:#f0fdf4;text-shadow:none!important}' +
      '.vortx-desk-card .vortx-early-badge{border-color:#16a34a;background:#14532d;color:#f0fdf4}' +
      '.vortx-load-more{display:inline-flex;align-items:center;justify-content:center;width:100%;margin-top:.35rem;padding:.7rem 1rem;' +
      'border:1px solid rgba(148,163,184,.35);border-radius:.75rem;background:rgba(2,6,23,.55);color:#f8fafc;font-size:.82rem;font-weight:700;cursor:pointer}' +
      '.vortx-load-more:hover{border-color:#38bdf8;color:#7dd3fc}' +
      '.vortx-desk-watch-btn--sm{padding:.35rem .65rem;font-size:.7rem}' +
      '.vortx-stat-pulse{animation:vortx-stat-pulse .45s ease}' +
      '@keyframes vortx-stat-pulse{0%{transform:scale(1)}40%{transform:scale(1.08);color:#0284c7}100%{transform:scale(1)}}' +
      '.vortx-desk-page{position:relative}' +
      '.vortx-desk-page::before{content:"";position:absolute;inset:-1.25rem -1rem auto;height:14rem;pointer-events:none;z-index:0;' +
      'background:radial-gradient(ellipse 60% 70% at 8% 0%,rgba(56,189,248,.1),transparent 64%)}' +
      '.vortx-desk-page>*{position:relative;z-index:1}' +
      'body.vortx-desk-boot-lock{overflow:hidden}' +
      '.vortx-desk-boot{position:fixed;inset:0;z-index:90;background:#000;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity 480ms ease}' +
      '.vortx-desk-boot--out{opacity:0;pointer-events:none}' +
      '.vortx-desk-boot__matrix,.vortx-desk-boot__warp{position:absolute;inset:0;width:100%;height:100%}' +
      '.vortx-desk-boot__warp{opacity:0;transition:opacity 200ms ease}' +
      '.vortx-desk-boot__warp--on{opacity:1}' +
      '.vortx-desk-boot__matrix--off{opacity:0;transition:opacity 500ms ease}' +
      '.vortx-desk-boot__text{position:relative;z-index:2;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.82rem;line-height:1.9;color:#00ff6a;text-shadow:0 0 6px rgba(0,255,106,.45);white-space:pre;text-align:left}' +
      '.vortx-desk-boot__text--off{opacity:0;transition:opacity 300ms ease}' +
      '.vortx-desk-boot__cursor{display:inline-block;width:8px;height:14px;margin-left:2px;background:#00ff6a;vertical-align:-2px;animation:vortx-boot-blink 1s steps(1) infinite}' +
      '@keyframes vortx-boot-blink{50%{opacity:0}}' +
      '.vortx-desk-boot__skip{position:absolute;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:3;border:1px solid rgba(148,163,184,.4);background:transparent;color:#94a3b8;padding:.45rem .8rem;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}' +
      '.vortx-desk-boot__skip:hover,.vortx-desk-boot__skip:focus{color:#e2e8f0;border-color:#7dd3fc}' +
      '.vortx-desk-ticker{margin-top:.75rem;border:1px solid rgba(148,163,184,.2);background:#020617;overflow:hidden}' +
      '.vortx-desk-ticker__head{margin:0;padding:.45rem .75rem;border-bottom:1px solid rgba(148,163,184,.16);font-size:.68rem;letter-spacing:.04em;color:#94a3b8;' +
      'display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.35rem .8rem}' +
      '.vortx-desk-ticker__hint{font-size:.68rem;letter-spacing:0;font-weight:500;color:#94a3b8}' +
      '.vortx-desk-ticker__track{display:flex;gap:1.5rem;padding:.55rem .75rem;white-space:nowrap;animation:vortx-desk-ticker 22s linear infinite;font-size:.75rem}' +
      '.vortx-desk-ticker__item{color:#cbd5e1;font-variant-numeric:tabular-nums}' +
      '.vortx-desk-ticker__item--buy{color:#86efac}' +
      '.vortx-desk-ticker__item--sell{color:#fda4af}' +
      '.vortx-desk-ticker--home{margin:0;border:0;border-radius:0;background:#020617}' +
      '.vortx-desk-ticker--home .vortx-desk-ticker__head{display:none}' +
      '.vortx-desk-ticker--home .vortx-desk-ticker__track{animation-duration:18s;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
      'font-size:.75rem;gap:1.45rem;padding:.42rem .9rem}' +
      '.vortx-live-board{border:1px solid rgba(148,163,184,.22);border-radius:.75rem;overflow:hidden;background:#0b1220}' +
      '.vortx-live-board__mast{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.35rem .8rem;padding:.85rem .95rem .2rem}' +
      '.vortx-live-board__title{margin:0;font-size:1.2rem;font-weight:700;letter-spacing:-.03em;color:#f8fafc}' +
      '.vortx-live-board__legend{margin:0;padding:.15rem .95rem .7rem;font-size:.78rem;line-height:1.4;color:#94a3b8}' +
      '.vortx-use-steps{display:grid;gap:.65rem;margin:0 0 1rem;padding:.85rem 1rem;border:1px solid rgba(148,163,184,.22);' +
      'border-radius:.75rem;background:#0b1220}' +
      '.vortx-use-steps__lead{margin:0;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-use-steps__grid{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}' +
      '.vortx-use-steps__item{display:grid;grid-template-columns:auto 1fr;gap:.15rem .5rem;align-items:start}' +
      '.vortx-use-steps__num{color:#38bdf8;font-weight:750;font-size:.85rem;font-variant-numeric:tabular-nums}' +
      '.vortx-use-steps__item strong{color:#f8fafc;font-size:.86rem;font-weight:700}' +
      '.vortx-use-steps__item span:last-child{grid-column:2;color:#94a3b8;font-size:.76rem;line-height:1.4}' +
      '@media (max-width:800px){.vortx-use-steps__grid{grid-template-columns:1fr}}' +
      '.vortx-check{margin-top:1.15rem;padding:1.15rem 1.1rem 1.2rem;border:1px solid rgba(148,163,184,.22);' +
      'border-radius:.9rem;background:#0b1220;text-align:left;scroll-margin-top:5.5rem}' +
      '.vortx-check__title{margin:0;font-size:1.35rem;font-weight:700;letter-spacing:-.03em;color:#f8fafc}' +
      '.vortx-check__lead{margin:.4rem 0 0;max-width:38rem;font-size:.88rem;line-height:1.5;color:#94a3b8}' +
      '.vortx-check__form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem .55rem;align-items:end;margin-top:1rem}' +
      '.vortx-check__label{grid-column:1/-1;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-check__input{width:100%;min-height:2.85rem;padding:.7rem .9rem;border:1px solid rgba(148,163,184,.35);' +
      'border-radius:.7rem;background:#020617;color:#f8fafc;font-size:1.05rem;font-weight:650;letter-spacing:.02em}' +
      '.vortx-check__input:focus{outline:2px solid #38bdf8;outline-offset:2px;border-color:#38bdf8}' +
      '.vortx-check__form .vortx-cta-solid{min-height:2.85rem;padding:.7rem 1.2rem}' +
      '.vortx-check__hot{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.75rem}' +
      '.vortx-check__chip{border:1px solid rgba(148,163,184,.28);background:#020617;color:#e2e8f0;border-radius:999px;' +
      'padding:.32rem .7rem;font-size:.75rem;font-weight:700;letter-spacing:.04em;cursor:pointer}' +
      '.vortx-check__chip:hover,.vortx-check__chip:focus{border-color:#38bdf8;color:#fff}' +
      '.vortx-check__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin-top:1rem}' +
      '.vortx-check__empty,.vortx-check__legal{margin:.9rem 0 0;font-size:.82rem;line-height:1.45;color:#94a3b8}' +
      '.vortx-check__more{display:inline-flex;margin-top:.85rem;color:#7dd3fc;font-size:.82rem;font-weight:700}' +
      '.vortx-use-card{display:grid;gap:.4rem;padding:.85rem .9rem;border:1px solid rgba(148,163,184,.2);' +
      'border-radius:.75rem;background:#020617}' +
      '.vortx-use-card--locked{opacity:.92}' +
      '.vortx-use-card__top{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .55rem}' +
      '.vortx-use-card__ticker{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
      'font-size:1.15rem;font-weight:750;letter-spacing:.02em;color:#f8fafc}' +
      '.vortx-use-card__amt{font-size:.78rem;font-weight:700;color:#cbd5e1;font-variant-numeric:tabular-nums}' +
      '.vortx-use-card__issuer{margin:0;font-size:.78rem;color:#94a3b8}' +
      '.vortx-use-card__who{margin:0;font-size:.88rem;font-weight:650;color:#e2e8f0}' +
      '.vortx-use-card__who--locked{color:#94a3b8;font-weight:600}' +
      '.vortx-use-card__actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.2rem}' +
      '.vortx-use-card__cta{border:1px solid rgba(148,163,184,.35);background:transparent;color:#f8fafc;' +
      'border-radius:.55rem;padding:.4rem .7rem;font-size:.75rem;font-weight:700;cursor:pointer}' +
      '.vortx-use-card__cta:hover,.vortx-use-card__cta:focus{border-color:#38bdf8;color:#fff}' +
      '.vortx-use-card .vortx-desk-watch-btn{min-height:2rem;padding:.35rem .65rem;font-size:.72rem}' +
      '.vortx-stage__stats--after{margin-top:1.6rem;text-align:center}' +
      '@media (max-width:720px){.vortx-check{padding:.95rem .8rem 1rem}' +
      '.vortx-check__form{grid-template-columns:1fr}' +
      '.vortx-check__form .vortx-cta-solid{width:100%}' +
      '.vortx-check__grid{grid-template-columns:1fr}}' +
      '.vortx-live-board .vortx-trade-filters,.vortx-live-board .vortx-trade-controls{padding-left:.85rem;padding-right:.85rem}' +
      '.vortx-live-board .vortx-trade-filters{padding-top:.7rem}' +
      '.vortx-live-board .vortx-trade-controls{padding-bottom:0}' +
      '.vortx-live-board .vortx-trade-controls--compact{padding-left:.9rem;padding-right:.9rem}' +
      '.vortx-live-board .vortx-desk-ticker,.vortx-live-board .vortx-desk-ticker--home{margin:0;border:0;border-top:1px solid rgba(148,163,184,.16);border-bottom:0;border-radius:0;background:#020617}' +
      '.vortx-live-board .vortx-tape-wrap{margin-top:0;border:0;border-radius:0;border-top:1px solid rgba(148,163,184,.16);background:#0b1220}' +
      '.vortx-live-board .vortx-tape th{background:#0b1220}' +
      '.vortx-live-board > .mt-4{margin-top:0}' +
      '@keyframes vortx-desk-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      '.vortx-desk-card--land{animation:vortx-desk-row-land .7s ease both;animation-delay:calc(var(--land-i,0) * 90ms)}' +
      '.vortx-desk-card--land-sell{animation-name:vortx-desk-row-land-sell}' +
      '@keyframes vortx-desk-row-land{from{background:rgba(46,207,143,.1)}to{background:transparent}}' +
      '@keyframes vortx-desk-row-land-sell{from{background:rgba(239,91,91,.1)}to{background:transparent}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-desk-boot,.vortx-desk-boot__cursor{display:none!important;animation:none}' +
      '.vortx-desk-ticker__track,.vortx-desk-card--land,.vortx-desk-card--land-sell{animation:none!important}}' +
      '.vortx-desk-page .vortx-page-hero{margin-bottom:0}' +
      '.vortx-desk-page .vortx-page-hero h2{font-size:clamp(1.7rem,4vw,2.15rem)!important;letter-spacing:-.04em;line-height:1.1}' +
      '.vortx-desk-hero__sub{margin:.4rem 0 0;max-width:36rem;font-size:.78rem;line-height:1.45;color:#94a3b8}' +
      '.vortx-desk-billing{border:0;background:transparent;padding:0;color:#94a3b8;font-size:.75rem;font-weight:600;' +
      'text-decoration:underline;text-underline-offset:3px;cursor:pointer}' +
      '.vortx-desk-billing:hover{color:#e2e8f0}' +
      '.vortx-desk-brief{margin-top:1.15rem;display:grid;gap:1rem}' +
      '.vortx-desk-verdict{padding:1.15rem 1.2rem 1.2rem;border:1px solid rgba(148,163,184,.2);border-radius:1rem;background:#020617}' +
      '.vortx-desk-verdict--early{border-color:rgba(74,222,128,.42);background:linear-gradient(180deg,rgba(20,83,45,.38),#020617 72%)}' +
      '.vortx-desk-verdict--early .vortx-desk-verdict__kicker{color:#86efac}' +
      '.vortx-desk-verdict--early .vortx-desk-verdict__value{color:#bbf7d0}' +
      '.vortx-desk-verdict__picks{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.85rem}' +
      '.vortx-desk-copy-guide{flex:1 1 100%;margin:.2rem 0 0!important;max-width:40rem;line-height:1.45}' +
      '#desk-beat-the-news{scroll-margin-top:5.5rem}' +
      '.vortx-desk-card--early{margin:.55rem 0;padding:.95rem .8rem .85rem;border:1px solid rgba(74,222,128,.4);border-radius:.8rem;' +
      'background:rgba(20,83,45,.22)}' +
      '.vortx-desk-card--early .vortx-desk-card__name{font-size:1.08rem}' +
      '.vortx-desk-card--early .vortx-early-badge{margin-top:.55rem;padding:.32rem .65rem;font-size:.8rem;font-weight:700}' +
      '.vortx-most-watched__bridge{margin:.45rem 0 0;font-size:.74rem;line-height:1.4;color:#94a3b8}' +
      '.vortx-most-watched__row .vortx-desk-watch-btn{flex:0 0 auto;min-height:1.85rem;padding:.22rem .5rem;font-size:.68rem}' +
      '.vortx-desk-verdict__kicker{margin:0;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-desk-verdict__value{margin:.4rem 0 0;font-size:clamp(3rem,8vw,4.4rem);font-weight:700;letter-spacing:-.05em;' +
      'line-height:.9;color:#f8fafc;font-variant-numeric:tabular-nums}' +
      '.vortx-desk-verdict__label{margin:.5rem 0 0;font-size:1.02rem;font-weight:650;color:#e2e8f0}' +
      '.vortx-desk-verdict__hint{margin:.35rem 0 0;max-width:28rem;font-size:.8rem;line-height:1.45;color:#94a3b8}' +
      '.vortx-desk-verdict__action{margin-top:.85rem;border:1px solid rgba(56,189,248,.4);background:rgba(14,165,233,.14);color:#e0f2fe;' +
      'padding:.45rem .8rem;font-size:.75rem;font-weight:700;border-radius:.55rem;cursor:pointer}' +
      '.vortx-desk-verdict__action:hover{border-color:#38bdf8;color:#f8fafc}' +
      '.vortx-desk-support{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(148,163,184,.18);border-radius:1rem;overflow:hidden;background:#020617}' +
      '.vortx-desk-support__item{padding:.85rem 1rem;border-right:1px solid rgba(148,163,184,.14);border-bottom:1px solid rgba(148,163,184,.14)}' +
      '.vortx-desk-support__item:nth-child(2n){border-right:0}' +
      '.vortx-desk-support__item:nth-child(3),.vortx-desk-support__item:nth-child(4){border-bottom:0}' +
      '.vortx-desk-support__value{margin:0;font-size:1.35rem;font-weight:700;color:#f8fafc;letter-spacing:-.02em;font-variant-numeric:tabular-nums}' +
      '.vortx-desk-support__label{margin:.25rem 0 0;font-size:.68rem;line-height:1.35;color:#94a3b8}' +
      '.vortx-desk-brief__meta{grid-column:1/-1;margin:0;padding:.65rem 1rem;border-top:1px solid rgba(148,163,184,.14);font-size:.72rem;color:#94a3b8}' +
      '.vortx-desk-skel-card{min-height:7.5rem;display:flex;align-items:center;padding:1rem}' +
      '.vortx-desk-workspace{margin-top:1.15rem;display:grid;gap:1.1rem}' +
      '.vortx-desk-rail .glass-panel,.vortx-desk-rail .vortx-most-watched{margin-top:0!important;background:#020617!important;' +
      'border:1px solid rgba(148,163,184,.18)!important;border-radius:.85rem!important;padding:.85rem .9rem!important;box-shadow:none!important}' +
      '@media (min-width:900px){.vortx-desk-brief{grid-template-columns:minmax(0,1.35fr) minmax(16rem,.8fr);align-items:stretch}}' +
      '@media (min-width:1100px){.vortx-desk-workspace{grid-template-columns:minmax(0,1fr) 17.25rem;align-items:start}' +
      '.vortx-desk-rail{grid-column:2;grid-row:1/span 8}' +
      '.vortx-desk-workspace>:not(.vortx-desk-rail){grid-column:1}}' +
      '.vortx-most-watched{border:1px solid rgba(148,163,184,.28)}' +
      '.vortx-most-watched__list{list-style:none;margin:0;padding:0;display:grid;gap:.45rem}' +
      '.vortx-most-watched__row{display:flex;align-items:center;gap:.65rem;padding:.4rem .15rem;border-bottom:1px solid rgba(148,163,184,.18)}' +
      '.vortx-most-watched__row:last-child{border-bottom:0}' +
      '.vortx-most-watched__rank{display:inline-flex;align-items:center;justify-content:center;min-width:1.35rem;height:1.35rem;' +
      'border-radius:.4rem;background:rgba(14,165,233,.16);color:#7dd3fc;font-size:.68rem;font-weight:800}' +
      '.vortx-most-watched__name{flex:1;min-width:0;font-size:.82rem;font-weight:600;color:#f8fafc}' +
      '.glass-panel .vortx-most-watched__name{color:#f8fafc}' +
      '.vortx-most-watched__ticker{margin-left:.4rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
      'font-size:.72rem;font-weight:700;color:#0284c7}' +
      '.glass-panel .vortx-most-watched__ticker{color:#7dd3fc}' +
      '.vortx-most-watched__count{font-size:.68rem;font-weight:700;letter-spacing:.02em;color:#67e8f9;white-space:nowrap;' +
      'text-shadow:0 0 10px rgba(34,211,238,.35);font-variant-numeric:tabular-nums}' +
      '.glass-panel .vortx-most-watched__count{color:#67e8f9}' +
      '.vortx-more-block[open] .vortx-most-watched{margin-top:.75rem}' +
      '.vortx-desk-section{margin-top:.85rem}' +
      '.vortx-desk-section__label{margin:0 0 .45rem;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b}' +
      '.vortx-desk-terminal__watch-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}' +
      '.vortx-desk-watch-btn--flash{animation:vortx-watch-flash .7s ease;box-shadow:0 0 0 3px rgba(52,211,153,.35)}' +
      '@keyframes vortx-watch-flash{0%{transform:scale(1)}35%{transform:scale(1.06)}100%{transform:scale(1)}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-trade-meter__fill,.vortx-stat-pulse,.vortx-desk-watch-btn--flash{animation:none!important;transition:none}' +
      '.vortx-desk-terminal,.vortx-desk-terminal__header{-webkit-backdrop-filter:none;backdrop-filter:none}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-trade-meter__fill{transition:none}}' +
      '.text-ink{color:var(--color-ink)!important}' +
      '.text-muted{color:var(--color-muted)!important}' +
      '.text-soft{color:var(--color-soft)!important}' +
      '.eyebrow{color:#94a3b8!important;font-weight:600;display:block!important;position:relative!important;float:none!important;clear:both!important;line-height:1.4!important;margin:0 0 .35rem!important;min-height:1.1em;z-index:1;' +
      'text-transform:none!important;letter-spacing:.02em!important;font-size:.75rem!important}' +
      '.vortx-page-section{position:relative;z-index:2;isolation:isolate}' +
      '.vortx-page-section::before{content:none}' +
      '.vortx-legal-page{position:relative;z-index:2;isolation:isolate}' +
      '.vortx-legal-shell{background:#020617;border:1px solid rgba(148,163,184,.32);border-radius:1.15rem;padding:1.25rem 1.3rem 1.45rem;color:#e2e8f0}' +
      '.vortx-legal-kicker{margin:0;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-legal-title{margin:.45rem 0 0;font-size:clamp(1.45rem,3vw,2rem);font-weight:700;letter-spacing:-.03em;line-height:1.15;color:#f8fafc}' +
      '.vortx-legal-lead{margin:.7rem 0 0;max-width:46rem;font-size:.95rem;line-height:1.55;color:#e2e8f0}' +
      '.vortx-legal-meta{margin:.55rem 0 0;font-size:.75rem;line-height:1.45;color:#94a3b8}' +
      '.vortx-legal-mail{color:#7dd3fc}' +
      '.vortx-legal-banner{margin:1rem 0 0;padding:.85rem 1rem;border:1px solid rgba(125,211,252,.45);border-radius:.9rem;background:#0b1220;color:#f8fafc;font-size:.9rem;line-height:1.5;font-weight:650}' +
      '.vortx-legal-toc{margin:1rem 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:.45rem .7rem}' +
      '.vortx-legal-toc a{font-size:.72rem;color:#94a3b8;text-decoration:none}' +
      '.vortx-legal-toc a:hover,.vortx-legal-toc a:focus{color:#7dd3fc;text-decoration:underline}' +
      '.vortx-legal-grid{margin-top:1.15rem;display:grid;gap:.85rem}' +
      '@media (min-width:800px){.vortx-legal-grid{grid-template-columns:1fr 1fr}}' +
      '.vortx-legal-card{margin:0;padding:1rem 1.05rem;border:1px solid rgba(148,163,184,.28);border-radius:.9rem;background:#0b1220}' +
      '.vortx-legal-card:target{outline:2px solid #7dd3fc;outline-offset:2px}' +
      '.vortx-legal-card h2{margin:0;font-size:.78rem;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-legal-card p{margin:.55rem 0 0;font-size:.86rem;line-height:1.55;color:#e2e8f0}' +
      '.vortx-legal-foot{margin:1.15rem 0 0;max-width:52rem;font-size:.8rem;line-height:1.55;color:#cbd5e1}' +
      '@media print{.vortx-legal-shell,.vortx-legal-card{background:#fff;color:#0f172a}.vortx-legal-title,.vortx-legal-card h2,.vortx-legal-kicker{color:#0f172a}.vortx-legal-card p,.vortx-legal-lead,.vortx-legal-foot{color:#0f172a}.vortx-legal-toc{display:none}.vortx-legal-card{break-inside:avoid}}' +
      '.vortx-trader-playbook{display:grid;gap:.7rem;padding:.9rem 1rem;border:1px solid rgba(148,163,184,.28);border-radius:.5rem;' +
      'background:#0b1220}' +
      '.vortx-trader-playbook--compact{padding:.65rem .75rem}' +
      '.vortx-trader-playbook__lead{margin:0;max-width:46rem;color:#cbd5e1;font-size:.86rem;line-height:1.55}' +
      '.vortx-trader-playbook__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}' +
      '.vortx-trader-playbook__card{display:grid;gap:.28rem;padding:.7rem .75rem;border:1px solid rgba(148,163,184,.25);border-radius:.8rem;background:rgba(2,6,23,.55)}' +
      '.vortx-trader-playbook__card strong{color:#7dd3fc;font-size:.72rem;font-weight:650;letter-spacing:.02em;text-transform:none}' +
      '.vortx-trader-playbook__card span{color:#94a3b8;font-size:.74rem;line-height:1.45}' +
      '.vortx-map-callout{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(7.5rem,10rem) minmax(0,1fr);' +
      'gap:1.1rem;align-items:center;padding:1.15rem 1.25rem;border:1px solid rgba(14,165,233,.28);border-radius:1.25rem;' +
      'background:linear-gradient(180deg,#020617 0%,#07111f 55%,#0b1220 100%);box-shadow:0 22px 50px rgba(2,6,23,.28)}' +
      '.vortx-map-callout__orb{width:7.5rem;height:7.5rem;border-radius:999px;justify-self:center;' +
      'background:radial-gradient(circle at 32% 28%,#7dd3fc 0%,#0284c7 28%,#0f172a 62%,#020617 100%);' +
      'box-shadow:0 0 0 8px rgba(56,189,248,.08),0 0 42px rgba(56,189,248,.35)}' +
      '.vortx-map-callout__copy .eyebrow{color:#7dd3fc!important;text-shadow:none!important}' +
      '.vortx-map-callout__copy .display-font,.vortx-map-callout__copy h2{color:#f8fafc!important;text-shadow:none!important}' +
      '.vortx-map-callout__copy .text-muted{color:#94a3b8!important}' +
      '@media (max-width:800px){.vortx-trader-playbook__grid{grid-template-columns:1fr}' +
      '.vortx-map-callout{grid-template-columns:1fr;justify-items:center;text-align:center}' +
      '.vortx-map-callout__copy{display:flex;flex-direction:column;align-items:center}}' +
      '.vortx-page-hero{position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:.75rem;isolation:isolate}' +
      '.vortx-page-hero > .eyebrow,.vortx-page-hero > h1,.vortx-page-hero > h2,.vortx-page-hero > p{position:relative;z-index:1;display:block;float:none;margin:0;max-width:48rem}' +
      '.vortx-page-hero .display-font,.vortx-page-hero .text-muted,.vortx-page-hero .eyebrow{text-shadow:none}' +
      '.vortx-page-section .vortx-page-hero{gap:1rem}' +
      '.vortx-page-section .vortx-page-hero h2{letter-spacing:-.02em;word-spacing:.04em}' +
      '.vortx-page-section .vortx-page-hero p{word-spacing:.02em;line-height:1.65;color:#cbd5e1}' +
      '.vortx-page-section label#pricing-aup{word-spacing:.02em;line-height:1.6}' +
      '.text-terminal-blue{color:#7dd3fc!important;font-weight:600}' +
      'header.sticky{border-color:rgba(148,163,184,.22)!important;background:rgba(3,7,18,.92)!important;backdrop-filter:blur(16px)}' +
      'header nav button:hover,header nav a:hover{background:rgba(148,163,184,.12)!important;color:#f8fafc!important;border-color:transparent!important}' +
      'header button[class*="border-white/10"],header button[class*="bg-white/10"]{' +
      'border-color:rgba(148,163,184,.35)!important;background:rgba(15,23,42,.72)!important;color:#f8fafc!important}' +
      'footer.vortx-site-footer,footer.border-t[class*="border-white/10"]{border-color:rgba(148,163,184,.22)!important}' +
      '.border-line{border-color:rgba(148,163,184,.28)!important}' +
      '.bg-panel{background-color:#0b1220!important}' +
      '.rounded-2xl.border.border-line.bg-panel,.rounded-xl.border.border-metallic.bg-panel{' +
      'background:rgba(15,23,42,.82)!important;border-color:rgba(148,163,184,.32)!important}' +
      'button.min-h-28.rounded-xl.border.text-rose-100,span.rounded-lg.border.text-rose-100,' +
      '.border-rose-300.bg-rose-50.text-rose-900{' +
      'background:#3f1d24!important;border-color:#fda4af!important;color:#fecdd3!important}' +
      'button.min-h-28.rounded-xl.border.text-amber-100,span.rounded-lg.border.text-amber-100,' +
      '.border-amber-300.bg-amber-50.text-amber-900{' +
      'background:#422006!important;border-color:#fcd34d!important;color:#fde68a!important}' +
      'button.min-h-28.rounded-xl.border.text-slate-200,span.rounded-lg.border.text-slate-200,' +
      '.border-slate-300.bg-slate-100.text-slate-800{' +
      'background:#1e293b!important;border-color:#475569!important;color:#e2e8f0!important}' +
      'button.rounded-xl.border.border-metallic.bg-panel:hover{border-color:#7dd3fc!important}' +
      'button.border-terminal-blue\\/45.bg-terminal-blue\\/8:not(.vortx-queue-item){' +
      'border-color:#7dd3fc!important;background:#eff6ff!important;color:#0c4a6e!important}' +
      '.glass-panel .vortx-queue-item--selected{' +
      'border-color:rgba(56,189,248,.45)!important;' +
      'background:#0f172a!important}' +
      '.glass-panel .vortx-queue-item--selected .text-ink,.glass-panel .vortx-queue-item--selected .text-muted,' +
      '.glass-panel .vortx-queue-item--selected .text-soft{color:#f8fafc!important;text-shadow:none!important}' +
      '.glass-panel .vortx-queue-item{position:relative;z-index:1}' +
      '.glass-panel .vortx-queue-item--hover{z-index:70!important}' +
      '.glass-panel.overflow-visible,.glass-panel .overflow-visible{overflow:visible!important}' +
      '.rounded-full.border.border-metallic.bg-black\\/40,.data-font.rounded-full.border.border-metallic.bg-black\\/40{' +
      'background:#0f172a!important;border-color:rgba(148,163,184,.35)!important;color:#cbd5e1!important}' +
      'article.rounded-2xl.border.border-metallic[class*="bg-black/30"]{' +
      'background:#1e293b!important;border-color:#475569!important}' +
      'article.rounded-2xl.border.border-metallic[class*="bg-black/30"] .text-muted{color:#f8fafc!important}' +
      'article.rounded-2xl.border.border-metallic[class*="bg-black/30"] .text-soft{color:#e2e8f0!important}' +
      '.glass-panel{--color-ink:#f8fafc;--color-muted:#cbd5e1;--color-soft:#94a3b8;--color-accent:#7dd3fc;color:#f8fafc;' +
      'background:#0b1220!important;border-color:rgba(148,163,184,.28)!important;border-radius:.5rem!important;' +
      'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}' +
      '.glass-panel .text-ink,.glass-panel .display-font,.glass-panel h1,.glass-panel h2,.glass-panel h3,.glass-panel h4{' +
      'color:#f8fafc!important;text-shadow:none!important}' +
      /* Pricing cards inherit navy; keep titles readable inside glass-panel details. */ +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__eyebrow{color:#7dd3fc!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__title,' +
      '.glass-panel .vortx-pricing-card h3.vortx-pricing-card__title{color:#f8fafc!important;text-shadow:none!important;' +
      '-webkit-text-stroke:0!important;filter:none!important;opacity:1!important}' +
      '.vortx-pricing-card__title{-webkit-text-fill-color:currentColor!important;position:relative;z-index:1}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__title{color:#f8fafc!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__price{color:#7dd3fc!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__billing{color:#94a3b8!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__tag{color:#cbd5e1!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__copy,.glass-panel .vortx-pricing-card .vortx-pricing-card__feature{color:#cbd5e1!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card .vortx-pricing-card__feature--no{color:#64748b!important}' +
      '.glass-panel .vortx-pricing-card--limited .vortx-pricing-card__eyebrow{color:#94a3b8!important}' +
      '.glass-panel .vortx-pricing-card--limited .vortx-pricing-card__price{color:#cbd5e1!important}' +
      '.glass-panel .vortx-pricing-card--featured .vortx-pricing-card__eyebrow,.glass-panel .vortx-pricing-card--featured .vortx-pricing-card__title,.glass-panel .vortx-pricing-card--featured .vortx-pricing-card__price,.glass-panel .vortx-pricing-card--featured .vortx-pricing-card__billing{color:#fff!important;text-shadow:none!important}' +
      '.glass-panel .vortx-pricing-card--featured .vortx-pricing-card__tag{color:#fff!important;text-shadow:none!important}' +
      '.glass-panel .text-muted{color:#cbd5e1!important;text-shadow:none!important}' +
      '.glass-panel .text-soft{color:#94a3b8!important;text-shadow:none!important}' +
      '.glass-panel .text-accent,.glass-panel .data-font.text-accent{color:#7dd3fc!important;font-weight:600!important;text-shadow:none!important}' +
      '.glass-panel .eyebrow{color:#94a3b8!important;font-weight:600!important;text-shadow:none!important}' +
      '.glass-panel .eyebrow.text-soft{color:#94a3b8!important}' +
      '.glass-panel [class*="text-terminal-blue"]{color:#7dd3fc!important;font-weight:600!important;text-shadow:none!important}' +
      '.glass-panel [class*="text-terminal-green"]{color:#86efac!important;font-weight:600!important;text-shadow:none!important}' +
      '.glass-panel [class*="bg-black/30"],.glass-panel [class*="bg-black/35"],.glass-panel [class*="bg-black/40"],.glass-panel [class*="bg-black/45"],' +
      '.glass-panel .rounded-full.border.border-metallic.bg-black\\/40,.glass-panel .rounded-xl.border.border-metallic.bg-black\\/35,' +
      '.glass-panel .rounded-xl.border.border-metallic.bg-black\\/40,.glass-panel .rounded-xl.border.border-metallic.bg-black\\/45,' +
      '.glass-panel .rounded-2xl.border.border-metallic.bg-black\\/40,.glass-panel .rounded-2xl.border.border-white\\/10.bg-black\\/30,' +
      '.glass-panel .mt-5.flex.gap-3.rounded-2xl.border.border-metallic.bg-black\\/40{' +
      'background:rgba(2,6,23,.72)!important;border-color:rgba(148,163,184,.4)!important;color:#f8fafc!important}' +
      '.glass-panel [class*="border-white/10"]{border-color:rgba(148,163,184,.35)!important}' +
      '.glass-panel button[class*="border-white/10"],.glass-panel .text-xs.text-muted.underline{color:#e2e8f0!important}' +
      '.glass-panel textarea,.glass-panel select,.glass-panel input:not([type="checkbox"]){' +
      'background:rgba(2,6,23,.72)!important;border-color:rgba(148,163,184,.4)!important;color:#fff!important}' +
      '.glass-panel textarea::placeholder{color:#cbd5e1!important}' +
      '.glass-panel .terminal-button-solid{background:#0284c7!important;border:1px solid #0369a1!important;' +
      'color:#fff!important;box-shadow:none!important;text-shadow:none!important}' +
      '.glass-panel .terminal-button-solid:disabled{opacity:.55!important;color:#fff!important}' +
      '.glass-panel .data-font.rounded-lg.border.border-metallic.bg-black{color:#e2e8f0!important;background:rgba(0,0,0,.55)!important}' +
      '.vortx-command-palette__panel{background:#0b1220}' +
      '.vortx-command-palette .text-ink,.vortx-command-palette .display-font{color:#f8fafc!important;text-shadow:none!important}' +
      '.vortx-command-palette .text-muted{color:#f1f5f9!important}' +
      '.vortx-command-palette .text-soft{color:#cbd5e1!important}' +
      '.vortx-command-palette input{color:#fff!important;caret-color:#fff!important}' +
      '.vortx-command-palette input::placeholder{color:#94a3b8!important}' +
      '.vortx-command-palette .text-terminal-blue,.vortx-command-palette [class*="text-terminal-blue"]{color:#bae6fd!important;font-weight:600!important;text-shadow:none!important}' +
      '.vortx-command-palette button:hover .text-soft{color:#fff!important}' +
      'a.text-muted:hover,a.text-terminal-blue:hover,button.text-muted:hover{color:#f8fafc!important}' +
      'header nav button.rounded-lg:hover:not([class*="border-white"]){background:rgba(148,163,184,.12)!important;border:0!important;color:#f8fafc!important}' +
      'header nav a.rounded-lg:hover{background:rgba(148,163,184,.12)!important;border:0!important;color:#f8fafc!important}' +
      '.vortx-unlock-pair .vortx-unlock-card{min-height:9.5rem}' +
      '.vortx-unlock-card--locked .vortx-trade-locked-chip{margin-right:.15rem}' +
      '.glass-panel a.text-terminal-blue.underline:hover{color:#fff!important;background:rgba(56,189,248,.18);border-radius:.5rem}' +
      '.vortx-testimonial-grid{display:grid;grid-template-columns:1fr;gap:1.25rem}' +
      '@media(min-width:768px){.vortx-testimonial-grid{grid-template-columns:1fr 1fr}}' +
      '.vortx-quote-river{position:relative;z-index:3;width:100%;max-width:none;margin:2.4rem 0 1.2rem;' +
      'padding:1.35rem 0 1.55rem;overflow:hidden;isolation:isolate;background:#030712}' +
      '.vortx-terminal-home > .vortx-quote-river{width:var(--vortx-page);max-width:var(--vortx-page);margin-left:auto;margin-right:auto}' +
      '.vortx-quote-river::before{content:"";position:absolute;inset:-20% 10% auto;height:12rem;z-index:0;pointer-events:none;' +
      'background:radial-gradient(ellipse at center,rgba(37,99,235,.2) 0%,rgba(3,7,18,0) 72%)}' +
      '.vortx-quote-river::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;' +
      'background:linear-gradient(90deg,#030712 0,transparent 12%,transparent 88%,#030712 100%)}' +
      '.vortx-quote-river__kicker{position:relative;z-index:3;margin:0 0 1rem;text-align:center;font-size:.72rem;font-weight:700;' +
      'letter-spacing:.16em;text-transform:uppercase;color:#7dd3fc}' +
      '.vortx-quote-lanes{position:relative;z-index:1;display:grid;gap:.7rem;overflow:hidden;' +
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 88%,transparent 100%);' +
      'mask-image:linear-gradient(90deg,transparent 0,#000 12%,#000 88%,transparent 100%)}' +
      '.vortx-quote-lane{overflow:hidden}' +
      '.vortx-quote-lane--echo{display:none}' +
      '.vortx-quote-lane__track{display:flex;gap:.85rem;width:max-content;will-change:transform;' +
      'animation:vortx-quote-drift var(--quote-ms,34s) linear infinite;animation-delay:var(--quote-delay,0s)}' +
      '.vortx-quote-lane--rev .vortx-quote-lane__track{animation-direction:reverse}' +
      '@keyframes vortx-quote-drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}' +
      '.vortx-quote-chip{flex:0 0 auto;width:min(22rem,72vw);padding:.9rem 1rem;border:1px solid rgba(148,163,184,.22);' +
      'border-radius:1.15rem;background:#0b1220;text-align:left;' +
      'box-shadow:0 14px 32px rgba(0,0,0,.28);transition:border-color .18s ease,box-shadow .18s ease}' +
      '.vortx-quote-chip:hover{border-color:rgba(56,189,248,.55);box-shadow:0 0 28px rgba(37,99,235,.22)}' +
      '.vortx-quote-chip__text{margin:0;font-size:.84rem;line-height:1.45;color:#e2e8f0}' +
      '.vortx-quote-chip__who{margin:.55rem 0 0;font-size:.7rem;font-weight:650;color:#7dd3fc}' +
      '@media (prefers-reduced-motion:reduce){.vortx-quote-lanes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));' +
      'gap:.85rem;max-width:72rem;margin:0 auto;padding:0 1.25rem;-webkit-mask-image:none;mask-image:none}' +
      '.vortx-quote-lane--echo{display:none}.vortx-quote-lane{overflow:visible}' +
      '.vortx-quote-lane__track{animation:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;width:auto;max-width:none;' +
      'margin:0;flex-wrap:nowrap;will-change:auto}.vortx-quote-chip[data-copy="b"]{display:none}.vortx-quote-chip{width:100%;max-width:none;transform:none;animation:none}}' +
      '@media (prefers-reduced-motion:reduce) and (max-width:900px){.vortx-quote-lanes{grid-template-columns:1fr;padding:0 .25rem}}' +
      '.vortx-testimonial-card{display:flex!important;flex-direction:column!important}' +
      '.vortx-testimonial-card__top{width:100%!important}' +
      '.vortx-testimonial-body{width:100%!important}' +
      '.vortx-testimonial-quote{margin:0!important;width:100%!important;max-width:100%!important;border:none!important;padding:0!important;' +
      'text-align:left!important;word-wrap:break-word!important;overflow-wrap:break-word!important;hyphens:auto!important}' +
      '.vortx-testimonial-author{width:100%!important;text-align:left!important}' +
      '.vortx-testimonial-author-text{display:block!important;min-width:0!important;flex:1!important}' +
      '.vortx-testimonial-name,.vortx-testimonial-role{display:block!important;width:100%!important;white-space:normal!important;' +
      'overflow-wrap:break-word!important;word-break:normal!important;text-align:left!important}' +
      '.vortx-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr));gap:1rem;align-items:stretch}' +
      '@media(min-width:900px){.vortx-pricing-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
      '.vortx-pricing-card{position:relative;display:flex;flex-direction:column;border:1px solid rgba(148,163,184,.28);border-radius:1rem;background:#0b1220;' +
      'overflow:hidden;color:#f8fafc;cursor:default;' +
      'transition:border-color .18s ease,background .18s ease}' +
      '.vortx-pricing-card:hover{border-color:#38bdf8}' +
      '.vortx-pricing-card--featured:hover{border-color:#7dd3fc}' +
      '.vortx-pricing-card--featured{z-index:2;border-color:#38bdf8;background:#0f172a}' +
      '@media(max-width:1279px){.vortx-pricing-card--featured{transform:none}}' +
      '.vortx-pricing-card__ribbon{position:absolute;top:.85rem;right:-2.1rem;z-index:3;transform:rotate(35deg);' +
      'background:#dc2626;color:#fff;padding:.28rem 2.4rem;font-size:.625rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}' +
      '.vortx-pricing-card__header{padding:1.1rem 1rem .95rem;background:#0f172a;border-bottom:1px solid rgba(148,163,184,.22);text-align:center}' +
      '.vortx-pricing-card__header--featured{background:#0b1220!important;border-bottom-color:#334155!important;color:#fff!important}' +
      '.vortx-pricing-card__header--featured .vortx-pricing-card__eyebrow,.vortx-pricing-card__header--featured .vortx-pricing-card__title,' +
      '.vortx-pricing-card__header--featured .vortx-pricing-card__price,.vortx-pricing-card__header--featured .vortx-pricing-card__billing{color:#fff!important;text-shadow:none!important}' +
      '.vortx-pricing-card__eyebrow{margin:0;font-size:.68rem;font-weight:650;letter-spacing:.06em;text-transform:none;color:#7dd3fc}' +
      '.vortx-pricing-card__title{margin:.35rem 0 0;font-family:inherit;font-size:1.45rem;line-height:1.15;color:#f8fafc;font-weight:650}' +
      '.vortx-pricing-card__price{margin:.55rem 0 0;font-size:1.35rem;font-weight:700;color:#7dd3fc}' +
      '.vortx-pricing-card__billing{margin:.2rem 0 0;font-size:.72rem;color:#94a3b8}' +
      '.vortx-pricing-card__tag{margin:0;padding:.55rem .85rem;text-align:center;font-size:.72rem;font-weight:600;background:#111827;color:#cbd5e1;border-bottom:1px solid rgba(148,163,184,.22)}' +
      '.vortx-pricing-card__tag--featured{background:#0369a1!important;color:#fff!important;border-bottom-color:#0284c7!important}' +
      '.vortx-pricing-card__cta{display:block;width:calc(100% - 1.6rem);margin:.85rem .8rem 0;padding:.72rem 1rem;border-radius:.7rem;border:1px solid rgba(148,163,184,.4);' +
      'background:#0f172a;color:#e2e8f0;font-size:.82rem;font-weight:600;text-align:center;cursor:pointer;transition:background .18s,border-color .18s,color .18s}' +
      '.vortx-pricing-card__cta:hover{background:#1e293b;border-color:#38bdf8;color:#f8fafc}' +
      '.vortx-pricing-card__cta--primary{background:#0284c7!important;border-color:#0284c7!important;color:#fff!important}' +
      '.vortx-pricing-card__cta--primary:hover{background:#0369a1!important;border-color:#0369a1!important;color:#fff!important}' +
      '.vortx-pricing-card__cta:disabled{opacity:.55;cursor:not-allowed;pointer-events:none}' +
      '.vortx-pricing-card__cta--primary:disabled{background:#334155!important;border-color:#475569!important;color:#cbd5e1!important}' +
      '.vortx-pricing-card__cta:disabled:hover{background:#0f172a;border-color:#475569;color:#94a3b8}' +
      '.vortx-pricing-card__cta--primary:disabled:hover{background:#334155!important;border-color:#475569!important;color:#cbd5e1!important}' +
      '.vortx-pricing-card__features{list-style:none;margin:0;padding:.85rem .95rem 1.1rem;flex:1}' +
      '.vortx-pricing-card__feature{display:flex;align-items:flex-start;gap:.55rem;padding:.38rem 0;font-size:.74rem;line-height:1.35;color:#cbd5e1}' +
      '.vortx-pricing-card__feature--no{color:#64748b}' +
      '.vortx-pricing-check{display:inline-flex;align-items:center;justify-content:center;width:1rem;height:1rem;flex-shrink:0;font-size:.72rem;font-weight:700}' +
      '.vortx-pricing-check--yes{color:#34d399}' +
      '.vortx-pricing-check--no{color:#475569}' +
      '.vortx-pricing-card__footer{margin-top:auto;padding:0 .8rem 1rem}' +
      '.vortx-pricing-card--custom .vortx-pricing-card__body{padding:1rem 1.15rem 1.15rem}' +
      '.vortx-pricing-card__copy{margin:0;font-size:.82rem;line-height:1.55;color:#94a3b8}' +
      '.vortx-pricing-card--custom .vortx-pricing-card__cta{margin-top:.85rem;width:100%;max-width:none}details#pricing-api-plans summary{outline:none}details#pricing-api-plans[open] summary{margin-bottom:.25rem}.vortx-pricing-grid .vortx-pricing-card--featured{scroll-margin-top:6rem}' +
      '.vortx-pricing-card__alert-note{margin:0 .85rem;padding:.65rem .75rem;border-radius:.65rem;background:rgba(14,165,233,.12);border:1px solid rgba(56,189,248,.28);color:#cbd5e1;font-size:.72rem;line-height:1.45}' +
      '.vortx-pricing-card__alert-note--nebula{background:rgba(16,185,129,.12);border-color:rgba(52,211,153,.28);color:#bbf7d0}' +
      '.vortx-demo-showcase{border-color:rgba(52,211,153,.35)!important;border-radius:1.5rem!important}' +
      '.vortx-demo-showcase .rounded-xl{border-radius:1rem!important}' +
      '.vortx-usecase-card{border-radius:1.5rem!important}' +
      '.vortx-desk-teaser__row--blurred{filter:blur(4px);opacity:.72;user-select:none;pointer-events:none}' +
      '.vortx-desk-terminal{position:relative;overflow:hidden;background:linear-gradient(180deg,#020617 0%,#04111f 100%);' +
      'border:1px solid rgba(56,189,248,.28);border-radius:1.1rem;padding:.95rem 1rem 1.1rem;color:#f8fafc;font-family:inherit;margin-top:0;' +
      'box-shadow:0 0 0 1px rgba(8,47,73,.55) inset,0 18px 40px rgba(2,6,23,.35)}' +
      '.vortx-desk-terminal::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;' +
      'background-image:linear-gradient(rgba(56,189,248,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.045) 1px,transparent 1px);' +
      'background-size:22px 22px;mask-image:linear-gradient(180deg,#000 0%,transparent 78%)}' +
      '.vortx-desk-terminal::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;' +
      'box-shadow:inset 10px 10px 0 -9px rgba(125,211,252,.35),inset -10px -10px 0 -9px rgba(125,211,252,.2)}' +
      '.vortx-desk-terminal>*{position:relative;z-index:1}' +
      '.vortx-desk-terminal__header{position:sticky;top:0;z-index:5;background:linear-gradient(180deg,rgba(2,6,23,.96),rgba(2,6,23,.88));' +
      'padding-bottom:.7rem;margin:0;border-bottom:1px solid rgba(56,189,248,.18)}' +
      '.vortx-desk-terminal__sys{margin:0 0 .2rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
      'font-size:.62rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#67e8f9;' +
      'text-shadow:0 0 10px rgba(34,211,238,.35)}' +
      '.vortx-desk-terminal__title-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.65rem}' +
      '.vortx-desk-terminal__title{margin:0;font-size:1.08rem;font-weight:750;letter-spacing:.04em;text-transform:uppercase;color:#f8fafc}' +
      '.vortx-desk-terminal__plan{display:inline-flex;align-items:center;border:1px solid rgba(56,189,248,.45);background:rgba(14,165,233,.16);color:#7dd3fc;' +
      'padding:.25rem .6rem;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:.45rem;' +
      'box-shadow:0 0 16px rgba(14,165,233,.18)}' +
      '.vortx-desk-terminal__search-wrap{display:block;margin-top:.7rem}' +
      '.vortx-desk-terminal__search{width:100%;box-sizing:border-box;border:1px solid rgba(56,189,248,.28);background:rgba(2,6,23,.82);color:#f8fafc;' +
      'padding:.7rem .8rem;font-size:.9rem;outline:none;border-radius:.7rem}' +
      '.vortx-desk-terminal__search:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.2),0 0 24px rgba(14,165,233,.16)}' +
      '.vortx-desk-terminal__search::placeholder{color:#94a3b8}' +
      '.vortx-desk-terminal__metrics{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.85rem}' +
      '.vortx-desk-metric{display:inline-flex;align-items:center;gap:.4rem;border:1px solid rgba(56,189,248,.22);background:rgba(8,47,73,.45);color:#cbd5e1;' +
      'padding:.4rem .65rem;font-size:.72rem;font-weight:700;letter-spacing:.02em;text-transform:none;cursor:pointer;border-radius:.55rem;transition:border-color .18s,color .18s,box-shadow .18s}' +
      '.vortx-desk-metric:hover{border-color:#38bdf8;color:#f8fafc;box-shadow:0 0 16px rgba(14,165,233,.16)}' +
      '.vortx-desk-metric--active{border-color:#38bdf8;background:rgba(3,105,161,.85);color:#f0f9ff;box-shadow:0 0 18px rgba(14,165,233,.28)}' +
      '.vortx-desk-metric__count{min-width:1.25rem;text-align:right;color:#e2e8f0;font-variant-numeric:tabular-nums}' +
      '.vortx-desk-metric--active .vortx-desk-metric__count{color:#f0f9ff}' +
      '.vortx-desk-terminal__toolbar{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-top:.85rem}' +
      '.vortx-desk-terminal .vortx-trade-filter{background:#0f172a;border:1px solid #64748b;color:#f8fafc}' +
      '.vortx-desk-terminal .vortx-trade-filter:hover{background:#1e293b;border-color:#38bdf8;color:#e0f2fe}' +
      '.vortx-desk-terminal .vortx-trade-filter--active{background:#0369a1;border-color:#38bdf8;color:#f0f9ff}' +
      '.vortx-desk-terminal__watch-toggle{display:none}' +
      '.vortx-desk-terminal__watch-toggle input{accent-color:#38bdf8}' +
      '.vortx-desk-terminal__export{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;max-width:28rem}' +
      '.vortx-desk-terminal__btn{border:1px solid rgba(148,163,184,.4);background:#0f172a;color:#f8fafc;padding:.45rem .7rem;font-size:.72rem;' +
      'font-weight:700;letter-spacing:.02em;text-transform:none;cursor:pointer;border-radius:.55rem;transition:border-color .18s,color .18s}' +
      '.vortx-desk-terminal__btn:hover{border-color:#38bdf8;color:#7dd3fc}' +
      '.vortx-desk-terminal__btn--locked{color:#94a3b8;border-color:#475569}' +
      '.vortx-desk-terminal__hint{margin:.15rem 0 0;width:100%;font-size:.7rem;line-height:1.4;color:#94a3b8}' +
      '.vortx-desk-terminal__err{margin:.65rem 0 0;font-size:.75rem;color:#fda4af}' +
      '.vortx-desk-terminal__ok{margin:.65rem 0 0;font-size:.75rem;color:#6ee7b7}' +
      '.vortx-desk-terminal__guide{margin-top:.9rem;padding:.85rem;border:1px solid rgba(148,163,184,.28);background:#020617;border-radius:.8rem}' +
      '.vortx-desk-terminal__eyebrow{margin:0;font-size:.68rem;font-weight:650;letter-spacing:.04em;text-transform:none;color:#7dd3fc}' +
      '.vortx-desk-terminal__link{background:none;border:0;padding:0;color:#7dd3fc;font-size:.75rem;text-decoration:underline;' +
      'text-underline-offset:3px;cursor:pointer}' +
      '.vortx-desk-terminal__link--muted{color:#94a3b8}' +
      '.vortx-desk-terminal__link--on{color:#6ee7b7}' +
      'a.vortx-desk-terminal__link{color:#7dd3fc}' +
      '.vortx-desk-terminal__steps{margin:.55rem 0 0;padding-left:1.1rem;font-size:.8rem;line-height:1.55;color:#cbd5e1}' +
      '.vortx-desk-terminal__muted{margin:.45rem 0 0;font-size:.8rem;line-height:1.5;color:#94a3b8}' +
      '.vortx-desk-terminal__visit{margin:.75rem 0 0;padding:.65rem .75rem;border:1px solid rgba(148,163,184,.28);background:#020617;font-size:.8rem;color:#cbd5e1;border-radius:.7rem}' +
      '.vortx-desk-terminal__visit--quiet{border-color:rgba(52,211,153,.35);color:#6ee7b7;background:rgba(6,78,59,.35)}' +
      '.vortx-desk-terminal__docket{margin-top:1rem}' +
      '.vortx-desk-terminal__docket-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.5rem;margin-bottom:.65rem}' +
      '.vortx-desk-terminal__docket-head h4{margin:0;font-size:.95rem;letter-spacing:-.01em;text-transform:none;color:#f8fafc}' +
      '.vortx-desk-terminal__docket-head p{margin:0;font-size:.72rem;color:#94a3b8}' +
      '.vortx-desk-terminal__cards{display:grid;gap:0}' +
      '.vortx-desk-card{border:0;border-bottom:1px solid rgba(148,163,184,.14);background:transparent;padding:.62rem .15rem .55rem;border-radius:0}' +
      '.vortx-desk-card:hover{background:rgba(148,163,184,.045)}' +
      '.vortx-desk-card .vortx-desk-watch-btn{padding:.32rem .6rem;font-size:.7rem;min-height:2rem;background:transparent;' +
      'border-color:rgba(148,163,184,.35);color:#e2e8f0}' +
      '.vortx-desk-card .vortx-desk-watch-btn--on{background:rgba(16,185,129,.12);border-color:#34d399;color:#6ee7b7}' +
      '.vortx-desk-card--composite{border-color:#fbbf24}' +
      '.vortx-desk-card__head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.65rem}' +
      '.vortx-desk-card__name-row{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem}' +
      '.vortx-desk-card__name{margin:0;font-size:.95rem;font-weight:700;color:#f8fafc}' +
      '.vortx-desk-card__chip{border:1px solid rgba(148,163,184,.32);background:#0f172a;padding:.15rem .45rem;font-size:.65rem;font-weight:700;letter-spacing:.04em;color:#cbd5e1;border-radius:.4rem}' +
      '.vortx-desk-card__trade-row{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:.45rem}' +
      '.vortx-desk-card__side{border:1px solid rgba(148,163,184,.32);padding:.12rem .4rem;font-size:.65rem;font-weight:800;letter-spacing:.04em;color:#cbd5e1;border-radius:.35rem}' +
      '.vortx-desk-card__side--buy{border-color:rgba(134,239,172,.45);background:rgba(22,163,74,.18);color:#86efac}' +
      '.vortx-desk-card__side--sell{border-color:rgba(253,164,175,.45);background:rgba(225,29,72,.18);color:#fda4af}' +
      '.vortx-desk-card__ticker{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.78rem;font-weight:700;color:#7dd3fc}' +
      '.vortx-desk-card__amount{margin-left:auto;min-width:4.25rem;text-align:right;font-size:.95rem;font-weight:700;color:#f8fafc;font-variant-numeric:tabular-nums}' +
      '.vortx-desk-card__date{font-size:.72rem;color:#94a3b8}' +
      '.vortx-desk-card__issuer{margin:.35rem 0 0;font-size:.75rem;color:#94a3b8}' +
      '.vortx-desk-card__timeline{margin-top:.65rem;display:grid;gap:.4rem;border-top:1px solid rgba(148,163,184,.22);padding-top:.55rem}' +
      '.vortx-desk-card__event{border-left:2px solid #475569;padding-left:.55rem}' +
      '.vortx-desk-card__event-title{margin:0;font-size:.78rem;color:#f8fafc}' +
      '.vortx-desk-card__event-meta{margin:.15rem 0 0;font-size:.68rem;color:#94a3b8}' +
      '.vortx-desk-card__actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:.3rem;padding-top:.15rem;border-top:0}' +
      '.vortx-desk-watch-btn{border:1px solid #0284c7;background:#0284c7;color:#fff;padding:.45rem .8rem;font-size:.78rem;font-weight:700;' +
      'border-radius:.6rem;cursor:pointer;white-space:nowrap;transition:background .18s}' +
      '.vortx-desk-watch-btn:hover{background:#0369a1;border-color:#0369a1}' +
      '.vortx-desk-watch-btn--on{background:rgba(16,185,129,.16);border-color:#34d399;color:#6ee7b7}' +
      '.vortx-desk-watch-btn:disabled{opacity:.4;cursor:not-allowed}' +
      '.vortx-desk-watch-suggest{margin-top:.9rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;' +
      'padding:.9rem 1rem;border:1px solid rgba(56,189,248,.32);background:rgba(14,165,233,.1);border-radius:.85rem}' +
      '.vortx-desk-watch-suggest__eyebrow{margin:0;font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:none;color:#7dd3fc}' +
      '.vortx-desk-watch-suggest__copy{margin:.2rem 0 0;font-size:.9rem;line-height:1.4;color:#f8fafc}' +
      '.vortx-desk-empty{margin-top:.35rem;padding:1rem;border:1px dashed rgba(148,163,184,.4);background:#020617;border-radius:.85rem}' +
      '.vortx-desk-empty__title{margin:0;font-size:.95rem;font-weight:700;color:#f8fafc}' +
      '.vortx-desk-empty__copy{margin:.4rem 0 .75rem;font-size:.8rem;line-height:1.5;color:#94a3b8}' +
      '.vortx-desk-help{border-top:1px solid rgba(148,163,184,.22);padding-top:1rem}' +
      '.vortx-desk-help__summary{cursor:pointer;font-size:.9rem;font-weight:700;color:#cbd5e1;list-style:none}' +
      '.vortx-desk-help__summary::-webkit-details-marker{display:none}' +
      '@media (prefers-reduced-motion:reduce){.vortx-desk-terminal__search:focus{box-shadow:none}}' +
      '.vortx-usecase-card{display:flex!important;flex-direction:column!important;width:100%!important;max-width:48rem!important}' +
      '.vortx-usecase-card__top{width:100%!important;flex-wrap:wrap!important}' +
      '.vortx-usecase-card__body{width:100%!important;min-width:0!important}' +
      '.vortx-usecase-card__body h3,.vortx-usecase-card__body p{display:block!important;width:100%!important;max-width:100%!important;' +
      'white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important;text-align:left!important}' +
      '.vortx-usecase-card__badge{display:inline-block!important;width:auto!important;max-width:100%!important;border-radius:.65rem!important;' +
      'white-space:normal!important;line-height:1.35!important}' +
      '.vortx-live-pulse{align-self:start!important;height:auto!important;min-height:0!important}' +
      '@media (max-width:1023px){.vortx-live-pulse{position:static!important;top:auto!important;margin-top:1.5rem!important;width:100%!important}}' +
      '.vortx-consumer-tools{display:grid!important;grid-template-columns:1fr!important;gap:1rem!important;margin-top:1.5rem!important;width:100%!important;align-items:stretch!important}' +
      '@media(min-width:768px){.vortx-consumer-tools{grid-template-columns:repeat(3,minmax(0,1fr))!important}}' +
      '.vortx-consumer-tool-card{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;' +
      'gap:0!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;overflow:hidden!important;padding:1.25rem!important}' +
      '.vortx-consumer-tool-card__eyebrow{display:block!important;margin:0!important;width:100%!important}' +
      '.vortx-consumer-tool-card__title{display:block!important;margin:.55rem 0 0!important;width:100%!important;max-width:100%!important;' +
      'font-size:1.65rem!important;line-height:1.15!important;letter-spacing:-.02em!important;white-space:normal!important;' +
      'overflow-wrap:break-word!important;word-break:normal!important;position:static!important;float:none!important}' +
      '.vortx-consumer-tool-card__copy{display:block!important;margin:.75rem 0 0!important;width:100%!important;max-width:100%!important;flex:1 1 auto!important;' +
      'font-size:.9rem!important;line-height:1.55!important;white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important;' +
      'position:static!important;float:none!important}' +
      '.vortx-consumer-tool-card__meta{display:block!important;margin:.7rem 0 0!important;width:100%!important;font-size:.72rem!important;line-height:1.4!important;' +
      'white-space:normal!important;overflow-wrap:break-word!important}' +
      '.vortx-consumer-tool-card__cta{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:100%!important;' +
      'margin-top:1.1rem!important;padding:.75rem 1rem!important;border-radius:.75rem!important;text-align:center!important;text-decoration:none!important;' +
      'writing-mode:horizontal-tb!important;transform:none!important;white-space:nowrap!important;box-sizing:border-box!important}' +
      '.vortx-consumer-prompts{display:flex!important;flex-wrap:wrap!important;gap:.5rem!important;margin-top:1.15rem!important}' +
      '.vortx-consumer-prompt{display:inline-flex!important;align-items:center!important;border:1px solid rgba(148,163,184,.35)!important;border-radius:999px!important;' +
      'background:#0f172a!important;color:#cbd5e1!important;padding:.35rem .8rem!important;font-size:.72rem!important;line-height:1.3!important;text-decoration:none!important}' +
      '.vortx-consumer-prompt:hover{border-color:#38bdf8!important;color:#f8fafc!important;background:#1e293b!important}' +
      '.vortx-hero-search{position:relative!important;background:#0f172a!important;color:#f8fafc!important;' +
      'border:1px solid rgba(56,189,248,.55)!important;box-shadow:none!important;' +
      'padding:1rem 1.15rem!important;transform:none!important;transition:border-color .18s ease!important}' +
      '.vortx-hero-search:hover{transform:none!important;box-shadow:none!important;border-color:#38bdf8!important;opacity:1!important}' +
      '.vortx-hero-search .vortx-hero-search__title{font-size:1.2rem!important;line-height:1.3!important}' +
      '.vortx-hero-cta-primary{background:#0284c7!important;color:#fff!important;border:1px solid #0369a1!important;' +
      'box-shadow:0 6px 18px rgba(2,132,199,.35)!important;text-shadow:none!important}' +
      '.vortx-hero-cta-primary:hover{background:#0369a1!important;border-color:#075985!important;color:#fff!important}' +
      '.vortx-stage{position:relative;isolation:isolate;padding:3.25rem 0 1.25rem;text-align:center}' +
      '.vortx-stage::before{content:"";position:absolute;left:50%;top:-4rem;z-index:0;width:min(52rem,100%);height:28rem;' +
      'transform:translateX(-50%);background:radial-gradient(circle,rgba(37,99,235,.32) 0%,rgba(3,7,18,0) 70%);pointer-events:none}' +
      '.vortx-stage__copy,.vortx-stage__stack,.vortx-stage__stats{position:relative;z-index:1}' +
      '.vortx-stage__copy{max-width:52rem;margin:0 auto}' +
      '.vortx-stage__headline{margin:0;font-size:clamp(2.4rem,6vw,4.35rem);line-height:1.05;letter-spacing:-.045em;font-weight:700;color:#f8fafc}' +
      '.vortx-stage__sub{margin:.9rem auto 0;max-width:34rem;font-size:1.05rem;line-height:1.55;color:#94a3b8}' +
      '.vortx-stage__ctas{display:flex;flex-wrap:wrap;justify-content:center;gap:.7rem;margin-top:1.4rem}' +
      '.vortx-cta-solid,.vortx-cta-ghost{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;' +
      'padding:.72rem 1.25rem;font-size:.9rem;font-weight:650;cursor:pointer;transition:background .18s ease,border-color .18s ease}' +
      '.vortx-cta-solid{border:0;background:#2563eb;color:#fff}' +
      '.vortx-cta-solid:hover{background:#1d4ed8}' +
      '.vortx-cta-ghost{border:1px solid rgba(148,163,184,.4);background:transparent;color:#f8fafc}' +
      '.vortx-cta-ghost:hover{border-color:#38bdf8;color:#fff}' +
      '.vortx-stage__stack{position:relative;width:min(44rem,100%);height:24.5rem;margin:2.6rem auto 0;touch-action:pan-y;cursor:grab;user-select:none;outline:none}' +
      '.vortx-stage__stack:focus-visible{box-shadow:0 0 0 2px rgba(56,189,248,.45);border-radius:1.1rem}' +
      '.vortx-stage__stack--dragging{cursor:grabbing;touch-action:none}' +
      '.vortx-hero-character{position:absolute;left:50%;top:-1.1rem;z-index:4;width:7.5rem;height:7.5rem;margin-left:-3.75rem;' +
      'border-radius:999px;object-fit:cover;object-position:center 12%;display:block;pointer-events:none;overflow:hidden;' +
      'background:#0b1220;border:3px solid rgba(96,165,250,.7);box-shadow:0 0 40px rgba(37,99,235,.55);' +
      'transform:translateX(var(--stack-drag,0px));transition:transform .35s ease}' +
      '.vortx-stage__stack--dragging .vortx-hero-character{transition:none}' +
      '.vortx-stack-card{position:absolute;left:50%;top:3.6rem;width:min(72%,22rem);border:1px solid rgba(148,163,184,.28);border-radius:1rem;' +
      'background:#0b1220;padding:.9rem 1rem;text-align:left;box-shadow:0 18px 40px rgba(0,0,0,.35);cursor:pointer;' +
      'transition:transform .35s ease,opacity .35s ease,width .35s ease}' +
      '.vortx-stage__stack--dragging .vortx-stack-card{transition:none}' +
      '.vortx-stack-card[data-slot="front"]{width:min(78%,26rem);z-index:3;opacity:1;cursor:grab;' +
      'transform:translate3d(calc(-50% + var(--stack-drag,0px)),0,0) rotate(0deg) scale(1)}' +
      '.vortx-stage__stack--dragging .vortx-stack-card[data-slot="front"]{cursor:grabbing}' +
      '.vortx-stack-card[data-slot="left"]{z-index:1;opacity:.82;' +
      'transform:translate3d(calc(-50% - 10.4rem + var(--stack-drag,0px)),14px,0) rotate(-7deg) scale(.9)}' +
      '.vortx-stack-card[data-slot="right"]{z-index:1;opacity:.82;' +
      'transform:translate3d(calc(-50% + 10.4rem + var(--stack-drag,0px)),18px,0) rotate(7deg) scale(.9)}' +
      '.vortx-stack-card__kicker{margin:0;font-size:.68rem;font-weight:650;color:#7dd3fc}' +
      '.vortx-stack-card__title{margin:.25rem 0 0;font-size:1.05rem;font-weight:700;color:#f8fafc}' +
      '.vortx-stack-card__meta{margin:.35rem 0 0;font-size:.75rem;color:#94a3b8}' +
      '.vortx-stack-mini{margin:.55rem 0 0;display:grid;gap:.32rem}' +
      '.vortx-stack-mini__row{display:grid;grid-template-columns:minmax(6.5rem,1.4fr) auto minmax(0,1fr);align-items:center;gap:.35rem;' +
      'font-size:.7rem;color:#cbd5e1;border-bottom:1px solid rgba(148,163,184,.12);padding-bottom:.28rem}' +
      '.vortx-stack-mini__row span:first-child{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
      'font-weight:700;color:#7dd3fc;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.vortx-stack-mini__row span:last-child{text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.vortx-stack-controls{position:absolute;left:0;right:0;bottom:.15rem;z-index:5}' +
      '.vortx-stack-hint{margin:0;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#64748b}' +
      '.vortx-stack-dots{display:flex;justify-content:center;gap:.4rem;margin-top:.4rem}' +
      '.vortx-stack-dot{width:.48rem;height:.48rem;padding:0;border:0;border-radius:999px;background:#334155;cursor:pointer}' +
      '.vortx-stack-dot[aria-current="true"]{background:#38bdf8}' +
      '.vortx-stage__stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;max-width:44rem;margin:2.1rem auto 0}' +
      '.vortx-stage__stat-value{margin:0;font-size:1.85rem;font-weight:700;color:#f8fafc;letter-spacing:-.03em;font-variant-numeric:tabular-nums}' +
      '.vortx-stage__stat-label{margin:.2rem 0 0;font-size:.75rem;color:#94a3b8}' +
      '.vortx-live-block{margin-top:2.25rem;text-align:left;scroll-margin-top:5.5rem}' +
      '.vortx-live-block__title{margin:0 0 .45rem;font-size:1.35rem;font-weight:700;letter-spacing:-.03em;color:#f8fafc}' +
      '.vortx-tape-guide{margin:0 0 .95rem;max-width:40rem;font-size:.88rem;line-height:1.55;color:#94a3b8}' +
      '.vortx-page-hero .vortx-tape-guide{margin-top:.55rem;margin-bottom:0}' +
      '@media (max-width:720px){.vortx-stage{padding:1.35rem 0 .85rem}' +
      '.vortx-stage__headline{font-size:clamp(1.75rem,8.5vw,2.45rem)}' +
      '.vortx-stage__sub{font-size:.95rem;padding:0 .15rem}' +
      '.vortx-stage__ctas{flex-direction:column;align-items:stretch}' +
      '.vortx-cta-solid,.vortx-cta-ghost{min-height:2.75rem;width:100%}' +
      '.vortx-stage__stack{overflow:hidden;height:20.5rem;width:100%}' +
      '.vortx-hero-character{width:5.25rem;height:5.25rem;margin-left:-2.625rem;top:-.35rem}' +
      '.vortx-stack-card{padding:.75rem .8rem;top:3.2rem}' +
      '.vortx-stack-card[data-slot="left"]{transform:translate3d(calc(-50% - 2.15rem + var(--stack-drag,0px)),14px,0) rotate(-6deg) scale(.86)}' +
      '.vortx-stack-card[data-slot="right"]{transform:translate3d(calc(-50% + 2.15rem + var(--stack-drag,0px)),18px,0) rotate(6deg) scale(.86)}' +
      '.vortx-stack-card[data-slot="front"]{width:min(94%,22rem)}' +
      '.vortx-stage__stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem;margin-top:1.4rem}' +
      '.vortx-stage__stat-value{font-size:1.15rem}' +
      '.vortx-stage__stat-label{font-size:.65rem;line-height:1.25}}' +
      '@media (max-width:480px){' +
      '.vortx-hero-section{overflow-x:hidden;overflow-x:clip}' +
      '.vortx-stage{padding:.85rem 0 .5rem}' +
      '.vortx-stage__headline{font-size:clamp(1.5rem,7.6vw,2.05rem)}' +
      '.vortx-stage__sub{font-size:.88rem;margin-top:.65rem}' +
      '.vortx-stage__ctas{margin-top:1rem;gap:.55rem}' +
      '.vortx-stage__stack{overflow:hidden;height:16.75rem;margin-top:1.25rem}' +
      '.vortx-hero-character{width:4.5rem;height:4.5rem;margin-left:-2.25rem;top:-.15rem}' +
      '.vortx-stack-card[data-slot="left"],.vortx-stack-card[data-slot="right"]{display:none}' +
      '.vortx-stack-card[data-slot="front"]{width:min(100%,22rem);top:2.7rem}' +
      '.vortx-stack-hint{display:none}' +
      '.vortx-stage__stats{margin-top:1rem;gap:.4rem}' +
      '.vortx-quote-chip{width:min(18.5rem,86vw)}' +
      '.vortx-live-block{margin-top:1.15rem}' +
      '.vortx-live-block__title{font-size:1.15rem}' +
      '.vortx-most-watched{padding:.85rem!important}' +
      '.vortx-most-watched__row{gap:.45rem;padding:.35rem 0}' +
      '.vortx-tape__side-head{font-size:.58rem}' +
      '.vortx-aup-popover{width:min(calc(100% - 1.5rem),34rem)}}' +
      '@media (prefers-reduced-motion:reduce){.vortx-stack-card,.vortx-hero-character{transition:none}}' +
      '.vortx-hero-section{padding-top:0!important}' +
      '.vortx-section-air{margin-top:3rem!important}' +
      '.vortx-stats-section{padding-top:0!important;padding-bottom:1.5rem!important}' +
      '.vortx-usecase-section{padding-top:1.5rem!important;padding-bottom:.5rem!important}' +
      '.vortx-hiw-panel{background:linear-gradient(155deg,rgba(56,189,248,.09),rgba(2,6,23,.28))!important;' +
      'border:1px solid rgba(56,189,248,.16)!important;border-radius:1.5rem!important;' +
      'padding:2.25rem 1.75rem!important;margin-top:3rem!important;margin-bottom:3rem!important;' +
      'box-shadow:0 16px 48px rgba(0,0,0,.3)!important}' +
      '.vortx-panel-mist{background:linear-gradient(155deg,rgba(51,65,85,.85),rgba(15,23,42,.95))!important;' +
      'border:1px solid rgba(148,163,184,.3)!important;box-shadow:0 12px 40px rgba(0,0,0,.35)!important}' +
      '.vortx-scan-bar{background:linear-gradient(135deg,rgba(56,189,248,.28),rgba(15,23,42,.55))!important;' +
      'border:1px solid rgba(56,189,248,.62)!important;box-shadow:0 6px 20px rgba(2,132,199,.22)!important}' +
      '.vortx-scan-bar .block.text-sm,.vortx-scan-bar span.block.text-sm{font-weight:600!important;color:#f8fafc!important}' +
      '.vortx-scan-bar .data-font,.vortx-scan-bar span.data-font{color:#cbd5e1!important}' +
      '.vortx-divider-block{border-top:1px solid rgba(255,255,255,.09)!important;margin-top:1.15rem!important;padding-top:1.15rem!important}' +
      '.vortx-log-entry{font-size:.72rem!important;line-height:1.55!important;color:#94a3b8!important}' +
      '.vortx-accent-amber{color:#fbbf24!important}' +
      '.vortx-pulse-dot{display:inline-block;width:8px;height:8px;border-radius:9999px;flex-shrink:0;margin-top:1px}' +
      '.glass-panel .vortx-scan-match-btn,.vortx-scan-match-btn{background:#0284c7!important;color:#fff!important;' +
      'border:1px solid #0369a1!important;box-shadow:0 6px 18px rgba(2,132,199,.35)!important;text-shadow:none!important}' +
      '.vortx-aup-popover{position:fixed;left:50%;bottom:1.25rem;z-index:60;width:min(calc(100% - 2rem),34rem);' +
      'transform:translateX(-50%);pointer-events:none}' +
      '.vortx-aup-popover__panel{pointer-events:auto;border:1px solid #0284c7;border-radius:1rem;background:#fff;' +
      'padding:1rem 1.15rem;box-shadow:0 22px 55px rgba(15,23,42,.22);color:#0f172a}' +
      '.vortx-aup-popover__title{margin:0;font-size:.95rem;font-weight:700;color:#0f172a}' +
      '.vortx-aup-popover__hint{margin:.45rem 0 0;font-size:.78rem;line-height:1.45;color:#64748b}' +
      '.vortx-aup-popover__label{display:flex;gap:.65rem;margin-top:.75rem;font-size:.74rem;line-height:1.45;color:#334155}' +
      '.vortx-aup-popover__actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.85rem}' +
      '.vortx-aup-popover__confirm{border:none;border-radius:.65rem;background:#0284c7;color:#fff;' +
      'padding:.55rem .95rem;font-size:.78rem;font-weight:600;cursor:pointer}' +
      '.vortx-aup-popover__confirm:disabled{opacity:.55;cursor:not-allowed}' +
      '.vortx-aup-popover__dismiss{border:1px solid #cbd5e1;border-radius:.65rem;background:#fff;color:#334155;' +
      'padding:.55rem .95rem;font-size:.78rem;cursor:pointer}' +
      '@media (max-width:900px){' +
      'html,body,.vortx-app-shell,.vortx-hero-section{overflow-x:hidden;overflow-x:clip}' +
      '.vortx-app-main .px-6,.vortx-site-footer.px-6,.vortx-app-shell .px-6,.vortx-map-page .px-6{' +
      'padding-left:max(1rem,env(safe-area-inset-left))!important;' +
      'padding-right:max(1rem,env(safe-area-inset-right))!important}' +
      '.vortx-page-hero .display-font,.vortx-page-hero h1,.vortx-page-hero h2,' +
      '.vortx-map-page .display-font.text-4xl,.display-font.text-4xl,.display-font.text-5xl,' +
      '.glass-panel .display-font.text-4xl{' +
      'font-size:clamp(1.7rem,8vw,2.35rem)!important;line-height:1.15!important;letter-spacing:-.03em!important}' +
      '.vortx-quote-river{width:100%;margin-left:0;margin-right:0;max-width:100%;margin-top:1.5rem}' +
      '.vortx-quote-chip{width:min(20rem,84vw);padding:.75rem .85rem}' +
      '.vortx-command-palette{padding:max(.75rem,env(safe-area-inset-top)) .75rem max(.75rem,env(safe-area-inset-bottom))!important}' +
      '.vortx-command-palette__panel{max-height:min(88dvh,40rem);overflow:auto}' +
      '.vortx-command-palette input,.vortx-trade-controls__search input,.vortx-desk-terminal__search,' +
      '.glass-panel input:not([type="checkbox"]),.glass-panel textarea,.glass-panel select,input.input{font-size:16px!important}' +
      '.vortx-pricing-grid{grid-template-columns:1fr}' +
      '.vortx-unlock-pair .vortx-unlock-card{min-height:0}' +
      '.vortx-hero-search{padding:.85rem 1rem!important;gap:.75rem!important;max-width:100%!important}' +
      '.vortx-hero-search .data-font.rounded-lg{display:none}' +
      '.vortx-hero-search .vortx-hero-search__title{font-size:1.05rem!important}' +
      '.vortx-tape{min-width:36rem}' +
      '.vortx-tape--home{min-width:0}' +
      '.vortx-trade-filter,.vortx-desk-metric{min-height:2.5rem}' +
      '.vortx-trade-filters__chips{flex-wrap:nowrap;overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:.25rem;scrollbar-width:none}' +
      '.vortx-trade-filters__chips::-webkit-scrollbar{display:none}' +
      '.vortx-hiw-panel{padding:1.5rem 1.1rem!important}' +
      '.vortx-section-air{margin-top:2rem!important}' +
      '.vortx-tip::after,.vortx-early-badge::after{left:auto;right:0;min-width:11rem;max-width:min(18rem,calc(100% - 2rem))}' +
      '.vortx-aup-popover{width:min(calc(100% - 1.5rem),34rem);bottom:max(1rem,env(safe-area-inset-bottom))}' +
      '.vortx-site-footer{padding-bottom:max(1.75rem,env(safe-area-inset-bottom))}' +
      '.vortx-cta-solid,.vortx-cta-ghost,.vortx-load-more,.vortx-desk-watch-btn{min-height:2.75rem}' +
      '.vortx-page-section.px-6.py-12,.mx-auto.max-w-xl.px-6.py-12{padding-top:1.5rem!important;padding-bottom:1.5rem!important}' +
      '.glass-panel.rounded-3xl.p-6{padding:1.1rem!important}' +
      '}' +
      '@media (max-width:640px){' +
      'html,body,.vortx-app-shell{overflow-x:hidden;overflow-x:clip}' +
      '.vortx-tape{font-size:.72rem}' +
      '.vortx-tape th,.vortx-tape td{padding:.42rem .5rem}' +
      '.vortx-filer-face--sm{width:1.65rem;height:1.65rem}' +
      '.vortx-filer{max-width:11rem}' +
      '.vortx-hiw-panel{padding:1.25rem 1rem!important;margin-top:1.75rem!important;margin-bottom:1.75rem!important}' +
      '.vortx-section-air{margin-top:1.75rem!important}' +
      '.vortx-consumer-tool-card__title{font-size:1.35rem!important}' +
      '.vortx-consumer-tool-card__cta{white-space:normal!important}' +
      '.vortx-site-footer{padding-top:1.75rem}' +
      '}'
    document.head.appendChild(style)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageTheme)
  } else {
    initPageTheme()
  }

  var SIGNUP_ERRORS = {
    invalid_email: 'Enter a valid work email.',
    weak_password: 'Password must be at least 10 characters with uppercase, lowercase, and a number.',
    password_mismatch: 'Passwords do not match.',
    terms_required: 'Accept the terms to continue.',
    account_exists: 'An account already exists for that email. Log in instead.',
    supabase_unconfigured: 'Sign-up is temporarily unavailable. Contact support.',
    invalid_body: 'Could not read the form. Try again.',
    auth_create_failed: 'Could not create your login. Try again or contact support.',
  }

  function showStatus(el, message, isError) {
    if (!el) return
    el.hidden = false
    el.className = 'vortx-signup-status' + (isError ? ' error' : ' ok')
    el.textContent = message
  }

  function scorePassword(value) {
    var score = 0
    if (value.length >= 10) score += 1
    if (value.length >= 14) score += 1
    if (/[A-Z]/.test(value)) score += 1
    if (/[a-z]/.test(value)) score += 1
    if (/[0-9]/.test(value)) score += 1
    if (/[^A-Za-z0-9]/.test(value)) score += 1
    return score
  }

  function passwordLabel(score) {
    if (!score) return 'Enter a password'
    if (score < 3) return 'Weak ; add length and mixed characters'
    if (score < 5) return 'Fair ; almost there'
    return 'Strong password'
  }

  function wireLeadCapture() {
    var section = document.getElementById('lead-capture')
    if (!section) return
    var form = section.querySelector('form')
    var status = document.getElementById('lead-status')
    if (!form) return

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var data = new FormData(form)
      var email = String(data.get('email') || '').trim()
      if (!email) {
        showStatus(status, 'Enter a work email.', true)
        return
      }
      var submit = form.querySelector('button[type="submit"]')
      if (submit) submit.disabled = true
      showStatus(status, 'Sending sample queue...', false)

      fetch('/api/request-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email: email,
          name: String(data.get('name') || 'Signal queue subscriber').trim(),
          use_case: String(data.get('use_case') || 'other').trim(),
          message: String(data.get('message') || 'Send me the free public-record signal queue sample.').trim(),
        }),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            return { res: res, body: body }
          })
        })
        .then(function (payload) {
          if (payload.res.ok && payload.body.ok) {
            showStatus(status, 'Sample queue requested. Check your inbox.', false)
            form.reset()
            return
          }
          throw new Error(payload.body.message || payload.body.error || 'Request failed.')
        })
        .catch(function (error) {
          showStatus(status, error && error.message ? error.message : 'Request failed. Try again.', true)
        })
        .finally(function () {
          if (submit) submit.disabled = false
        })
    })

    section.querySelectorAll('a[href="/api/public-signals.csv"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault()
        window.location.assign('/api/public-signals.csv')
      })
    })
  }

  function renderSignupPage() {
    var lead = document.getElementById('lead-capture')
    if (lead) lead.style.display = 'none'
    var root = document.getElementById('root')
    if (!root) return
    root.innerHTML =
      '<main class="vortx-signup-wrap"><section class="vortx-signup-glass">' +
      '<p class="vortx-signup-eyebrow">Customer account</p>' +
      '<h1>Create your Vortx login.</h1>' +
      '<p class="vortx-signup-muted">Use a work email. You can subscribe from Pricing after your account is created.</p>' +
      '<ul class="vortx-signup-list"><li>10+ character password</li><li>Uppercase, lowercase, and number</li><li>Same email works for Stripe checkout reconciliation</li></ul>' +
      '<p id="signup-status" class="vortx-signup-status" hidden role="status"></p>' +
      '<div class="vortx-signup-oauth">' +
      '<a class="vortx-signup-oauth-btn" href="/api/auth/oauth?provider=google&amp;redirect_to=' +
      encodeURIComponent(CANONICAL_SITE + '/?view=customer') +
      '" onclick="try{sessionStorage.setItem(\'vortx_auth_return_view\',\'customer\')}catch(e){}">Continue with Google</a>' +
      '</div>' +
      '<p class="vortx-signup-divider">or create with email</p>' +
      '<form id="signup-form" novalidate>' +
      '<label class="vortx-signup-field"><span>Work email</span><input type="email" name="email" autocomplete="email" required /></label>' +
      '<label class="vortx-signup-field"><span>Password</span><input type="password" name="password" id="signup-password" minlength="10" autocomplete="new-password" required /></label>' +
      '<p id="signup-password-hint" class="vortx-signup-hint">Enter a password</p>' +
      '<label class="vortx-signup-field"><span>Confirm password</span><input type="password" name="confirm_password" minlength="10" autocomplete="new-password" required /></label>' +
      '<label class="vortx-signup-check"><input type="checkbox" name="terms" required /><span>I agree Vortx is for public-record research only. I will not use it for unlawful surveillance, harassment, or automated credit/lending decisions without required notices.</span></label>' +
      '<button type="submit" id="signup-submit">Create customer account</button>' +
      '</form>' +
      '<p class="vortx-signup-muted"><a class="vortx-signup-link" href="/?view=customer">Already have an account? Log in</a></p>' +
      '</section></main>'

    if (!document.getElementById('vortx-signup-style')) {
      var style = document.createElement('style')
      style.id = 'vortx-signup-style'
      style.textContent =
        '.vortx-signup-wrap{max-width:720px;margin:0 auto;padding:44px 20px;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,sans-serif}' +
        '.vortx-signup-glass{border:1px solid rgba(148,163,184,.22);border-radius:28px;background:linear-gradient(135deg,rgba(15,23,42,.78),rgba(2,6,23,.66));box-shadow:0 24px 90px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(22px) saturate(135%);padding:28px}' +
        '.vortx-signup-eyebrow{font:700 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#50b4ff;margin:0}' +
        '.vortx-signup-glass h1{font-size:44px;line-height:1;margin:12px 0;letter-spacing:-.05em}' +
        '.vortx-signup-muted{color:#cbd5e1;line-height:1.6;margin:8px 0 0}' +
        '.vortx-signup-list{margin:14px 0 0;padding-left:18px;color:#94a3b8;font-size:14px;line-height:1.6}' +
        '.vortx-signup-link{color:#7dd3fc}' +
        '#signup-form{display:grid;gap:14px;margin-top:22px}' +
        '.vortx-signup-field{display:grid;gap:6px;font-size:13px;color:#cbd5e1}' +
        '.vortx-signup-field input{border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(0,0,0,.45);color:#f8fafc;padding:13px 14px}' +
        '.vortx-signup-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#cbd5e1}' +
        '.vortx-signup-check input{margin-top:4px;accent-color:#38bdf8}' +
        '.vortx-signup-hint{margin:0;font-size:12px;color:#94a3b8}' +
        '.vortx-signup-hint.strong{color:#86efac}' +
        '.vortx-signup-hint.weak{color:#fca5a5}' +
        '#signup-form button{border:1px solid rgba(125,211,252,.65);border-radius:14px;background:linear-gradient(135deg,#38bdf8,#7dd3fc);color:#020617;padding:13px 16px;font-weight:800;cursor:pointer;transition:filter .2s,transform .2s}' +
        '#signup-form button:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px)}' +
        '#signup-form button:disabled{opacity:.6;cursor:wait}' +
        '.vortx-signup-status{margin-top:14px;border-radius:14px;padding:12px 14px;font-size:14px}' +
        '.vortx-signup-status.error{border:1px solid rgba(248,113,113,.35);background:rgba(127,29,29,.35);color:#fecaca}' +
        '.vortx-signup-status.ok{border:1px solid rgba(52,211,153,.35);background:rgba(6,78,59,.35);color:#bbf7d0}' +
        '.vortx-signup-oauth{display:grid;gap:10px;margin-top:22px}' +
        '.vortx-signup-oauth-btn{display:flex;align-items:center;justify-content:space-between;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(0,0,0,.45);color:#f8fafc;padding:13px 14px;text-decoration:none;font-size:14px;font-weight:600}' +
        '.vortx-signup-oauth-btn:hover{border-color:rgba(125,211,252,.55)}' +
        '.vortx-signup-divider{margin:18px 0 0;text-align:center;font:700 10px monospace;letter-spacing:.16em;text-transform:uppercase;color:#64748b}'
      document.head.appendChild(style)
    }

    var params = new URLSearchParams(location.search)
    var errorCode = params.get('error')
    var status = document.getElementById('signup-status')
    if (errorCode) {
      showStatus(status, SIGNUP_ERRORS[errorCode] || decodeURIComponent(errorCode), true)
    }

    var passwordInput = document.getElementById('signup-password')
    var passwordHint = document.getElementById('signup-password-hint')
    if (passwordInput && passwordHint) {
      passwordInput.addEventListener('input', function () {
        var score = scorePassword(passwordInput.value)
        passwordHint.textContent = passwordLabel(score)
        passwordHint.className = 'vortx-signup-hint ' + (score >= 5 ? 'strong' : score >= 3 ? '' : 'weak')
      })
    }

    var form = document.getElementById('signup-form')
    var submit = document.getElementById('signup-submit')
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var data = new FormData(form)
      var email = String(data.get('email') || '').trim().toLowerCase()
      var password = String(data.get('password') || '')
      var confirmPassword = String(data.get('confirm_password') || '')
      var terms = data.get('terms')

      if (!email || email.indexOf('@') < 1) {
        showStatus(status, SIGNUP_ERRORS.invalid_email, true)
        return
      }
      if (!terms) {
        showStatus(status, SIGNUP_ERRORS.terms_required, true)
        return
      }
      if (scorePassword(password) < 3) {
        showStatus(status, SIGNUP_ERRORS.weak_password, true)
        return
      }
      if (password !== confirmPassword) {
        showStatus(status, SIGNUP_ERRORS.password_mismatch, true)
        return
      }

      showStatus(status, 'Creating account...', false)
      submit.disabled = true
      fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          confirm_password: confirmPassword,
          terms_accepted: true,
        }),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            return { res: res, body: body }
          })
        })
        .then(function (payload) {
          if (payload.res.status === 409) {
            window.location.assign(CANONICAL_SITE + '/?view=customer&signup=exists')
            return
          }
          if (payload.res.ok && payload.body.ok) {
            if (payload.body.access_token) {
              try {
                sessionStorage.setItem(
                  'vortx_pending_session',
                  JSON.stringify({
                    access_token: payload.body.access_token,
                    refresh_token: payload.body.refresh_token || '',
                  }),
                )
                sessionStorage.setItem('vortx_auth_return_view', 'customer')
              } catch (storageErr) {}
              window.location.assign(CANONICAL_SITE + '/?view=customer&signup=created')
              return
            }
            return fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify({ email: email, password: password }),
            })
              .then(function (loginRes) {
                return loginRes.json().then(function (loginBody) {
                  return { loginRes: loginRes, loginBody: loginBody }
                })
              })
              .then(function (loginPayload) {
                if (loginPayload.loginRes.ok && loginPayload.loginBody.ok && loginPayload.loginBody.access_token) {
                  try {
                    sessionStorage.setItem(
                      'vortx_pending_session',
                      JSON.stringify({
                        access_token: loginPayload.loginBody.access_token,
                        refresh_token: loginPayload.loginBody.refresh_token || '',
                      }),
                    )
                  } catch (storageErr) {}
                }
                window.location.assign(CANONICAL_SITE + '/?view=customer&signup=created')
              })
          }
          throw new Error(payload.body.message || payload.body.error || 'Signup failed.')
        })
        .catch(function (err) {
          showStatus(status, err && err.message ? err.message : 'Signup failed.', true)
        })
        .finally(function () {
          submit.disabled = false
        })
    })
  }

  var params = new URLSearchParams(location.search)
  if (path !== '/signup' && params.get('view') === 'signup') {
    window.location.replace('/signup')
    return
  }
  if (path === '/signup') {
    document.documentElement.style.background = '#020617'
    document.body.style.background = '#020617'
    renderSignupPage()
    return
  }

  wireLeadCapture()

  var analytics = document.createElement('script')
  analytics.src = '/analytics.js'
  analytics.defer = true
  document.head.appendChild(analytics)
})()
