(function () {
  var form = document.getElementById('contractor-form')
  var submit = document.getElementById('contractor-submit')
  var resultsPanel = document.getElementById('contractor-results')
  var headline = document.getElementById('contractor-result-headline')
  var matchMeta = document.getElementById('contractor-match-meta')
  var copy = document.getElementById('contractor-result-copy')
  var banner = document.getElementById('contractor-result-banner')
  var recordsEl = document.getElementById('contractor-records')
  var unlockRow = document.getElementById('contractor-unlock')
  var unlockBtn = document.getElementById('contractor-unlock-btn')
  var subscribeBtn = document.getElementById('contractor-subscribe-btn')
  var clearUpsell = document.getElementById('contractor-clear-upsell')
  var scoutUpsell = document.getElementById('contractor-scout-upsell')
  var noResultExtra = document.getElementById('contractor-no-result-extra')

  var lastPayload = null

  function track(step, resultCount) {
    fetch('/api/contractor-check/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: step, result_count: resultCount || 0 }),
    }).catch(function () {})
  }

  function showError(message) {
    banner.innerHTML = '<div class="alert">' + escapeHtml(message) + '</div>'
    resultsPanel.classList.add('visible')
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function renderRecords(result) {
    recordsEl.innerHTML = ''
    if (!result.records || !result.records.length) return

    for (var i = 0; i < result.records.length; i++) {
      var row = result.records[i]
      var div = document.createElement('div')
      div.className = 'record'
      if (row.locked) {
        div.innerHTML =
          '<strong>' +
          escapeHtml(row.teaser_line || row.record_type) +
          '</strong><span>Exact filing date and source document unlock with payment.</span><span class="unlock">Unlock details</span>'
      } else {
        var source = row.source_url
          ? '<a href="' + escapeHtml(row.source_url) + '" target="_blank" rel="noopener noreferrer">View source document</a>'
          : 'Source document not linked for this record.'
        div.innerHTML =
          '<strong>' +
          escapeHtml(row.teaser_line || row.record_type) +
          '</strong><span>Filing date: ' +
          escapeHtml(row.filing_date || 'on record') +
          '</span><span>' +
          source +
          '</span>'
      }
      recordsEl.appendChild(div)
    }
  }

  function persistLastPayload(payload) {
    lastPayload = payload
    var raw = JSON.stringify(payload)
    try {
      sessionStorage.setItem('vortx_contractor_check_last', raw)
    } catch (e) {}
    try {
      localStorage.setItem('vortx_contractor_check_last', raw)
    } catch (e2) {}
  }

  function restoreLastPayload() {
    var raw = null
    try {
      raw = sessionStorage.getItem('vortx_contractor_check_last')
    } catch (e) {}
    if (!raw) {
      try {
        raw = localStorage.getItem('vortx_contractor_check_last')
      } catch (e2) {}
    }
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch (e3) {
      return null
    }
  }

  function renderResults(payload) {
    persistLastPayload(payload)

    var result = payload.result || {}
    var match = payload.match || null
    resultsPanel.classList.add('visible')
    headline.textContent = result.has_records ? 'Records found' : 'No records found'
    copy.textContent = result.headline || ''

    if (matchMeta) {
      matchMeta.className = 'legal match-meta'
      if (match && match.label && !match.rejected) {
        matchMeta.textContent =
          match.label + (match.fuzzy ? '. Verify this is the same business before you pay.' : '')
        matchMeta.classList.remove('hidden')
        if (match.fuzzy) matchMeta.classList.add('fuzzy')
      } else if (match && match.rejected) {
        matchMeta.textContent =
          (match.label || 'Possible match rejected') +
          '. Name too different from your search. Use the full legal name.'
        matchMeta.classList.remove('hidden')
        matchMeta.classList.add('rejected')
      } else {
        matchMeta.textContent = ''
        matchMeta.classList.add('hidden')
      }
    }

    copy.textContent = result.headline || ''
    if (result.window_days && !result.unlocked) {
      copy.textContent +=
        ' Free preview covers the last ' +
        result.window_days +
        ' days; $5 unlock extends to 12 months.'
    }

    if (result.has_records) {
      banner.innerHTML =
        '<div class="alert">Public records exist for this name. Review details before you sign or pay a deposit.</div>'
      unlockBtn.textContent = '$5 to see full details'
      unlockRow.classList.remove('hidden')
      if (clearUpsell) clearUpsell.classList.add('hidden')
      if (scoutUpsell) scoutUpsell.classList.remove('hidden')
      noResultExtra.classList.add('hidden')
    } else {
      banner.innerHTML =
        '<div class="ok">No liens or bankruptcy filings found in the free 180-day preview for this search.</div>'
      noResultExtra.classList.remove('hidden')
      if (result.entity_id && !result.unlocked) {
        unlockBtn.textContent = '$5 for a 12-month lookback'
        unlockRow.classList.remove('hidden')
        if (clearUpsell) clearUpsell.classList.remove('hidden')
      } else {
        unlockRow.classList.add('hidden')
        if (clearUpsell) clearUpsell.classList.add('hidden')
      }
      if (scoutUpsell) scoutUpsell.classList.remove('hidden')
    }

    renderRecords(result)
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function runSearch(name, state) {
    submit.disabled = true
    submit.textContent = 'Checking…'
    return fetch('/api/contractor-check/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ name: name, state: state }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { res: res, body: body }
        })
      })
      .then(function (payload) {
        if (!payload.res.ok || !payload.body.ok) {
          throw new Error(payload.body.message || payload.body.error || 'Search failed.')
        }
        renderResults(payload.body)
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Search failed.')
      })
      .finally(function () {
        submit.disabled = false
        submit.textContent = 'Check now'
      })
  }

  function startUnlockCheckout() {
    if (!lastPayload || !lastPayload.result || !lastPayload.result.entity_id) return
    track('unlock_click', lastPayload.result.record_count || 0)
    unlockBtn.disabled = true
    fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        plan: 'contractor_unlock',
        acceptable_use_accepted: true,
        acceptable_use_accepted_at: new Date().toISOString(),
        entity_ids: [lastPayload.result.entity_id],
        contractor_state: lastPayload.query && lastPayload.query.state ? lastPayload.query.state : '',
        return_path: '/contractor-check',
      }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { res: res, body: body }
        })
      })
      .then(function (payload) {
        if (!payload.res.ok || !payload.body.url) {
          throw new Error(payload.body.message || payload.body.error || 'Checkout unavailable.')
        }
        window.location.assign(payload.body.url)
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Checkout failed.')
      })
      .finally(function () {
        unlockBtn.disabled = false
      })
  }

  function verifyPaidUnlock(sessionId) {
    var entityId = lastPayload && lastPayload.result ? lastPayload.result.entity_id : ''
    var state = lastPayload && lastPayload.query ? lastPayload.query.state || '' : ''
    fetch('/api/contractor-check/verify-unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        entity_id: entityId,
        state: state,
      }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { res: res, body: body }
        })
      })
      .then(function (payload) {
        if (!payload.res.ok || !payload.body.ok) {
          throw new Error(payload.body.message || payload.body.error || 'Unlock verification failed.')
        }
        if (!lastPayload) {
          lastPayload = {
            result: payload.body.result,
            match: null,
            query: { state: state },
          }
        } else {
          lastPayload.result = payload.body.result
        }
        persistLastPayload(lastPayload)
        renderResults(lastPayload)
        unlockRow.classList.add('hidden')
        banner.innerHTML = '<div class="ok">Payment confirmed. Full record details are unlocked below (12-month lookback).</div>'
        if (scoutUpsell) {
          scoutUpsell.classList.remove('hidden')
          scoutUpsell.classList.add('scout-upsell--primary')
          scoutUpsell.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Unlock verification failed.')
      })
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var name = String(document.getElementById('contractor-name').value || '').trim()
      var state = String(document.getElementById('contractor-state').value || '').trim()
      if (!name) {
        showError('Enter a contractor or business name.')
        return
      }
      runSearch(name, state)
    })
  }

  if (unlockBtn) {
    unlockBtn.addEventListener('click', startUnlockCheckout)
  }

  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', function () {
      track('subscribe_click', lastPayload && lastPayload.result ? lastPayload.result.record_count : 0)
    })
  }

  track('page_view', 0)

  var params = new URLSearchParams(window.location.search)
  var sessionId = params.get('session_id')
  var unlockState = params.get('unlock')
  if (sessionId && unlockState === 'success') {
    lastPayload = restoreLastPayload()
    verifyPaidUnlock(sessionId)
    params.delete('session_id')
    params.delete('unlock')
    window.history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''))
  }
})()
