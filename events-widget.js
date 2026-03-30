/**
 * Neon CRM Events Widget
 * events-widget.js
 *
 * Drop-in widget that fetches events from your Netlify proxy function
 * and renders them into a container element. No dependencies.
 *
 * Usage:
 *
 *   <div
 *     id="neon-events"
 *     data-api-url="https://your-site.netlify.app/.netlify/functions/events"
 *     data-tags="Workshops,Classes"
 *     data-start-date="2026-04-01"
 *     data-limit="10"
 *   ></div>
 *   <script src="events-widget.js"></script>
 *
 * Data attributes:
 *   data-api-url    (required) Full URL to your Netlify function
 *   data-tags       (optional) Comma-separated category names to filter by
 *   data-start-date (optional) ISO date — only show events on or after this date
 *   data-limit      (optional) Max events to show, default 20
 *
 * The widget targets the first element with id="neon-events" by default.
 * Change CONTAINER_ID below if needed.
 */

(function () {
  const CONTAINER_ID = "neon-events";

  // ─── Styles ────────────────────────────────────────────────────────────────
  // Edit here to adjust appearance. Injected once into <head> at init.

  const STYLES = `
    #neon-events {
      font-family: inherit;
      max-width: 100%;
    }

    .ne-loading,
    .ne-error,
    .ne-empty {
      padding: 1rem 0;
      color: #666;
      font-size: 0.95rem;
    }

    .ne-error {
      color: #c0392b;
    }

    .ne-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ne-item {
      padding: 1rem 0;
      border-bottom: 1px solid #e5e5e5;
    }

    .ne-item:last-child {
      border-bottom: none;
    }

    .ne-name {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
    }

    .ne-name a {
      color: inherit;
      text-decoration: none;
    }

    .ne-name a:hover {
      text-decoration: underline;
    }

    .ne-meta {
      font-size: 0.875rem;
      color: #555;
      margin: 0;
    }

    .ne-location {
      font-size: 0.875rem;
      color: #555;
      margin: 0.2rem 0 0;
    }
  `;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("neon-events-styles")) return;
    const style = document.createElement("style");
    style.id = "neon-events-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function formatDate(dateStr, timeStr) {
    if (!dateStr) return "";
    // Neon returns dates as "YYYY-MM-DD" and times as "HH:MM AM/PM" — adjust if needed
    try {
      const date = new Date(`${dateStr}T00:00:00`);
      const formatted = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return timeStr ? `${formatted} · ${timeStr}` : formatted;
    } catch {
      return dateStr;
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function render(container, events) {
    if (!events || events.length === 0) {
      container.innerHTML = `<p class="ne-empty">No upcoming events found.</p>`;
      return;
    }

    const items = events.map((ev) => {
      // Adjust these field paths if your Neon API returns differently
      const name = ev.name || "Untitled Event";
      const startDate = ev.startDate || ev.eventDates?.startDate || "";
      const startTime = ev.startTime || ev.eventDates?.startTime || "";
      const location = ev.location || ev.eventDates?.registrationOpenDate || "";

      // Link to Neon event detail page — not the registration form
      // Neon event detail URL pattern: https://{orgId}.z2systems.com/np/clients/...
      // ev.url is returned by some versions of the API; fall back to nothing
      const url = ev.url || ev.eventUrl || null;

      const nameHtml = url
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`
        : name;

      const metaHtml = startDate
        ? `<p class="ne-meta">${formatDate(startDate, startTime)}</p>`
        : "";

      const locationHtml = location
        ? `<p class="ne-location">${location}</p>`
        : "";

      return `
        <li class="ne-item">
          <p class="ne-name">${nameHtml}</p>
          ${metaHtml}
          ${locationHtml}
        </li>
      `;
    });

    container.innerHTML = `<ul class="ne-list">${items.join("")}</ul>`;
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    injectStyles();

    const apiUrl = container.dataset.apiUrl;
    if (!apiUrl) {
      container.innerHTML = `<p class="ne-error">events-widget: data-api-url is required.</p>`;
      return;
    }

    container.innerHTML = `<p class="ne-loading">Loading events…</p>`;

    // Build query string from data attributes
    const query = new URLSearchParams();
    if (container.dataset.tags) query.set("tags", container.dataset.tags);
    if (container.dataset.startDate) query.set("startDate", container.dataset.startDate);
    if (container.dataset.limit) query.set("limit", container.dataset.limit);

    try {
      const response = await fetch(`${apiUrl}?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = await response.json();
      render(container, data.events || []);
    } catch (err) {
      console.error("events-widget error:", err);
      container.innerHTML = `<p class="ne-error">Could not load events. Please try again later.</p>`;
    }
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();