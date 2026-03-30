/**
 * Neon CRM Events Proxy
 * Netlify Function — netlify/functions/events.js
 *
 * Required environment variables:
 *   NEON_ORG_ID   — your Neon CRM organization ID
 *   NEON_API_KEY  — your Neon CRM API key (v2)
 *
 * Accepted query params:
 *   tags       — comma-separated category names, case-insensitive (e.g. "Workshops,Classes")
 *   startDate  — ISO date string, filters events starting on or after this date (e.g. "2026-04-01")
 *   limit      — max events to return after filtering, default 20, max 100
 *
 * NOTE: Neon v2 GET /events does not appear to support server-side category filtering
 * as a query param. We fetch a large page and filter here. If Neon adds native
 * category filtering in a future API version, replace the client-side filter below
 * with a query param and reduce FETCH_SIZE accordingly.
 */

const NEON_API_BASE = "https://api.neoncrm.com/v2";
const FETCH_SIZE = 200; // fetch enough to make tag filtering useful

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler = async (event) => {

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const orgId = process.env.NEON_ORG_ID;
  const apiKey = process.env.NEON_API_KEY;

  if (!orgId || !apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing NEON_ORG_ID or NEON_API_KEY environment variables." }),
    };
  }

  const params = event.queryStringParameters || {};
  const tags = params.tags
    ? params.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];
  const startDate = params.startDate || null;
  const limit = Math.min(parseInt(params.limit, 10) || 20, 100);

  // Build Neon API request
  const neonParams = new URLSearchParams({
    pageSize: FETCH_SIZE,
    currentPage: 1,
  });

  if (startDate) {
    neonParams.set("startDateAfter", startDate);
  }

  const auth = Buffer.from(`${orgId}:${apiKey}`).toString("base64");

  let neonData;

  try {
    const response = await fetch(`${NEON_API_BASE}/events?${neonParams.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Neon API error", detail }),
      };
    }

    neonData = await response.json();
    console.log("Neon response keys:", Object.keys(neonData));
    console.log("Neon request URL:", `${NEON_API_BASE}/events?${neonParams.toString()}`);
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to reach Neon CRM API", detail: err.message }),
    };
  }

  // Normalize — Neon v2 returns events under "events" key
  // Verify field names against your API version if results look wrong
  let events = neonData.events || [];

  // Filter by tags if provided
  // Matches against event.category.name — adjust field path if your Neon
  // instance returns categories differently (e.g. event.categoryName)
  if (tags.length > 0) {
    events = events.filter((ev) => {
      const categoryName = (ev.category?.name || ev.categoryName || "").toLowerCase();
      return tags.some((tag) => categoryName.includes(tag));
    });
  }

  // Apply limit after filtering
  events = events.slice(0, limit);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ events }),
  };
};