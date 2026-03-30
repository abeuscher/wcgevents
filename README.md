# Neon CRM Events Widget

A two-file drop-in for displaying filtered Neon CRM events on any website, without Neon's registration flow or broken calendar widget.

## Files

- `netlify/functions/events.js` — serverless proxy that authenticates with Neon v2 API and returns filtered event JSON
- `events-widget.js` — frontend script that calls the function and renders events into a container div

## Setup

### 1. Environment variables (Netlify dashboard)

```
NEON_ORG_ID=your-org-id
NEON_API_KEY=your-api-key
```

Create a dedicated API user in Neon under Settings > User Management. Read-only access is sufficient.

### 2. Add to any page

```html
<div
  id="neon-events"
  data-api-url="https://your-site.netlify.app/.netlify/functions/events"
  data-tags="Workshops,Classes"
  data-start-date="2026-04-01"
  data-limit="10"
></div>
<script src="events-widget.js"></script>
```

### Data attributes

| Attribute        | Required | Description |
|-----------------|----------|-------------|
| `data-api-url`  | Yes      | Full URL to the Netlify function |
| `data-tags`     | No       | Comma-separated category names to filter by (case-insensitive, partial match) |
| `data-start-date` | No     | ISO date — only show events on or after this date |
| `data-limit`    | No       | Max events to display, default 20, max 100 |

## Notes

- Tag filtering happens server-side in the function, not via a Neon API param. The function fetches up to 200 events then filters. Fine for typical nonprofit event volumes.
- **Verify field names** against your actual Neon API response before going live. Hit the function URL directly in a browser and inspect the raw JSON. Fields to check: `ev.name`, `ev.startDate`, `ev.startTime`, `ev.location`, `ev.category.name`.
- Styles are injected as a `<style>` block at runtime. Edit the `STYLES` constant in `events-widget.js` to match the client's site.
- CORS is open (`*`) by default. Lock it down to the client's domain in the function if needed.