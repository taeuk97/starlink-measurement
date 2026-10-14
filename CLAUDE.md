# Starlink Internet Measurement Platform

## Purpose

A web platform where general users and researchers can see **real network measurement results** from Starlink satellite internet in a simple, intuitive way.

This is a **Measurement Dashboard**, not an academic paper showcase site. Data and charts come first; long explanatory text, publication lists, and decorative sections come second (or not at all).

Metrics the site is expected to show in the future:

- Latency (RTT)
- Throughput (download / upload)
- Packet Loss
- Measurement time and current/most recent measurement status
- Network performance changes over time

> **No measurement data exists yet.** Never invent, simulate, or hardcode numbers that look like real results. Display a metric only when real data is provided. Until then, use clear empty states (e.g. "No data available yet"). If placeholder/sample data is ever needed for layout work, it must be explicitly labeled as sample data on screen and kept out of production builds.

## System Separation

| Role | Machine | In scope now? |
|------|---------|---------------|
| Website development & maintenance (Claude Desktop, Claude Code) | This Windows PC | **Yes** |
| Starlink network measurement | Separate Mini PC | No |
| Mini PC connection, measurement programs, data automation/pipelines | — | No |

- This repository holds the **website only**.
- Do not write measurement scripts, collectors, schedulers, or Mini PC integration code unless explicitly asked.
- When data integration is introduced later, the website should consume data from a simple, documented static format (e.g. JSON/CSV files in a `data/` folder). Define that contract in this file before building against it.

## Current Phase

**Phase 1 — First website version deployed (empty states, awaiting data).**

- The first version of the dashboard (`index.html`, `css/`, `js/`, `data/`, `assets/`) was approved by the user and committed. It shows empty states only; no measurement data exists yet.
- Git is connected: branch `main`, remote `origin` = https://github.com/taeuk97/starlink-measurement.git.
- **GitHub Pages:** live at https://taeuk97.github.io/starlink-measurement/ — source "Deploy from a branch", `main` / `(root)`, built by GitHub's default "pages build and deployment" workflow (first deployed 2026-10-12). Every push to `main` redeploys the public site.
- `.claude/settings.local.json` is machine-local and must not be committed.
- Local preview: `.claude/launch.json` config `static-site` (`python -m http.server 8000`).
- Do not commit, push, or deploy unless the user explicitly asks.

## Development Principles

- **Stack:** Plain HTML, CSS, and JavaScript. No build step by default, so the site can be served directly by GitHub Pages. Add a framework or bundler only with the user's agreement.
- **Charts:** Use a single, lightweight charting library loaded from a pinned CDN version (or vendored), chosen once and used consistently.
- **Language:** All user-facing interface text is in **English**. Conversation with the user may be in Korean.
- **Design:**
  - Clean, minimal, dashboard-first layout
  - Professional but understandable by non-experts (plain-language labels, units always shown, short tooltips for terms like RTT)
  - Data and charts are the focus; minimize decoration and unnecessary complexity
  - Responsive: works on desktop and mobile (mobile-first CSS, no horizontal scroll)
  - Accessible: sufficient color contrast, not relying on color alone, semantic HTML
- **Honesty of data:** Always show the measurement timestamp and data source context next to values. Show stale/missing data states clearly.
- **Code style:** Small, readable files; relative paths only (GitHub Pages friendly); no secrets or private IPs/hostnames of the Mini PC in the repo.

## Suggested Structure (when website work begins)

```
/
├── index.html          # Main dashboard
├── css/                # Stylesheets
├── js/                 # Dashboard logic & chart rendering
├── data/               # Measurement data files (only real data)
├── assets/             # Icons/images (minimal)
└── CLAUDE.md
```

This is a guideline, not yet created. Adjust with the user when work starts.

## Working Rules for Future Tasks

1. Use the `starlink-site-builder` subagent (`.claude/agents/starlink-site-builder.md`) for website design, development, and maintenance tasks.
2. Make changes from natural-language instructions in small, reviewable steps; summarize what changed and which files were touched.
3. Preview changes locally in a browser before reporting them as done; check both desktop and mobile widths.
4. Do not add features outside the current phase scope without asking.
5. Git/GitHub/GitHub Pages: only when the user explicitly requests it. When it happens, record the repo URL and deployment details in this file.
6. Keep this file up to date when the phase, data format, or structure changes.

## Git & Deployment Approval Rules

These rules apply to the main session and to every agent, including `starlink-site-builder`.

1. AI agents may analyze, write, and modify website files and test them locally without asking.
2. Any action that affects GitHub — `git commit`, `git push`, GitHub Pages deployment, or changing GitHub repository settings — requires the user's approval **before** it is run.
3. Before asking for approval, show the user the list of changed files and a summary of the main changes.
4. Do not run a commit, push, or deployment until the user explicitly approves it.
5. Approval applies only to the action it was given for. Never reuse an earlier approval for a new commit, push, or deployment.
6. If the user asks for changes to specific files only, stay within that scope and do not touch other files.

Pushing to `main` redeploys the public site immediately, so a push is always treated as a deployment.

## Data Contract (draft)

> Draft, not final. Agree on it with the user before any measurement pipeline writes these files.

The site reads two static JSON files with relative paths. If a file is missing, cannot be fetched (e.g. when the page is opened via `file://`), is invalid, or has `null` values, the site shows its empty states. Files in `data/` must contain **real measurements only**. The placeholder files ship with `null`s and empty arrays and contain no numbers.

General rules:
- Timestamps are ISO 8601 in UTC with a `Z` suffix, e.g. `2026-10-12T14:00:00Z`. The UI displays them in KST and UTC.
- Units are encoded in the field name: `_ms` = milliseconds, `_mbps` = megabits per second, `_pct` = percent (0–100).
- A metric that was not measured is `null`. Never use `0` for "no data".
- `schema_version` is an integer, currently `1`.

### `data/latest.json` — most recent measurement

| Field | Type | Meaning |
|-------|------|---------|
| `schema_version` | int | `1` |
| `status` | string | `"no_data"` \| `"ok"` \| `"error"` |
| `status_message` | string \| null | Short human-readable note (shown when `status` is `"error"`) |
| `location` | string | `"KAIST, Daejeon, South Korea"` |
| `measured_at` | string \| null | UTC time of the measurement. If `null`, all values are treated as missing |
| `rtt_ms` | number \| null | Latency (round-trip time), ms |
| `download_mbps` | number \| null | Download throughput, Mbps |
| `upload_mbps` | number \| null | Upload throughput, Mbps |
| `packet_loss_pct` | number \| null | Packet loss, % |

The UI marks data as "may be outdated" when `measured_at` is older than 3 hours (`STALE_AFTER_HOURS` in `js/app.js`).

### `data/history.json` — time series

| Field | Type | Meaning |
|-------|------|---------|
| `schema_version` | int | `1` |
| `status` | string | `"no_data"` \| `"ok"` |
| `location` | string | `"KAIST, Daejeon, South Korea"` |
| `generated_at` | string \| null | UTC time the file was written |
| `points` | array | Measurements, any order (the UI sorts by `t`) |

Each item in `points` has `t` (UTC timestamp, required) and the same metric fields as `latest.json`: `rtt_ms`, `download_mbps`, `upload_mbps`, `packet_loss_pct`. Any of these may be `null`. The range selector filters `points` to the last 24 hours, 7 days, or 30 days.

Open questions: measurement interval, retention (how many days `history.json` keeps), the test server and method behind each metric, and whether to split history into per-range files if the file grows too large.
