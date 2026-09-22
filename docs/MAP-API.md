# Vortx Enterprise Map API

The Enterprise Map API returns the same viewport-bounded GeoJSON structure used
by the Vortx map, with full entity, filing, source, and geocoding-confidence
fields. It is available only to active **Enterprise (`galactic`)** API keys.

Base URL:

```text
https://vortxmkt.com/api/enterprise/map/signals
```

## Authentication

Send the API key in either header:

```http
Authorization: Bearer vx_map_...
```

or:

```http
X-Vortx-API-Key: vx_map_...
```

Raw keys are shown once. Vortx stores only a SHA-256 hash.

Create or rotate a key:

```bash
cd /home/dbz/vibe-seo/vortx
npm run map:api-key -- --email=owner@example.com
```

Revoke it:

```bash
npm run map:api-key -- --email=owner@example.com --revoke
```

## Bounds query

`bounds` is required and ordered `west,south,east,north`.

```bash
curl --get 'https://vortxmkt.com/api/enterprise/map/signals' \
  --header "Authorization: Bearer $VORTX_MAP_API_KEY" \
  --data-urlencode 'bounds=-125,32,-114,42'
```

The API rejects missing, reversed, or out-of-range bounds. World-scale
viewports are allowed (up to 360 degrees longitude by 180 degrees latitude)
so the public globe can load a full Earth view and still query by `map.getBounds()`.

## Filters

The endpoint accepts the same filters as the map:

- `types`: comma-separated `warn`, `bankruptcy`, `liens`, `congress`, `form4`
- `q`: entity, politician, ticker, state, or city; maximum 64 characters
- `cross_only=1`: return only exact issuer/ticker cross-signals

Example:

```bash
curl --get 'https://vortxmkt.com/api/enterprise/map/signals' \
  --header "X-Vortx-API-Key: $VORTX_MAP_API_KEY" \
  --data-urlencode 'bounds=-83,24,-66,48' \
  --data-urlencode 'types=warn,form4' \
  --data-urlencode 'q=Atlanta'
```

## Response

The response is a GeoJSON `FeatureCollection`:

```json
{
  "ok": true,
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "event-uuid",
      "geometry": {
        "type": "Point",
        "coordinates": [-84.388, 33.749]
      },
      "properties": {
        "id": "event-uuid",
        "eventType": "warn_notice",
        "signalGroup": "distress",
        "entityName": "Example Corp",
        "ticker": "EXMP",
        "filingDate": "2026-08-01",
        "location": {
          "label": "Atlanta, Fulton County, GA",
          "confidence": "facility",
          "precision": "address"
        },
        "sourceUrl": "https://source.example/filing"
      }
    }
  ],
  "meta": {
    "returned": 1,
    "tier": "Enterprise"
  }
}
```

Cross-signal features include `crossSignal.daysBetween`,
`crossSignal.correlationKeyType`, factual timing copy, and the standing legal
disclaimer. They never imply knowledge, coordination, causation, or wrongdoing.

## Limits and errors

- Maximum response: 2,000 points per viewport.
- Key limit: 180 requests per minute.
- `400 valid_bounds_required`: missing or invalid bounds.
- `401 invalid_api_key`: missing, malformed, revoked, or unknown key.
- `403 enterprise_required`: valid key belongs to a non-Enterprise tier.
- `429 rate_limited`: retry after the seconds in the response/header.

Responses are `private, no-store`. Filter text and API keys are never written to
application logs. Requests are audited by owner and result count only.
