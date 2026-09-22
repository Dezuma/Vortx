(function () {
  var host = String(window.location.hostname || '').toLowerCase()
  if (!host || host === 'localhost' || host === '127.0.0.1') return

  var domain = host.replace(/^www\./, '')
  if (domain !== 'vortxmkt.com') return

  if (window.__vortxAnalyticsLoaded) return
  window.__vortxAnalyticsLoaded = true

  var script = document.createElement('script')
  script.defer = true
  script.dataset.domain = domain
  script.src = 'https://plausible.io/js/script.tagged-events.js'
  document.head.appendChild(script)

  window.vortxTrack = function (eventName, props) {
    if (typeof window.plausible !== 'function') return
    window.plausible(eventName, props ? { props: props } : undefined)
  }
})()
