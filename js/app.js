/*
 * KAIST–ACAI Starlink Monitor — dashboard logic
 *
 * Shared by every dashboard page (index.html = Starlink, terrestrial.html =
 * terrestrial baseline). Each page picks its data files with attributes on
 * <body>: data-latest="..." and data-history="..." (relative paths). Without
 * them it loads data/latest.json and data/history.json (see "Data Contract
 * (draft)" in CLAUDE.md). Any missing file, fetch failure (e.g. opening the
 * page via file://), invalid JSON, or null value falls back to the empty
 * states that are already in the HTML. This file never invents values.
 */
(function () {
  "use strict";

  var DATA_LATEST = document.body.getAttribute("data-latest") || "data/latest.json";
  var DATA_HISTORY = document.body.getAttribute("data-history") || "data/history.json";
  var STALE_AFTER_HOURS = 3; // older measurements are flagged as outdated

  var RANGES = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 }; // hours

  // Overview cards: field in latest.json -> decimal places shown
  var CARD_DECIMALS = {
    rtt_ms: 1,
    download_mbps: 1,
    upload_mbps: 1,
    packet_loss_pct: 2
  };

  /*
   * History chart metrics (config-driven). Each series maps to a field of
   * history.json points. `style` (solid/dashed) is used for the legend and
   * should be used for the chart lines too, so series never differ by color alone.
   */
  var CHART_METRICS = {
    rtt: {
      title: "Latency (RTT)",
      unit: "ms",
      series: [{ key: "rtt_ms", label: "RTT", style: "solid" }]
    },
    throughput: {
      title: "Throughput (Download / Upload)",
      unit: "Mbps",
      series: [
        { key: "download_mbps", label: "Download", style: "solid" },
        { key: "upload_mbps", label: "Upload", style: "dashed" }
      ]
    },
    loss: {
      title: "Packet Loss",
      unit: "%",
      series: [{ key: "packet_loss_pct", label: "Packet loss", style: "solid" }]
    }
  };

  var state = { history: [], range: "24h", metric: "rtt" };

  /* ---------- helpers ---------- */

  function fetchJson(path) {
    if (!window.fetch || location.protocol === "file:") return Promise.resolve(null);
    return fetch(path, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  }

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  function parseTime(iso) {
    if (typeof iso !== "string" || !iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // "2026-10-12 23:00 KST (14:00 UTC)"
  function formatTime(d) {
    var kst = new Date(d.getTime() + 9 * 3600 * 1000);
    return kst.getUTCFullYear() + "-" + pad(kst.getUTCMonth() + 1) + "-" + pad(kst.getUTCDate()) +
      " " + pad(kst.getUTCHours()) + ":" + pad(kst.getUTCMinutes()) + " KST (" +
      pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " UTC)";
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ---------- overview cards + status ---------- */

  function renderLatest(latest) {
    var measuredAt = latest ? parseTime(latest.measured_at) : null;

    Object.keys(CARD_DECIMALS).forEach(function (key) {
      var card = document.querySelector('.metric-card[data-metric="' + key + '"]');
      if (!card) return;
      var v = latest && measuredAt ? latest[key] : null;
      var valueEl = card.querySelector("[data-value]");
      var stateEl = card.querySelector("[data-state]");
      if (isNum(v)) {
        card.classList.remove("is-empty");
        valueEl.textContent = v.toFixed(CARD_DECIMALS[key]);
        stateEl.textContent = "Measured " + formatTime(measuredAt);
      } else {
        card.classList.add("is-empty");
        valueEl.textContent = "--";
        stateEl.textContent = "No data available";
      }
    });

    renderStatus(latest, measuredAt);
  }

  function renderStatus(latest, measuredAt) {
    var badge = document.getElementById("status-badge");
    var symbol = badge.querySelector(".status-symbol");
    var kind = "pending";
    var text = "Awaiting measurement data";

    if (measuredAt) {
      var ageHours = (Date.now() - measuredAt.getTime()) / 3600000;
      if (latest.status === "error") {
        kind = "error";
        text = latest.status_message || "Measurement issue reported";
      } else if (ageHours > STALE_AFTER_HOURS) {
        kind = "stale";
        text = "Data may be outdated (no update in " + STALE_AFTER_HOURS + "+ hours)";
      } else {
        kind = "ok";
        text = "Recent measurement available";
      }
      setText("last-updated", formatTime(measuredAt));
    } else {
      setText("last-updated", "--");
    }

    badge.setAttribute("data-kind", kind);
    // Symbol + text so status never relies on color alone
    symbol.textContent = { pending: "○", ok: "✓", stale: "!", error: "!" }[kind];
    setText("status-text", text);
  }

  /* ---------- history chart ---------- */

  function cleanHistory(history) {
    var pts = history && Array.isArray(history.points) ? history.points : [];
    return pts
      .map(function (p) { return p && { t: parseTime(p.t), raw: p }; })
      .filter(function (p) { return p && p.t; })
      .sort(function (a, b) { return a.t - b.t; });
  }

  function pointsInRange(rangeKey) {
    var since = Date.now() - RANGES[rangeKey] * 3600000;
    return state.history.filter(function (p) { return p.t.getTime() >= since; });
  }

  /*
   * CHART HOOK — draw the selected metric into `area`.
   *   metric: one entry of CHART_METRICS ({ title, unit, series: [{ key, label, style }] })
   *   points: [{ t: Date, raw: { rtt_ms, download_mbps, upload_mbps, packet_loss_pct } }]
   * No chart library is loaded yet. When real data arrives, pick one library
   * (pinned CDN version), load it in index.html, and draw one line per
   * metric.series entry here (x = p.t, y = p.raw[series.key], null = gap).
   */
  function renderChart(area, metric, points) {
    var usable = points.filter(function (p) {
      return metric.series.some(function (s) { return isNum(p.raw[s.key]); });
    });

    var msg = document.createElement("p");
    msg.className = "chart-empty";
    if (usable.length === 0) {
      msg.textContent = state.history.length ? "No measurements in this time range" : "Awaiting measurement data";
    } else {
      msg.textContent = usable.length + " measurements in range. Chart display coming soon.";
    }
    area.replaceChildren(msg);
  }

  function renderLegend(metric) {
    var legend = document.getElementById("chart-legend");
    legend.replaceChildren();
    legend.hidden = metric.series.length < 2;
    if (legend.hidden) return;
    metric.series.forEach(function (s) {
      var li = document.createElement("li");
      var line = document.createElement("span");
      line.className = "legend-line";
      line.setAttribute("data-style", s.style);
      line.setAttribute("aria-hidden", "true");
      li.appendChild(line);
      li.appendChild(document.createTextNode(s.label + " (" + s.style + " line)"));
      legend.appendChild(li);
    });
  }

  function renderHistory() {
    var metric = CHART_METRICS[state.metric];
    setText("chart-title", metric.title);
    setText("chart-unit", "Unit: " + metric.unit);
    renderLegend(metric);
    renderChart(document.getElementById("chart-area"), metric, pointsInRange(state.range));
  }

  // Wire a group of aria-pressed buttons; onSelect(value) runs on click.
  function wireSegmented(selector, attr, onSelect) {
    var buttons = document.querySelectorAll(selector);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        onSelect(btn.getAttribute(attr));
      });
    });
    return buttons;
  }

  function setupMetricSelector() {
    wireSegmented("[data-chart-metric]", "data-chart-metric", function (key) {
      if (!CHART_METRICS[key]) return;
      state.metric = key;
      renderHistory();
    });
  }

  function setupRangeSelector() {
    var hasData = state.history.length > 0;
    var buttons = wireSegmented("[data-range]", "data-range", function (key) {
      state.range = key;
      renderHistory();
    });
    buttons.forEach(function (btn) { btn.disabled = !hasData; });

    setText("range-note", (hasData
      ? "Choose the time range shown in the chart."
      : "Time range options activate once measurement data is connected.") + " Times in KST (UTC+9).");
  }

  /* ---------- setup photo ---------- */

  function setupPhoto() {
    var fig = document.getElementById("setup-photo");
    var src = fig && fig.getAttribute("data-photo-src");
    if (!src) return; // placeholder stays

    var img = new Image();
    img.alt = fig.getAttribute("data-photo-alt") || "";
    img.decoding = "async";
    img.onload = function () {
      var frame = fig.querySelector(".photo-frame");
      frame.replaceChildren(img);
    };
    img.src = src; // on error the placeholder simply remains
  }

  /* ---------- init ---------- */

  function init() {
    renderLatest(null); // guaranteed empty state first
    setupPhoto();
    setupMetricSelector(); // works without data: switches title, unit, legend
    renderHistory();

    Promise.all([fetchJson(DATA_LATEST), fetchJson(DATA_HISTORY)]).then(function (res) {
      renderLatest(res[0]);
      state.history = cleanHistory(res[1]);
      setupRangeSelector();
      renderHistory();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
