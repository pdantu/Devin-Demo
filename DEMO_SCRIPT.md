# Demo Script — Devin Orchestrator (5 min Loom)
**Audience:** VP of Engineering + senior ICs  
**Goal:** Show an event-driven system that automatically remediates GitHub issues with Devin, end-to-end

---

## 0 · Setup (before recording)
- Backend running: `uvicorn main:app --reload` (port 8000)
- Frontend running: `npm run dev` (port 5173)
- ngrok running: `ngrok http 8000` (webhook URL registered in GitHub)
- Dashboard open in browser, light mode, clean slate (archive any old sessions)
- GitHub repo open in another tab

---

## 1 · Problem Framing (0:00 – 0:45)

> "Every engineering team has the same problem: a backlog full of issues they know need to get fixed — security vulnerabilities, deprecated method calls, tech debt — that never make it into a sprint because they're unglamorous and time-consuming. They sit in GitHub. Forever.
>
> At my last role, I'd dread seeing a Slack message that a farm break needed investigation, or that the weekly security scan had flagged another batch of issues. Not because the fixes were hard — most weren't — but because they were context-switching, soul-draining interruptions. You'd spend two hours tracking down a flaky test or renaming deprecated calls across a massive codebase, and at the end of it you had nothing to show for it strategically. It just had to get done.
>
> The codebase I'm using to illustrate this is Apache Superset — one of the most complex open-source Python projects out there. 800,000+ lines of code across hundreds of modules: a Flask/SQLAlchemy backend, a React + TypeScript frontend, a plugin architecture, async tasks, database connectors, a full test suite. The kind of codebase where even a senior engineer needs days just to get oriented before they can confidently touch anything.
>
> Something as 'simple' as replacing all deprecated `logger.warn()` calls with `logger.warning()` means touching 50+ files across multiple packages — and you need enough context to not accidentally break something adjacent. That's a half-day of careful work for an engineer who knows the codebase. For one who doesn't, it's longer.
>
> The question I wanted to answer: can we build a system that automatically remediates these issues — with enough contextual understanding to make production-quality fixes — without a human ever writing the code or opening the PR?
>
> That's what this dashboard is. And I want to be upfront: this was built specifically to show how Devin works as a programmable platform. It's not a product — it's a demonstration that Devin has a full API, and you can build any workflow on top of it, integrated directly into how your team already operates."

**What to show:** Dashboard — point out the three Kanban columns.

---

## 2 · Webhook Trigger Demo (0:45 – 1:45)

> "The first trigger mode is event-driven. I've registered a GitHub webhook so that the moment a new issue is created, GitHub POSTs to my backend — routing through ngrok to expose the local server — which immediately spins up a Devin session."

**Live actions:**
1. Switch to GitHub tab → create a new issue with a `security` label
2. Switch back to dashboard — **within seconds** a card appears in **In Progress**
3. Point to the session card: title, category badge, status dot

> "No human in the loop. Issue created → Devin working. That latency is under 5 seconds."

---

## 3 · Parallel Sessions (1:45 – 2:15)

> "Now here's where it gets interesting. Devin isn't limited to one issue at a time. I can dispatch N sessions in parallel — each one is a fully independent agent working concurrently."

**Live actions:**
1. Open Issues column is visible — click **Select All** (show 5 issues selected)
2. Click **Remediate**
3. Open Issues column collapses — In Progress fills with 5 session cards simultaneously

> "Five issues, five agents, all running in parallel. This is the core value prop — a team of one just became a team of many."

---

## 4 · How Devin Works Behind the Scenes (2:15 – 3:00)

> "While Devin's cooking, let me walk you through how I set it up to be effective — not just fast."

**Key points to cover:**

- **DeepWiki** — "Before writing a single line of orchestration code, I used Devin's DeepWiki to deeply index the Apache Superset repo. 800k+ lines — DeepWiki read all of it, mapped the architecture, identified the key modules, dependency chains, testing patterns. The kind of ramp-up a new engineer would spend two weeks on, DeepWiki handled in minutes. That indexing became the foundation for everything Devin does — it's not guessing at the codebase structure, it *knows* it."

- **Knowledge Notes** — "I distilled that DeepWiki analysis into a knowledge note — a persistent context document injected into every single Devin session. Architecture overview, key directories, how tests are structured, gotchas to watch out for in Superset's plugin system. Every agent starts with the same deep codebase context a senior Superset engineer would have. Without this, you'd get LLM-quality guesses. With it, you get engineer-quality judgment."

- **Playbooks** — "Playbooks encode *how* to approach a category of work. My tech-debt playbook says: identify all affected call sites, make the rename, run the linter, verify no regressions, open a PR with a clear description linking back to the issue. That's exactly what a careful engineer would do — now it's repeatable and automatic across every session."

> "So when Devin picks up an issue in an 800,000-line codebase, it's not flying blind. It has the context, the process, and the judgment. That's the difference between a toy demo and something you'd actually ship."

---

## 5 · Session Completes → PR Created (3:00 – 3:30)

> "Sessions complete and move to the Completed column automatically. The PR link is right on the card."

**Live actions:**
1. Point to a completed session card — show the **PR** link badge
2. Click the PR link — show the actual GitHub PR Devin opened
3. Scroll the PR: commit message, changed files, description

> "Devin opened the PR, wrote the description, linked it back to the issue — completely autonomous. And critically: it navigated a codebase it had never been explicitly taught, found every affected file, made the change correctly, and didn't break anything adjacent. That's not a regex replace — that's judgment."

---

## 6 · Insights (3:30 – 4:00)

> "After a session completes, I can generate AI insights — a structured summary of what Devin did."

**Live actions:**
1. Click **Insights** on a completed session card
2. Insights panel slides open — point out: Timeline, Issues Encountered, Action Items, Suggested Prompt
3. Highlight one action item: "This tells me exactly what to improve for the next run"

> "This is post-run observability — not just 'did it work' but *why* and *what to do better*."

---

## 7 · Code Walkthrough (4:00 – 4:30)

> "Let me show you the actual code — because I think that's where the real story is. This isn't a lot of glue."

**Switch to IDE. Walk through these files in order:**

**`backend/main.py`** — the FastAPI app
> "The backend is FastAPI — Python's modern async web framework. I chose it because it's fast, it's async-native which matters when you're making outbound API calls to Devin, and the router structure keeps things clean. You can see the app mounts two routers — one for GitHub events, one for Devin — and serves the built React frontend as static files. The whole server is one `uvicorn` process."

**`backend/api/github_client.py`** — the webhook handler
> "This is the entry point. GitHub fires a POST, we verify the HMAC signature, check it's an 'issues opened' event, and immediately call `create_session`. The whole trigger is about 30 lines."

**`backend/api/devin_client.py` → `create_session`**
> "Here's the session creation. We pass the issue title and body as the prompt, attach the knowledge note ID so Devin already knows the Superset codebase, and bind the playbook for this issue's category — security, deprecated API, or tech debt. That's the entire integration with the Devin API."

**`backend/api/devin_client.py` → `get_sessions` / `get_insights`**
> "Everything else is just polling and proxying. The frontend polls `/sessions` every 15 seconds. When a session closes, it hits the insights endpoint and gets back a structured analysis. There's no custom ML here — it's all Devin's API."

**`frontend/src/components/SessionCard.jsx`** — the card component
> "On the frontend, each card manages its own lifecycle. When you close a session, it waits for insights to finish generating, then pops open the panel automatically. When a PR gets merged on GitHub, the next poll picks up the state change and the card auto-generates insights. All of this is just React state — no backend changes needed."

> "The entire backend is under 300 lines of Python. The frontend is a standard React app. The complexity is Devin's — not mine. That's the point."

---

## 8 · Why Devin, Why Now (4:20 – 4:45)

> "Why couldn't you do this with a script or a simpler LLM call?
>
> A script can grep for a pattern and replace it. But in an 800,000-line codebase, every change has context: is this the logger from the standard library or a custom wrapper? Are there tests that assert on the old behavior? Are there type annotations that need updating? Are there docs that reference it? A script doesn't know. A one-shot LLM call doesn't have the environment to find out.
>
> Devin has a real dev environment — it can grep, read files, run the test suite, check the linter, follow import chains across packages. It has persistent context through the session. It has the knowledge note telling it how Superset is structured. And it has the judgment to handle the unexpected edge cases that *always* come up in a real codebase.
>
> That's the gap. And that's why this produces PRs you'd actually merge — not hallucinated patches you have to throw away."

---

## 9 · Next Steps / Customer Engagement (4:45 – 5:00)

> "If I were taking this into a real customer engagement, here's how I'd approach it:
>
> **Week 1 — Codebase onboarding.** Start with DeepWiki to deeply index the customer's repo. Use that output to draft the knowledge note — architecture overview, key directories, patterns, anti-patterns. This is the most important week. Everything downstream depends on Devin actually understanding the codebase.
>
> **Week 1-2 — Playbook calibration.** Run a small batch of real issues — 5 to 10 — manually review every PR Devin opens. Where it goes wrong, update the playbook. Where the prompt is underspecified, tighten it. This iteration loop is fast, and the quality compounds quickly.
>
> **Week 2 — Tighter triggers.** Replace manual GitHub labels with a real scanner — Snyk, SonarQube, Semgrep — as the webhook source. Now Devin is acting on verified, severity-ranked vulnerabilities instead of hand-curated issues. That's when it becomes genuinely autonomous.
>
> **Ongoing — Close the PR loop.** Wire code review feedback back into the session. When a reviewer comments on Devin's PR, that comment gets sent back as a message and Devin iterates. That turns a one-shot agent into a collaborative one.
>
> **Guardrails throughout.** ACU budget per session category, auto-terminate if exceeded, Slack alerts for failures, weekly insights rollup so the team can see what categories of issues Devin is actually handling well versus where human review is still needed.
>
> The thing I'd emphasize to any team: the setup investment is front-loaded. Once the knowledge note and playbooks are calibrated, the marginal cost of remediating the next 100 issues is basically zero."

---

## Tips
- Keep cursor movements deliberate — hover over things as you name them
- Don't rush the parallel session launch — let the audience watch the cards appear
- If a session is still running during section 5, use a pre-completed one for the PR demo
- The Insights panel is the "wow moment" — pause there
- For the code walkthrough, have all four files open in tabs beforehand — don't navigate live
- When showing `create_session`, scroll to the function body and highlight the `knowledge_id` and `playbook_id` lines — that's the key detail to land
