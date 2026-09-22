/**
 * Install a default Trusted Types policy so existing React/DOM code can keep
 * assigning HTML while unknown scripts cannot create extra policies.
 * Pair with CSP: trusted-types default; require-trusted-types-for 'script'
 */
(function installDefaultTrustedTypes() {
  if (!window.trustedTypes || typeof window.trustedTypes.createPolicy !== 'function') return
  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: function (input) {
        return String(input)
      },
      createScript: function (input) {
        return String(input)
      },
      createScriptURL: function (input) {
        var url = new URL(String(input), window.location.href)
        if (url.origin !== window.location.origin) {
          throw new TypeError('blocked untrusted script URL')
        }
        return url.href
      },
    })
  } catch (_err) {
    // Policy may already exist from a previous load.
  }
})()
