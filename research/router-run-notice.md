# Research: how a failing or stopped "router run" gets noticed

Context: `plank/docs` is public and has a GitHub Actions workflow triggered by `on: schedule` (at most daily) and by `workflow_dispatch`. This file records what GitHub documents (and what can be observed) about failure notifications, the 60-day inactivity disable, reading run state without a token, badges, and schedule reliability. It records facts and costs, not recommendations.

All sources accessed **2026-09-13**. How much to trust each claim:

- **[DOC]**: GitHub Docs, quoted verbatim. Raw page markdown was fetched through `https://docs.github.com/api/article/body?pathname=...`.
- **[OBSERVED]**: a live request made on 2026-09-13 against `api.github.com` / `github.com`, with no token.
- **[COMMUNITY]**: GitHub Community discussions or issues. Secondary evidence, and not from GitHub staff unless stated.
- **[THIRD-PARTY]**: non-GitHub sites or READMEs. Lowest trust.
- **[INFERRED]**: my reasoning from the above. Not stated anywhere.

## Sources

| Short name | URL |
|---|---|
| Events | https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule |
| Events (GHEC) | https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/events-that-trigger-workflows |
| Run notifications | https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs |
| Actions notification settings | https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications |
| Configuring notifications | https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications |
| About notifications | https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications |
| Disable/enable | https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows |
| Manually run | https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow |
| REST workflows | https://docs.github.com/en/rest/actions/workflows |
| REST workflow runs | https://docs.github.com/en/rest/actions/workflow-runs |
| Fine-grained PAT permissions | https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens |
| REST authentication | https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api |
| REST rate limits | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api |
| Hosted runners | https://docs.github.com/en/actions/reference/runners/github-hosted-runners |
| Status badge | https://docs.github.com/en/actions/how-tos/monitor-workflows/add-a-status-badge |
| Actions limits | https://docs.github.com/en/actions/reference/limits |
| Archiving | https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories |

---

## Q1. Who is notified when a scheduled run fails, and through which channel

### Recipient: two GitHub Docs pages disagree

- **[DOC] Events, `schedule` section, "`actor` for scheduled workflows":** "Notifications for scheduled workflows are sent to the user who last modified the cron syntax in the workflow file."
- **[DOC] Run notifications:** "Notifications for scheduled workflows are sent to the user who initially created the workflow."
  - "If a different user updates the cron syntax, in the `schedule` event in the workflow file, subsequent notifications will be sent to that user instead."
  - "If a scheduled workflow is disabled and then re-enabled, notifications will be sent to the user who re-enabled the workflow rather than the user who last modified the cron syntax."

The two agree once someone other than the creator has edited the cron line. They differ in two cases. The first is before any such edit: "initially created the workflow" versus "last modified the cron syntax". The second is after a disable and re-enable: the Events page does not mention re-enabling.

### Related `actor` rules (Events page)

- **[DOC]** "Certain repository events change the `actor` associated with the workflow. For example, a user who changes the default branch of the repository, which changes the branch on which scheduled workflows run, becomes `actor` for those scheduled workflows." This sentence was added in github/docs Repo sync PR #37272, merged 2025-04-02 (https://github.com/github/docs/pull/37272/files).
- **[DOC]** "For a deactivated scheduled workflow, if a user with `write` permissions to the repository makes a commit that changes the `cron` schedule on the workflow, the workflow will be reactivated, and that user will become the `actor` associated with any workflow runs."
- **[INFERRED]** No page says whether the notification recipient is always the same user as the run's `actor`. For example, it is undocumented whether a user who changes the default branch also becomes the notification recipient.

### Channel and per-user settings

- **[DOC] Run notifications:** "If you enable email or web notifications for GitHub Actions, you'll receive a notification when any workflow runs that you've triggered have completed. The notification will include the workflow run's status (including successful, failed, neutral, and canceled runs). You can also choose to receive a notification only when a workflow run has failed."
- **[DOC] Actions notification settings:** "For repositories that are set up with GitHub Actions and that you are watching, you can choose how you want to receive workflow run updates."
  1. "On the 'Notification settings' page, under 'System', then under 'Actions', select the **Don't notify** dropdown menu."
  2. "To opt in to web notifications, from the dropdown menu, select 'On GitHub.' To opt in to email notifications, from the dropdown menu, select 'Email.'"
  3. "Optionally, to only receive notifications for failed workflow runs, from the dropdown menu, select 'Only notify for failed workflows', then click **Save**."
- **[DOC] Configuring notifications:**
  - On email routing: "Depending on the organization that owns the repository, you can also send notifications to different email addresses. Your organization may require the email address to be verified for a specific domain."
  - The same page lists "workflow runs updates on repositories set up with GitHub Actions" as a notification type.
- **[DOC] About notifications:** "You can also choose to automatically watch all repositories that you have push access to, except forks." Also, "Not disabled automatic watching for repositories or teams you've joined in your notification settings. This setting is enabled by default."
- **Costs and facts:**
  - Delivery depends entirely on one user's personal settings. Email versus web, failures-only, and whether Actions notifications are on at all are chosen per user.
  - The settings doc scopes Actions notifications to repositories "that you are watching". **[INFERRED]** A recipient who has unwatched `plank/docs` may get nothing. The doc wording implies this but does not state it for scheduled runs specifically.
  - The step text implies the dropdown can read "Don't notify". GitHub Docs do not state the default value for new accounts.

### When the recipient user leaves the org or loses access

- **[DOC] Events, note under "`actor` for scheduled workflows":**
  - "For an enterprise with Enterprise Managed Users, triggering a scheduled workflow requires that the status of the `actor` user account associated with the workflow is currently active (i.e. not suspended or deleted)."
  - "Similarly, for an enterprise without Enterprise Managed Users, removing a user from an organization will not prevent scheduled workflows which had that user as their `actor` from running."
  - "Thus, the *user account's* status, in both Enterprise Managed User and non-Enterprise Managed User scenarios, is what's important, *not* the user's *membership status* in the organization where the scheduled workflow is located."
  - The Enterprise Cloud version of the page carries the same text.
- **[COMMUNITY] Earlier docs said the opposite.** Discussion #148632 (2025-01-07) quotes the Events page as then saying: "When the last user to commit to the cron schedule of a workflow is removed from the organization, the scheduled workflow will be disabled." That sentence is **not** on the current github.com or GHEC page. https://github.com/orgs/community/discussions/148632
- **[COMMUNITY]** Discussion #109354 (2024-02-20) reports that scheduled workflows stopped after the last committer's account was **deleted**. https://github.com/orgs/community/discussions/109354
- **Undocumented:**
  - Whether a user removed from `plank` still receives failure notifications for `plank/docs`, a public repo they could still watch.
  - Whether GitHub moves notifications to anyone else when that happens.
  - **[INFERRED]** Because the repo is public, a removed member keeps read access. Delivery then depends on their watch and notification settings. This is not verified.

### Ways to change the recipient

- **[DOC]** The documented ways are:
  - a different user commits a change to the cron syntax (both pages);
  - disabling and then re-enabling the workflow, after which "notifications will be sent to the user who re-enabled the workflow" (Run notifications only).
- **[DOC]** Changing the default branch changes the `actor`. The docs do not say it changes the notification recipient.
- **[DOC]** No documented setting adds recipients or sends a scheduled run's notification to a team or list.
- **[COMMUNITY]** Discussion #25351 (2020-06-11) asked "How can I specify a list of users that get notified when a cron triggered workflow fails?" The non-staff answer calls it "by designed" and suggests a workflow step that sends email, such as the `dawidd6/action-send-mail` action. https://github.com/orgs/community/discussions/25351

## Q2. Who is notified when a `workflow_dispatch` run fails

- **[DOC] Run notifications:** "you'll receive a notification when any workflow runs that you've triggered have completed". The same per-user settings from Q1 apply: email, web, failures-only, and the watching scope. The `workflow_dispatch` section of the Events page says nothing about notifications.
- **[INFERRED]** For a manual dispatch, "you've triggered" means the user who dispatched the run from the UI, `gh`, or the API. The run object carries `triggering_actor` (seen in the [OBSERVED] response in Q4).
- **[DOC] Manually run:** "Write access to the repository is required to perform these steps."
- **[DOC] REST workflows / Fine-grained PAT permissions:**
  - `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` needs the classic `repo` scope ("OAuth tokens and personal access tokens (classic) need the repo scope to use this endpoint").
  - With fine-grained tokens it needs **Actions: write**.
- **Undocumented:** who, if anyone, is notified when a dispatch is made by a GitHub App, a bot, or `GITHUB_TOKEN`.

## Q3. The 60-day inactivity disable

### What the docs say

- **[DOC] Events:** "In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."
- **[DOC] Disable/enable (warning callout):** "To prevent unnecessary workflow runs, scheduled workflows may be disabled automatically. When a public repository is forked, scheduled workflows are disabled by default. In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."

### What counts as "repository activity"

- **Undocumented.** No GitHub Docs page read here defines "repository activity". None says whether any of these count:
  - commits to the default branch;
  - pushes to other branches;
  - tags or releases;
  - issues, PRs or comments;
  - workflow runs themselves;
  - API calls.
- **[DOC]** One adjacent documented fact: a write-permission user's commit that **changes the cron schedule** reactivates a workflow that is already deactivated (see Q1).
- **[THIRD-PARTY]** `efrecon/gh-action-keepalive` says "Workflows will be automatically disabled by GitHub after 60 days of inactivity on the default branch." It keeps workflows alive by committing a date marker file to the default branch. https://github.com/efrecon/gh-action-keepalive
- **[THIRD-PARTY]** Blog posts found by search say "a push, a release, a PR merge" count and issue comments and stars do not. They cite no GitHub source. Not verified.
- **[THIRD-PARTY]** `PhrozenByte/gh-workflow-immortality` says force-enabling the workflow via the API resets "the workflow's inactivity counter". Per its README it needs a fine-grained PAT with Actions read/write or the classic `workflow` scope, and says `GITHUB_TOKEN` "lacks necessary permissions". https://github.com/PhrozenByte/gh-workflow-immortality
- **[COMMUNITY]** In discussion #184653 (2026-01-19) the poster says fetching from upstream into a fork re-activated workflows for another 60 days. https://github.com/orgs/community/discussions/184653

### Warning email before disabling

- **Undocumented in GitHub Docs.** No docs page read here mentions a warning email or its recipient.
- **[COMMUNITY]** Discussion #137768 (2024-09-04, filed as a bug report) quotes the email body: "Scheduled workflows are disabled automatically after 60 days of repository inactivity. [...] You can prevent `workflow` from being disabled on the workflows page." https://github.com/orgs/community/discussions/137768
  - The poster estimates the email arrives at about 53 days, 7 days before disabling.
  - A "continue running workflow" button appears on the workflow page only at about 58 days.
  - No staff reply.
- **[COMMUNITY]** Discussion #184653 (2026-01-19) quotes an email subject: "The 'CodeQL' workflow in jsoref/traefik will be disabled soon". https://github.com/orgs/community/discussions/184653
- **Undocumented:** who receives the warning email. **[INFERRED]** It is probably the same user as the scheduled-run notification recipient or `actor`, but no source confirms this.
- **Undocumented:** whether a second email is sent at the moment of disabling.

### What the Actions UI shows

- **[OBSERVED]** https://github.com/fischerscode/DockerFlutter/actions/workflows/build_updates.yaml is a public workflow whose API state is `disabled_inactivity`. Its page shows: "This scheduled workflow is disabled because there hasn't been activity in this repository for at least 60 days. Enable this workflow to resume scheduled runs." It has an **Enable workflow** button.
- **[COMMUNITY]** Discussion #184653 quotes the same banner text.

### Reading the disabled state via the REST API

- **[DOC] REST workflows:** the `state` field in the "List repository workflows" and "Get a workflow" responses is "required, string, enum: `active`, `deleted`, `disabled_fork`, `disabled_inactivity`, `disabled_manually`".
- **[DOC] REST workflows:** "Anyone with read access to the repository can use this endpoint. OAuth app tokens and personal access tokens (classic) need the repo scope to use this endpoint with a private repository."
- **[DOC] REST authentication:** "Many REST API endpoints require authentication or return additional information if you are authenticated." **[DOC] REST rate limits:** "You can make unauthenticated requests if you are only fetching public data."
- **[OBSERVED]** An unauthenticated `GET https://api.github.com/repos/fischerscode/DockerFlutter/actions/workflows` returned HTTP 200. It showed two workflows with `"state": "disabled_inactivity"` and two with `"state": "disabled_manually"`.
- **[OBSERVED]** An unauthenticated `GET .../repos/actions/checkout/actions/workflows` returned `"state": "active"`. Its headers included `x-ratelimit-limit: 60` and `cache-control: public, max-age=60, s-maxage=60`.

### Re-enabling

- **[DOC] Disable/enable:** three ways:
  - the UI: Actions tab, then the workflow, then **Enable workflow**;
  - the CLI: `gh workflow enable WORKFLOW`;
  - the REST API.
  - The page does not state what repository permission the UI button requires.
- **[DOC] REST workflows:** `PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable` "Enables a workflow and sets the state of the workflow to active." "OAuth tokens and personal access tokens (classic) need the repo scope to use this endpoint." The response is `204 No Content`. The "Anyone with read access" line on the GET endpoints does not appear here.
- **[DOC] Fine-grained PAT permissions:** `PUT .../actions/workflows/{workflow_id}/enable` needs **Actions: write**.
- **[DOC] Events:** a write-permission user's commit that changes the `cron` line reactivates the workflow, and that user becomes `actor`.
- **[DOC] Run notifications:** after a disable and re-enable, "notifications will be sent to the user who re-enabled the workflow". Re-enabling therefore also moves the notification recipient.
- **Not tested:** an unauthenticated `PUT .../enable`. A local tool guard blocked the request.
- **Undocumented:** whether `GITHUB_TOKEN` with `permissions: actions: write`, run from another workflow, can re-enable a `disabled_inactivity` workflow. The fine-grained table lists only "PAT" in its Tokens column. A third-party README says `GITHUB_TOKEN` cannot (see above).

## Q4. Reading the latest runs without a token

- **[DOC] REST workflow runs:**
  - "List workflow runs for a workflow" is `GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs`. The repository-wide version is `GET /repos/{owner}/{repo}/actions/runs`. Both say "Anyone with read access to the repository can use this endpoint."
  - Filters include `actor`, `branch`, `event`, `status`, `created`, `head_sha`, `check_suite_id`, `per_page` (max 100) and `exclude_pull_requests`.
  - `status` "Can be one of: `completed`, `action_required`, `cancelled`, `failure`, `neutral`, `skipped`, `stale`, `success`, `timed_out`, `in_progress`, `queued`, `requested`, `waiting`, `pending`".
  - "This endpoint will return up to 1,000 results for each search when using the following parameters: actor, branch, check_suite_id, created, event, head_sha, status."
  - The response carries `conclusion` ("string or null"), `created_at`, `updated_at` and `run_started_at`.
- **[OBSERVED]** An unauthenticated `GET https://api.github.com/repos/actions/checkout/actions/workflows/3160/runs?per_page=1&branch=main` returned HTTP 200. It included `status: "completed"`, `conclusion: "failure"`, `event`, `created_at`, `updated_at`, `run_started_at`, `actor` and `triggering_actor`.
- **[OBSERVED]** The same call for the disabled fischerscode workflow returned `total_count: 0`. It had no runs, so the state was visible only through the workflow `state` field.
- **[DOC] REST rate limits:**
  - "Unauthenticated requests are associated with the originating IP address, not with the user or application that made the request. The primary rate limit for unauthenticated requests is 60 requests per hour."
  - "The rate limit for `GITHUB_TOKEN` is 1,000 requests per hour per repository."
  - Secondary limits also apply, for example "No more than 900 points per minute are allowed for REST API endpoints". "These secondary rate limits are subject to change without notice."
- **[DOC] Hosted runners:**
  - "Windows and Ubuntu runners are hosted in Azure and subsequently have the same IP address ranges as the Azure datacenters. macOS runners are hosted in GitHub's own macOS cloud."
  - "The list of GitHub Actions IP addresses returned by the API is updated once a week."
  - The docs do not say whether a runner's outbound IP is shared with other tenants.
- **[COMMUNITY]** actions/runner-images #602 (2020-03-23) reports "API rate limit exceeded for 199.7.166.17" on GitHub-hosted macOS runners making unauthenticated calls. https://github.com/actions/runner-images/issues/602
- **[INFERRED]** On a GitHub-hosted runner, the 60 requests per hour for unauthenticated calls is counted against an egress IP that other jobs may also use. The budget left for a given job is therefore not predictable. Calls authenticated with `GITHUB_TOKEN` use the separate 1,000 per hour per repository bucket. Reading another public repo's runs with `GITHUB_TOKEN` is also possible, since public data is readable by any token. **[INFERRED]** That this call is counted in the calling repo's `GITHUB_TOKEN` bucket is not verified.

## Q5. Status badges

- **[DOC] Status badge:**
  - "A status badge shows whether a workflow is currently failing or passing."
  - "By default, badges display the status of your default branch. If there are no workflow runs on your default branch, it will display the status of the most recent run across all branches."
  - "You can display the status of a workflow run for a specific branch or event using the `branch` and `event` query parameters in the URL."
  - The URL form is `https://github.com/OWNER/REPOSITORY/actions/workflows/WORKFLOW-FILE/badge.svg`.
- **[INFERRED]** A scheduled run happens on the default branch (see Q6), so the default badge reflects the latest default-branch run of any trigger. That includes `workflow_dispatch` runs and any `push` runs, if the workflow has them. The documented `event` parameter would narrow it; the doc's example is `?event=push`.
- **[DOC]** The badge docs say nothing about disabled workflows.
- **[OBSERVED]** For the `disabled_inactivity` workflow fischerscode/DockerFlutter `build_updates.yaml`, which has zero runs, the badge SVG `<title>` was "Build Active Branches - no status". The disabled state was not shown as such.
- **[INFERRED, not verified]** A workflow disabled after earlier runs would keep showing its last run's result, for example "passing". A badge would then look the same whether the schedule is running or has stopped.

## Q6. How reliable `schedule` events are

- **[DOC] Events, `schedule` note:**
  - "The `schedule` event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped. To decrease the chance of delay, schedule your workflow to run at a different time of the hour."
  - "This event will only trigger a workflow run if the workflow file exists on the default branch." "Scheduled workflows will only run on the default branch."
  - "Scheduled workflows run on the latest commit on the default branch. The shortest interval you can run scheduled workflows is once every 5 minutes."
  - "By default, scheduled workflows run in UTC." An optional IANA `timezone` can be set. During DST spring-forward, "scheduled workflows in skipped hours advance to the next valid time."
  - `@daily` and other `@` shorthands are not supported.
- **[DOC]** GitHub Docs give no delay bound, SLA or drop rate.
- **[DOC] Actions limits:**
  - "Workflow run queued — 500 workflow runs / 10 seconds — When the limit is reached, the workflow runs that were supposed to be triggered by the webhook events will be blocked and will not be queued."
  - **[INFERRED]** This is written about webhook-triggered runs. The table does not say whether it applies to `schedule`.
- **[INFERRED]** A dropped scheduled run produces no run record, so it triggers no failure notification.

## Q7. Other ways scheduled workflows get disabled or stop running

- **Forks.**
  - **[DOC] Disable/enable:** "When a public repository is forked, scheduled workflows are disabled by default."
  - **[DOC] Events:** "Workflows don't run in forked repositories by default. You must enable GitHub Actions in the **Actions** tab of the forked repository."
  - The REST `state` enum has `disabled_fork`.
- **Manual disable.** **[DOC]** `state` becomes `disabled_manually` when disabled through the UI, `gh workflow disable`, or `PUT .../disable`.
- **Deleted workflow.** **[DOC]** `state` can be `deleted`.
- **The actor's account.**
  - **[DOC]** "the *user account's* status ... is what's important, *not* the user's *membership status*". With EMU, the scheduled workflow requires the actor's account to be "currently active (i.e. not suspended or deleted)", and does not run if the actor was "deprovisioned".
  - **[COMMUNITY]** #109354 reports a deleted account stopped the scheduled runs on a non-EMU repo.
  - **[COMMUNITY]** #148632 quotes older doc text saying removal from the org disabled the schedule. That text is no longer on the page (see Q1).
- **Default branch change.** **[DOC]** It makes the user who changed it the `actor`. It also moves where schedules run, because they run only from the default branch.
- **Archived repos.**
  - **[DOC] Archiving:** "When a repository is archived, its issues, pull requests, code, labels, milestones, projects, wiki, releases, commits, tags, branches, reactions, code scanning alerts, comments and permissions become read-only."
  - **Undocumented** on the pages read: whether scheduled workflows run in an archived repo.
- **Private repos.** **[DOC]** The 60-day statement is scoped to "a public repository". **[COMMUNITY]** Several 2026 discussions report schedules never firing in new private repos, for example #201436. These are not relevant to `plank/docs` except as evidence of schedule-trigger incidents.

## Summary of gaps (not documented by GitHub)

1. The definition of "repository activity" for the 60-day rule.
2. The warning email: when it is sent, who receives it, and whether it is sent at all. The only evidence is community reports.
3. Which of the two conflicting recipient rules applies (creator versus last cron editor). Also whether the recipient and `actor` are always the same user.
4. What happens to notifications once the recipient leaves the org. Also whether any team or list can receive scheduled-run notifications. No documented way exists.
5. Whether badges reflect a disabled schedule. Observed: a disabled workflow with no runs shows "no status".
6. Any bound on schedule delay or drop rate.
7. Whether scheduled workflows run in archived repos.
8. Whether `GITHUB_TOKEN` can call the enable endpoint.

## Addendum: re-enabling with the run's own token, observed on Silverstripe

Gathered after the research above, on 2026-09-13, to check whether "the router run keeps its own schedule on" is feasible. All **[OBSERVED]** unless marked.

- **Two actions re-enable a workflow with `GITHUB_TOKEN` and `permissions: actions: write`, using `PUT .../actions/workflows/{id}/enable`:**
  - `liskin/gh-workflow-keepalive` (87 stars) re-enables the workflow it runs in, "preemptively", with no commits. Its `action.yml` is one `gh api -X PUT .../enable` call with `github.token`. https://github.com/liskin/gh-workflow-keepalive
  - `silverstripe/gha-keepalive` re-enables every scheduled workflow in its repo with `github.token`, and exits 1 unless the call returns 204. https://github.com/silverstripe/gha-keepalive
  - This contradicts `PhrozenByte/gh-workflow-immortality`'s claim that `GITHUB_TOKEN` "lacks necessary permissions" (Q3). That action enables workflows across repos, which may be the difference **[INFERRED]**.
- **Silverstripe runs `silverstripe/gha-keepalive` monthly in its module repos** (`.github/workflows/keepalive.yml`, `cron: '50 22 23 * *'` in `silverstripe/doorman`). Code search found about 30 such repos.
- **`silverstripe/silverstripe-widgets` shows the schedule staying on for about 19 months without a push:**
  - The last commit on its default branch is 2024-12-01, and `pushed_at` (any branch) is 2025-02-20.
  - `GET /repos/silverstripe/silverstripe-widgets/events` returns nothing, so there were no public events in the last 90 days.
  - Its scheduled runs continue: "Dispatch CI" runs weekly through 2026-09-12, and "Keepalive" runs monthly (2026-08-04 and 2026-09-04), all succeeding.
  - **[INFERRED]** Something keeps the schedule on without pushes. The monthly re-enable is the likely cause, but GitHub doesn't document it.
- **Re-enabling an active workflow with the bot token didn't move the run's `actor` to the bot:**
  - After monthly re-enables by `GITHUB_TOKEN`, scheduled runs of "Dispatch CI" still show `actor` and `triggering_actor` `maxime-rainville`, and "Keepalive" shows `emteknetnz`.
  - **[INFERRED]** GitHub's "disabled and then re-enabled" rule (Q1) moves the notice recipient only after a real disable. Re-enabling a workflow that's already active seems to leave the cron line's user in place. That the `actor` is the notice recipient isn't documented.
