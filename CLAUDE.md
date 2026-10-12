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

**Phase 0 — Agent/environment setup only.**

- No website code has been written yet.
- No Git repository, GitHub remote, or GitHub Pages deployment exists yet.
- Do not run `git init`, create a GitHub repo, push, or deploy unless the user explicitly asks.

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
