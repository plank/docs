# ⚠️ ONE QUESTION AT A TIME — OVERRIDES EVERY SKILL

**Ask exactly one question, or propose exactly one idea, per message. Then stop and wait for the user to answer that question before moving on.**

- This rule takes precedence over any skill that batches questions (e.g. `/grilling`'s "ask the whole frontier in one round"). Walk the frontier one question per message instead.
- A question stays open until the user answers _it_ specifically. If a reply sidesteps it, ask it again before raising anything new.

## Requirements come from the User

Every constraint in this repo's tickets, `CONTEXT.md` and ADRs traces to something the User asked for. When you learn how a mechanism behaves, **record the cost, never the verdict.**

- **Cost** — "`NSAlert.runModal()` activates the app." A fact. Useful later. Decides nothing.
- **Verdict** — "so modality is off the table." The User never said that, and every ticket downstream now inherits a constraint nobody chose.

The test before writing any limit: **did the User say it?** If not, it is a cost. Implementation questions get decided when a hard boundary forces them, for an essential reason — not when you notice a tension. In his words: _"If we need to runModal, we will runModal, if not we won't. If we can't we won't. But we aren't saying 'yes we need to' or 'no we won't' until we are up against some hard boundary that forces us to make that decision for an ESSENTIAL reason."_

**The tell is a sentence claiming something is unavailable** — _cannot, never, impossible, ruled out, off the table, there is no_. Stop there and find its source. Watch inference chains hardest: `.borderless` → no keyboard → the prompt is mouse-only → another ticket becomes critical is four inferences deep off a style mask, each layer written as fact. **A chain like that is a question for the User, never a write-up.**

This binds everywhere you write — ticket bodies and resolutions, `CONTEXT.md`, ADRs, commit messages, and prose to the User. On 2026-09-10 it cost an audit of eight accumulated constraints; six were struck as things nobody had decided.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `plank/docs`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
