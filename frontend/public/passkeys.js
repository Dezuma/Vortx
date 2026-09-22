/**
 * First-class passkey + recovery client for the production login panel.
 * The locked React bundle calls window.vortxPasskeys; this file does not inject UI.
 */
(function vortxPasskeysLib() {
  function b64urlToBuf(value) {
    var pad = String(value).replace(/-/g, '+').replace(/_/g, '/')
    pad += '='.repeat((4 - (pad.length % 4)) % 4)
    var bin = atob(pad)
    var out = new Uint8Array(bin.length)
    for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
    return out.buffer
  }

  function bufToB64url(buf) {
    var bytes = new Uint8Array(buf)
    var bin = ''
    for (var i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  async function parseJson(res) {
    var body = await res.json().catch(function () {
      return {}
    })
    if (!res.ok) throw new Error(body.message || body.error || 'Request failed')
    return body
  }

  function bearer() {
    try {
      var pending = sessionStorage.getItem('vortx_pending_session')
      if (pending) {
        var parsedPending = JSON.parse(pending)
        if (parsedPending.access_token) return parsedPending.access_token
      }
    } catch (_err) {}
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i)
        if (!key || key.indexOf('auth-token') === -1) continue
        var parsed = JSON.parse(localStorage.getItem(key) || '{}')
        var token = parsed.access_token || parsed.currentSession?.access_token
        if (token) return token
      }
    } catch (_err) {}
    return ''
  }

  function decodePublicKey(publicKey) {
    var next = Object.assign({}, publicKey)
    next.challenge = b64urlToBuf(publicKey.challenge)
    if (publicKey.user && publicKey.user.id) {
      next.user = Object.assign({}, publicKey.user, { id: b64urlToBuf(publicKey.user.id) })
    }
    ;['allowCredentials', 'excludeCredentials'].forEach(function (field) {
      if (!Array.isArray(publicKey[field])) return
      next[field] = publicKey[field].map(function (cred) {
        return Object.assign({}, cred, { id: b64urlToBuf(cred.id) })
      })
    })
    return next
  }

  async function signIn(email, mediation) {
    if (!window.PublicKeyCredential) throw new Error('Passkeys are not available on this browser.')
    var options = await parseJson(
      await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email || undefined }),
      }),
    )
    var request = { publicKey: decodePublicKey(options.publicKey) }
    if (mediation) request.mediation = mediation
    var assertion = await navigator.credentials.get(request)
    if (!assertion) throw new Error('Passkey sign-in was cancelled.')
    return parseJson(
      await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challenge_id: options.challenge_id,
          id: assertion.id,
          rawId: bufToB64url(assertion.rawId),
          type: assertion.type,
          response: {
            clientDataJSON: bufToB64url(assertion.response.clientDataJSON),
            authenticatorData: bufToB64url(assertion.response.authenticatorData),
            signature: bufToB64url(assertion.response.signature),
            userHandle: assertion.response.userHandle
              ? bufToB64url(assertion.response.userHandle)
              : null,
          },
        }),
      }),
    )
  }

  async function consumeRecovery(email, code) {
    return parseJson(
      await fetch('/api/auth/recovery/consume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, code: code }),
      }),
    )
  }

  async function register() {
    var token = bearer()
    if (!token) throw new Error('Sign in first, then add a passkey.')
    var options = await parseJson(
      await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: '{}',
      }),
    )
    var credential = await navigator.credentials.create({
      publicKey: decodePublicKey(options.publicKey),
    })
    if (!credential) throw new Error('Passkey registration was cancelled.')
    return parseJson(
      await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({
          challenge_id: options.challenge_id,
          id: credential.id,
          rawId: bufToB64url(credential.rawId),
          type: credential.type,
          authenticatorAttachment: credential.authenticatorAttachment || null,
          response: {
            clientDataJSON: bufToB64url(credential.response.clientDataJSON),
            attestationObject: bufToB64url(credential.response.attestationObject),
          },
        }),
      }),
    )
  }

  function showRecoveryCodes(codes) {
    var existing = document.getElementById('vortx-recovery-codes')
    if (existing) existing.remove()
    var panel = document.createElement('div')
    panel.id = 'vortx-recovery-codes'
    panel.className = 'glass-panel mx-auto mt-4 max-w-xl rounded-3xl p-6'
    var heading = document.createElement('h3')
    heading.className = 'display-font text-2xl'
    heading.textContent = 'Recovery codes'
    var copy = document.createElement('p')
    copy.className = 'mt-2 text-sm text-muted'
    copy.textContent = 'Store these offline. They are shown once and cannot be recovered later.'
    var list = document.createElement('ol')
    list.className = 'mt-3 space-y-1 text-sm'
    ;(codes || []).forEach(function (code) {
      var item = document.createElement('li')
      item.className = 'data-font'
      item.textContent = code
      list.appendChild(item)
    })
    panel.appendChild(heading)
    panel.appendChild(copy)
    panel.appendChild(list)
    document.body.prepend(panel)
  }

  async function startConditional() {
    if (!window.PublicKeyCredential) return
    if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') return
    var available = await PublicKeyCredential.isConditionalMediationAvailable().catch(function () {
      return false
    })
    if (!available) return
    try {
      var session = await signIn('', 'conditional')
      if (session && session.access_token) {
        try {
          sessionStorage.setItem(
            'vortx_pending_session',
            JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token || '',
            }),
          )
        } catch (_err) {}
        window.location.assign('/?view=customer')
      }
    } catch (_err) {
      // Conditional UI is cancelled when the user uses password or another method.
    }
  }

  window.vortxPasskeys = {
    signIn: signIn,
    consumeRecovery: consumeRecovery,
    register: register,
    showRecoveryCodes: showRecoveryCodes,
  }

  var params = new URLSearchParams(window.location.search)
  if (params.get('view') === 'customer' || params.get('view') === 'admin') {
    startConditional()
  }
})()
