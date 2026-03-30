/**
 * Neon CRM Events Proxy
 * Netlify Function — netlify/functions/events.js
 *
 * Uses POST /events/search (GET /events only returns pagination, not data).
 *
 * Required environment variables:
 *   NEON_ORG_ID   — your Neon CRM organization ID
 *   NEON_API_KEY  — your Neon CRM API key (v2)
 *
 * Accepted query params:
 *   tags       — comma-separated category names, case-insensitive (e.g. "Workshops,Classes")
 *   startDate  — ISO date string, filters events starting on or after this date (e.g. "2026-04-01")
 *   limit      — max events to return after filtering, default 20, max 100
 */

const NEON_API_BASE = "https://api.neoncrm.com/v2";
const FETCH_SIZE = 200;

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

  const auth = Buffer.from(`${orgId}:${apiKey}`).toString("base64");

  // Minimal search — use field names from GET /events schema
  const searchBody = {
    searchFields: [
      { field: "name", operator: "NOT_BLANK", value: "" },
    ],
    outputFields: ["id", "name"],
    pagination: {
      currentPage: 0,
      pageSize: 5,
    },
  };

  let neonData;

  try {
    const response = await fetch(`${NEON_API_BASE}/events/search`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.log("Neon search error:", response.status, detail);
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Neon API error", detail }),
      };
    }

    neonData = await response.json();
    console.log("Neon search response keys:", Object.keys(neonData));
    console.log("Neon search pagination:", JSON.stringify(neonData.pagination));
    console.log("Neon search results count:", neonData.searchResults?.length ?? "N/A");
    console.log("Neon search raw first 2000 chars:", JSON.stringify(neonData).substring(0, 2000));
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to reach Neon CRM API", detail: err.message }),
    };
  }

  let events = (neonData.searchResults || []).map((result) => {
    // Search results use dynamic keys — log first result to see actual field names
    // This mapping will be adjusted once we see real data
    return result;
  });

  // Filter by tags if provided (field name TBD — will adjust after seeing response)
  if (tags.length > 0) {
    events = events.filter((ev) => {
      const categoryName = (
        ev["Event Category Name"] || ev.categoryName || ev.category?.name || ""
      ).toLowerCase();
      return tags.some((tag) => categoryName.includes(tag));
    });
  }

  events = events.slice(0, limit);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ events }),
  };
};
