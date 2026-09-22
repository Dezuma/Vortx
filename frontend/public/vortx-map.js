(function () {
  var LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron'
  var DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'
  var sourceId = 'vortx-map-signals'
  var clusterLayerId = 'vortx-map-clusters'
  var clusterCountLayerId = 'vortx-map-cluster-count'
  var pointLayerId = 'vortx-map-points'
  var emptyCollection = { type: 'FeatureCollection', features: [] }
  var maplibrePromise

  function loadMapLibre() {
    if (!maplibrePromise) {
      maplibrePromise = import('/maplibre/maplibre-gl.mjs')
    }
    return maplibrePromise
  }

  function styleFor(theme) {
    return theme === 'dark' ? DARK_STYLE : LIGHT_STYLE
  }

  function boundsQuery(map) {
    var bounds = map.getBounds()
    return [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]
      .map(function (value) {
        return Number(value).toFixed(5)
      })
      .join(',')
  }

  function installSignalLayers(map, data) {
    if (!map.isStyleLoaded()) return
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: data || emptyCollection,
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 24,
        clusterProperties: {
          distressCount: [
            '+',
            ['case', ['==', ['get', 'signalGroup'], 'distress'], 1, 0],
          ],
          tradeCount: [
            '+',
            ['case', ['==', ['get', 'signalGroup'], 'trade'], 1, 0],
          ],
          crossCount: [
            '+',
            ['case', ['==', ['get', 'signalGroup'], 'cross'], 1, 0],
          ],
        },
      })
    }
    if (!map.getLayer('vortx-map-clusters-glow')) {
      map.addLayer({
        id: 'vortx-map-clusters-glow',
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['>', ['get', 'crossCount'], 0],
            '#FFB800',
            ['>', ['get', 'distressCount'], ['get', 'tradeCount']],
            '#FF3366',
            '#00FF87',
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            2,
            20,
            10,
            26,
            50,
            34,
            200,
            42,
            500,
            50,
            1000,
            58,
          ],
          'circle-blur': 0.55,
          'circle-opacity': 0.28,
        },
      })
    }
    if (!map.getLayer(clusterLayerId)) {
      map.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['>', ['get', 'crossCount'], 0],
            '#FFB800',
            ['>', ['get', 'distressCount'], ['get', 'tradeCount']],
            '#FF3366',
            '#00FF87',
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            2,
            16,
            10,
            20,
            50,
            26,
            200,
            34,
            500,
            42,
            1000,
            50,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': [
            'case',
            ['>', ['get', 'crossCount'], 0],
            '#FEF3C7',
            ['>', ['get', 'distressCount'], ['get', 'tradeCount']],
            '#FEE2E2',
            '#DCFCE7',
          ],
          'circle-opacity': 0.92,
        },
      })
    }
    if (!map.getLayer(clusterCountLayerId)) {
      map.addLayer({
        id: clusterCountLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            2,
            12,
            99,
            12,
            100,
            11,
            999,
            11,
            1000,
            10,
            9999,
            9,
          ],
          'text-font': ['Noto Sans Regular'],
          'text-padding': 0,
          'text-max-width': 8,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#0B0E14',
          'text-halo-color': 'rgba(255,255,255,0.55)',
          'text-halo-width': 1,
        },
      })
    }
    if (!map.getLayer('vortx-map-points-glow')) {
      map.addLayer({
        id: 'vortx-map-points-glow',
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 3, 10, 9, 13, 14, 16],
          'circle-color': [
            'case',
            ['==', ['get', 'signalGroup'], 'cross'],
            '#FFB800',
            ['==', ['get', 'signalGroup'], 'distress'],
            '#FF3366',
            '#00FF87',
          ],
          'circle-blur': 0.65,
          'circle-opacity': 0.34,
        },
      })
    }
    if (!map.getLayer(pointLayerId)) {
      map.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 3, 6, 9, 8, 14, 11],
          'circle-color': [
            'case',
            ['==', ['get', 'signalGroup'], 'cross'],
            '#FEF3C7',
            ['==', ['get', 'signalGroup'], 'distress'],
            '#FEE2E2',
            '#DCFCE7',
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'signalGroup'], 'cross'],
            '#FFB800',
            ['==', ['get', 'signalGroup'], 'distress'],
            '#FF3366',
            '#00FF87',
          ],
          'circle-stroke-width': 3,
          'circle-opacity': 0.96,
        },
      })
    }
    var source = map.getSource(sourceId)
    if (source && typeof source.setData === 'function') source.setData(data || emptyCollection)
  }

  async function create(container, options) {
    var config = options || {}
    var onStatus =
      typeof config.onStatus === 'function' ? config.onStatus : function () {}
    var onPointClick =
      typeof config.onPointClick === 'function' ? config.onPointClick : function () {}
    var destroyed = false
    var abortController = null
    var moveTimer = null
    var tileFailed = false
    var latestData = emptyCollection
    var currentTheme = config.theme === 'dark' ? 'dark' : 'light'
    var authToken = String(config.authToken || '')
    var activeFilters = {
      types: Array.isArray(config.filters?.types) ? config.filters.types : [],
      query: String(config.filters?.query || ''),
      crossOnly: Boolean(config.filters?.crossOnly),
    }
    var maplibre = await loadMapLibre()
    if (destroyed) return null

    var map = new maplibre.Map({
      container: container,
      style: styleFor(currentTheme),
      center: [-96, 38],
      zoom: 3.5,
      minZoom: 0,
      maxZoom: 16,
      renderWorldCopies: false,
      attributionControl: true,
      cooperativeGestures: true,
    })
    map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), 'top-right')

    function syncThemeLayers() {
      var dark = currentTheme === 'dark'
      if (map.getLayer(clusterCountLayerId)) {
        map.setPaintProperty(clusterCountLayerId, 'text-color', dark ? '#F8FAFC' : '#0B0E14')
        map.setPaintProperty(
          clusterCountLayerId,
          'text-halo-color',
          dark ? 'rgba(2, 6, 23, 0.78)' : 'rgba(255, 255, 255, 0.55)',
        )
      }
      var glowOpacity = dark ? 0.38 : 0.22
      if (map.getLayer('vortx-map-clusters-glow')) {
        map.setPaintProperty('vortx-map-clusters-glow', 'circle-opacity', glowOpacity)
      }
      if (map.getLayer('vortx-map-points-glow')) {
        map.setPaintProperty('vortx-map-points-glow', 'circle-opacity', glowOpacity + 0.04)
      }
    }

    function applyGlobeLook() {
      if (typeof map.setProjection === 'function') {
        map.setProjection({ type: 'globe' })
      }
      if (typeof map.setSky === 'function') {
        map.setSky({
          'atmosphere-blend': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            1,
            4,
            0.92,
            7,
            0.35,
            9,
            0,
          ],
          'sky-color': currentTheme === 'dark' ? '#010409' : '#8ec5ef',
          'horizon-color': currentTheme === 'dark' ? '#1d4ed8' : '#dbeafe',
          'fog-color': currentTheme === 'dark' ? '#020617' : '#bfdbfe',
          'sky-horizon-blend': 0.42,
          'horizon-fog-blend': 0.38,
        })
      }
      syncThemeLayers()
    }

    function handleStyleLoad() {
      applyGlobeLook()
      if (!destroyed) installSignalLayers(map, latestData)
    }

    async function loadViewport(force) {
      if (destroyed || (!force && !map.loaded())) return
      if (abortController) abortController.abort()
      abortController = new AbortController()
      var bounds = boundsQuery(map)
      onStatus({ state: 'loading', bounds: bounds, count: latestData.features.length })
      try {
        var params = new URLSearchParams({ bounds: bounds })
        if (activeFilters.types.length) params.set('types', activeFilters.types.join(','))
        if (activeFilters.query) params.set('q', activeFilters.query)
        if (activeFilters.crossOnly) params.set('cross_only', '1')
        var response = await fetch(
          '/api/map/signals?' + params.toString(),
          {
            signal: abortController.signal,
            headers: {
              accept: 'application/json',
              ...(authToken ? { authorization: 'Bearer ' + authToken } : {}),
            },
          },
        )
        var payload = await response.json().catch(function () {
          return {}
        })
        if (!response.ok || !payload.ok || payload.type !== 'FeatureCollection') {
          throw new Error(payload.message || 'Viewport signals could not load.')
        }
        latestData = {
          type: 'FeatureCollection',
          features: Array.isArray(payload.features) ? payload.features : [],
        }
        var distressCount = 0
        var tradeCount = 0
        var crossCount = 0
        for (var featureIndex = 0; featureIndex < latestData.features.length; featureIndex += 1) {
          var group =
            latestData.features[featureIndex] &&
            latestData.features[featureIndex].properties &&
            latestData.features[featureIndex].properties.signalGroup
          if (group === 'distress') distressCount += 1
          else if (group === 'trade') tradeCount += 1
          else if (group === 'cross') crossCount += 1
        }
        installSignalLayers(map, latestData)
        onStatus({
          state: tileFailed ? 'tile_error' : 'ready',
          bounds: bounds,
          count: latestData.features.length,
          distressCount: distressCount,
          tradeCount: tradeCount,
          crossCount: crossCount,
          capped: Boolean(payload.meta && payload.meta.capped),
          crossSignals: Number(payload.meta && payload.meta.crossSignals) || 0,
          fallbackFeatures: tileFailed ? latestData.features.slice(0, 100) : [],
          message: tileFailed
            ? 'Basemap tiles are unavailable. Showing a bounded signal list instead.'
            : '',
        })
      } catch (error) {
        if (error && error.name === 'AbortError') return
        onStatus({
          state: 'error',
          bounds: bounds,
          count: latestData.features.length,
          message: error instanceof Error ? error.message : 'Map signals could not load.',
        })
      }
    }

    function scheduleViewportLoad() {
      if (moveTimer) clearTimeout(moveTimer)
      moveTimer = setTimeout(function () {
        void loadViewport(tileFailed)
      }, 180)
    }

    map.on('style.load', handleStyleLoad)
    map.on('load', function () {
      void loadViewport(false)
    })
    map.on('moveend', scheduleViewportLoad)
    map.on('click', clusterLayerId, async function (event) {
      var feature = event.features && event.features[0]
      var clusterId = Number(feature && feature.properties && feature.properties.cluster_id)
      var coordinates = feature && feature.geometry && feature.geometry.coordinates
      var source = map.getSource(sourceId)
      if (
        !source ||
        !Number.isFinite(clusterId) ||
        !Array.isArray(coordinates) ||
        typeof source.getClusterExpansionZoom !== 'function'
      ) {
        return
      }
      try {
        var zoom = await source.getClusterExpansionZoom(clusterId)
        map.easeTo({ center: coordinates, zoom: zoom, duration: 650 })
      } catch (_) {}
    })
    map.on('click', pointLayerId, function (event) {
      var feature = event.features && event.features[0]
      var id = String(
        (feature && feature.properties && feature.properties.id) || feature?.id || '',
      ).trim()
      if (id) onPointClick(id)
    })
    map.on('mouseenter', clusterLayerId, function () {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', clusterLayerId, function () {
      map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', pointLayerId, function () {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', pointLayerId, function () {
      map.getCanvas().style.cursor = ''
    })
    map.on('error', function (event) {
      var message = String(event && event.error && event.error.message ? event.error.message : '')
      if (/style|tile|glyph|sprite/i.test(message)) {
        tileFailed = true
        onStatus({
          state: 'tile_error',
          count: latestData.features.length,
          message: 'Basemap tiles are unavailable. Signal data remains bounded to this viewport.',
          fallbackFeatures: latestData.features.slice(0, 100),
        })
        void loadViewport(true)
      }
    })

    return {
      setTheme: function (nextTheme) {
        var normalized = nextTheme === 'dark' ? 'dark' : 'light'
        if (normalized === currentTheme || destroyed) return
        currentTheme = normalized
        map.setStyle(styleFor(currentTheme))
      },
      setAuthToken: function (nextToken) {
        authToken = String(nextToken || '')
      },
      setFilters: function (nextFilters) {
        activeFilters = {
          types: Array.isArray(nextFilters?.types) ? nextFilters.types : [],
          query: String(nextFilters?.query || ''),
          crossOnly: Boolean(nextFilters?.crossOnly),
        }
        void loadViewport(tileFailed)
      },
      getViewport: function () {
        return {
          bounds: boundsQuery(map),
          data: latestData,
          filters: activeFilters,
        }
      },
      retry: function () {
        void loadViewport(tileFailed)
      },
      resetView: function () {
        if (destroyed) return
        map.easeTo({ center: [-96, 38], zoom: 3.5, duration: 850 })
      },
      focusLngLat: function (lng, lat, zoom) {
        if (destroyed) return
        var longitude = Number(lng)
        var latitude = Number(lat)
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return
        var reduced = false
        try {
          reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        } catch (e) {}
        map.easeTo({
          center: [longitude, latitude],
          zoom: Number.isFinite(Number(zoom)) ? Number(zoom) : 7.4,
          duration: reduced ? 0 : 900,
          essential: true,
        })
      },
      resize: function () {
        if (!destroyed) map.resize()
      },
      destroy: function () {
        destroyed = true
        if (abortController) abortController.abort()
        if (moveTimer) clearTimeout(moveTimer)
        map.remove()
      },
    }
  }

  window.VortxMap = { create: create }
})()
