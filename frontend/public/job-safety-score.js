(function () {
  var form = document.getElementById('jss-form')
  var submit = document.getElementById('jss-submit')
  var resultsPanel = document.getElementById('jss-results')
  var headline = document.getElementById('jss-result-headline')
  var matchMeta = document.getElementById('jss-match-meta')
  var copy = document.getElementById('jss-result-copy')
  var banner = document.getElementById('jss-result-banner')
  var recordsEl = document.getElementById('jss-records')
  var ctaRow = document.getElementById('jss-cta-row')
  var unlockBtn = document.getElementById('jss-unlock-btn')
  var alertBtn = document.getElementById('jss-alert-btn')
  var clearUpsell = document.getElementById('jss-clear-upsell')
  var scoutUpsell = document.getElementById('jss-scout-upsell')
  var noResultExtra = document.getElementById('jss-no-result-extra')

  var lastPayload = null

  function track(step, resultCount) {
    fetch('/api/job-safety-score/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: step, result_count: resultCount || 0 }),
    }).catch(function () {})
  }

  function showError(message) {
    banner.innerHTML = '<div class="notice">' + escapeHtml(message) + '</div>'
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
      var parts = []
      if (row.filing_date) parts.push('Filing date: ' + row.filing_date)
      if (row.worker_scale) parts.push(row.worker_scale)
      if (row.location) parts.push('Location: ' + row.location)
      if (row.recency_label) parts.push(row.recency_label)

      if (row.locked) {
        div.innerHTML =
          '<strong>' +
          escapeHtml(row.teaser_line || 'Layoff-related public filing') +
          '</strong><span>' +
          escapeHtml(parts.join(' · ')) +
          '</span><span class="unlock">Source document and full filing text unlock with payment</span>'
      } else {
        var source = row.source_url
          ? '<a href="' + escapeHtml(row.source_url) + '" target="_blank" rel="noopener noreferrer">View source document</a>'
          : 'Source document not linked for this record.'
        var summary = row.summary_preview
          ? '<span>' + escapeHtml(row.summary_preview) + '</span>'
          : ''
        div.innerHTML =
          '<strong>' +
          escapeHtml(row.teaser_line || 'Layoff-related public filing') +
          '</strong><span>' +
          escapeHtml(parts.join(' · ')) +
          '</span>' +
          summary +
          '<span>' +
          source +
          '</span>'
      }
      recordsEl.appendChild(div)
    }
  }

  function updateAlertButton(result) {
    if (!alertBtn || !result || !result.entity_name) return
    alertBtn.textContent = 'Get notified the moment a new layoff filing is recorded for ' + result.entity_name
  }

  function persistLastPayload(payload) {
    lastPayload = payload
    var raw = JSON.stringify(payload)
    try {
      sessionStorage.setItem('vortx_job_safety_score_last', raw)
    } catch (e) {}
    try {
      localStorage.setItem('vortx_job_safety_score_last', raw)
    } catch (e2) {}
  }

  function restoreLastPayload() {
    var raw = null
    try {
      raw = sessionStorage.getItem('vortx_job_safety_score_last')
    } catch (e) {}
    if (!raw) {
      try {
        raw = localStorage.getItem('vortx_job_safety_score_last')
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
    headline.textContent = result.has_records ? 'Filing found' : 'No filing found'
    copy.textContent = result.headline || ''

    if (matchMeta) {
      matchMeta.className = 'legal match-meta'
      if (match && match.label && !match.rejected) {
        matchMeta.textContent =
          match.label + (match.fuzzy ? '. Verify this is your employer before acting on results.' : '')
        matchMeta.classList.remove('hidden')
        if (match.fuzzy) matchMeta.classList.add('fuzzy')
      } else if (match && match.rejected) {
        matchMeta.textContent =
          (match.label || 'Possible match rejected') + '. Try the full legal employer name from a pay stub.'
        matchMeta.classList.remove('hidden')
        matchMeta.classList.add('rejected')
      } else {
        matchMeta.textContent = ''
        matchMeta.classList.add('hidden')
      }
    }

    if (result.has_records) {
      banner.innerHTML =
        '<div class="notice">A layoff-related public filing exists for this employer. Review the details below and consider your own situation calmly.</div>'
      unlockBtn.textContent = '$5 for source documents and full filing details'
      ctaRow.classList.remove('hidden')
      if (clearUpsell) clearUpsell.classList.add('hidden')
      if (scoutUpsell) scoutUpsell.classList.remove('hidden')
      noResultExtra.classList.add('hidden')
      updateAlertButton(result)
    } else {
      banner.innerHTML =
        '<div class="ok">No layoff-related public filings found in the free preview for this search.</div>'
      noResultExtra.classList.remove('hidden')
      if (result.entity_id && !result.unlocked) {
        unlockBtn.textContent = '$5 for a deeper lookback and source documents'
        ctaRow.classList.remove('hidden')
        if (clearUpsell) clearUpsell.classList.remove('hidden')
      } else {
        ctaRow.classList.add('hidden')
        if (clearUpsell) clearUpsell.classList.add('hidden')
      }
      if (scoutUpsell) scoutUpsell.classList.remove('hidden')
      updateAlertButton(result)
    }

    renderRecords(result)
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function runSearch(name, state) {
    submit.disabled = true
    submit.textContent = 'Checking…'
    track('search', 0)
    return fetch('/api/job-safety-score/search', {
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
        plan: 'job_safety_unlock',
        acceptable_use_accepted: true,
        acceptable_use_accepted_at: new Date().toISOString(),
        entity_ids: [lastPayload.result.entity_id],
        job_safety_state: lastPayload.query && lastPayload.query.state ? lastPayload.query.state : '',
        return_path: '/layoff-search',
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

  function startAlertCheckout() {
    if (!lastPayload || !lastPayload.result || !lastPayload.result.entity_id) return
    track('alert_click', lastPayload.result.record_count || 0)
    track('subscribe_click', lastPayload.result.record_count || 0)
    alertBtn.disabled = true
    fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        plan: 'scout',
        acceptable_use_accepted: true,
        acceptable_use_accepted_at: new Date().toISOString(),
        entity_ids: [lastPayload.result.entity_id],
        return_path: '/layoff-search',
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
        alertBtn.disabled = false
      })
  }

  function verifyPaidUnlock(sessionId) {
    var entityId = lastPayload && lastPayload.result ? lastPayload.result.entity_id : ''
    var state = lastPayload && lastPayload.query ? lastPayload.query.state || '' : ''
    fetch('/api/job-safety-score/verify-unlock', {
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
        ctaRow.classList.add('hidden')
        banner.innerHTML =
          '<div class="ok">Payment confirmed. Source documents and full filing details are unlocked below.</div>'
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
      var name = String(document.getElementById('jss-name').value || '').trim()
      var state = String(document.getElementById('jss-state').value || '').trim()
      if (!name) {
        showError('Enter an employer or company name.')
        return
      }
      runSearch(name, state)
    })
  }

  if (unlockBtn) unlockBtn.addEventListener('click', startUnlockCheckout)
  if (alertBtn) alertBtn.addEventListener('click', startAlertCheckout)

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
