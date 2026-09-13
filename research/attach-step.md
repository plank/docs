# The attach step

Facts gathered 2026-09-13 for planning how the Docs Site moves from its stand-ins to Plank's own ([#27](https://github.com/plank/docs/issues/27)). The stand-ins are a non-Plank Cloudflare account on `*.pages.dev` / `*.workers.dev`, forks of the Packages under a personal GitHub account, and a GitHub App owned by that account. The targets are Plank's new Cloudflare account (ADR 0008), `packages.plank.co` as a CNAME at Namecheap (ADR 0003), and the real `plank/*` repos. Costs and mechanisms only; nothing here decides anything. "Inferred" marks anything not stated by a source or seen in a check. "Unconfirmed" marks what couldn't be checked.

## 1. A Pages custom domain on DNS that isn't Cloudflare

**Order.** Cloudflare documents adding the domain in the Pages project first, then creating the CNAME ([Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), updated 2026-04-21):
- A subdomain doesn't need a Cloudflare zone: "You will need to add a custom CNAME record to point the domain to your Cloudflare Pages site." The record points at `<YOUR_SITE>.pages.dev`.
- Adding the domain: the project's **Custom domains** > **Set up a domain**. Or through the API: `POST /accounts/{account_id}/pages/projects/{project_name}/domains`, whose body takes only `name` ([Add domain](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/)).
- **CNAME first:** "Manually adding a custom CNAME record pointing to your Cloudflare Pages site - without first associating the domain (or subdomains) in the Cloudflare Pages dashboard - will result in your domain failing to resolve at the CNAME record address, and display a 522 error."

**Verification.**
- "Pages uses HTTP validation and needs to hit an HTTP endpoint during validation." Anything in front of `http://{domain_name}/.well-known/acme-challenge/*` that redirects or answers (Access, a redirect rule, a Worker) stops it ([Debugging Pages](https://developers.cloudflare.com/pages/configuration/debugging-pages/), [Known issues](https://developers.cloudflare.com/pages/platform/known-issues/)).
- *Inferred:* HTTP validation of `packages.plank.co` can finish only once the CNAME resolves to Cloudflare, since Cloudflare has to answer that path on that hostname.
- **CAA.** CAA records that don't allow Cloudflare's CAs block issuance. The docs list `letsencrypt.org`, `pki.goog` and `ssl.com` ([Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)). Live: `plank.co` has no CAA record (section 4).
- **API statuses.** The domain object has `status` (`initializing`, `pending`, `active`, `deactivated`, `blocked`, `error`), `certificate_authority` (`google` or `lets_encrypt`) and `verification_data.status` ([Add domain](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/)).
  - The API's example response starts at `initializing` / `pending`.
  - `validation_data.method` is `http` or `txt`, with optional `txt_name` / `txt_value`. The request has no field to choose the method.
  - Unconfirmed: when Pages uses `txt`.

**Timing.** The only figure in the Pages docs: "If you have done the steps above and your domain is still verifying after 15 minutes", contact support or Discord ([Debugging Pages](https://developers.cloudflare.com/pages/configuration/debugging-pages/)). No certificate issuance time is documented.

**What a visitor gets in between:**
- **No CNAME yet:** `packages.plank.co` is NXDOMAIN today (section 4). *Inferred:* a DNS failure in the browser.
- **CNAME before the domain is added:** 522 (documented, above).
- **Domain added and CNAME live, not yet active:** not documented; unconfirmed. The nearest the docs come is a known issue: pointing a working custom domain's DNS away and back means visitors "will get errors until it becomes active again", without naming the error ([Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)).
- **Resolvers that looked up the name before the CNAME existed** can keep the NXDOMAIN for up to about an hour. The negative-cache TTL is the smaller of the SOA's MINIMUM field and the SOA's own TTL ([RFC 2308 §5](https://www.rfc-editor.org/rfc/rfc2308.html#section-5)). `plank.co`'s SOA has MINIMUM 3601 and TTL 3601 (inferred from those two values).

**One hostname on two projects or accounts:**
- **Pages docs:** silent on whether one hostname can be attached to two Pages projects at once, and on moving a custom domain between projects or accounts.
- **Documented detach:**
  - Delete the CNAME, then the domain's three-dot menu > **Remove domain** ([Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)).
  - Deleting a project that has a custom domain: "you must first delete the CNAME record associated with your Pages project. Failure to do so may leave the DNS records active, causing your domain to point to a Pages project that no longer exists" ([Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/)).
- **Cloudflare for SaaS**, which sits under Pages custom domains. The Pages known issues say "Advanced Certificates cannot be used with Cloudflare Pages due to Cloudflare for SaaS's certificate prioritization".
  - For SaaS custom hostnames on two zones: "The most recently edited custom hostname will be active" ([Move hostnames between zones](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/migrating-custom-hostnames/)).
  - Whether Pages custom domains follow that rule isn't documented; unconfirmed.
- **Community reports**, unconfirmed. Cloudflare's forum returned a bot challenge, so only search titles and snippets were seen:
  - the error "That domain is already associated with an existing project", reported across accounts;
  - "Custom domain stuck on a stale Pages project in another account";
  - a domain removed from DNS but not from Pages keeping an invisible hold on the hostname, cleared through the API.
- *Inferred, untested:* a move is removing the domain from one project, adding it to the other, and pointing the CNAME at the new `<project>.pages.dev`. The order and the gap between the steps are untested.

**Confidence:** high for the order, the 522, HTTP validation and CAA; low for two projects or accounts (community snippets only).

## 2. `pages.dev` and `workers.dev` names

**Pages project names:**
- **Shared across accounts.** "Your **project name** will be used to generate your project's hostname" ([Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/)).
  - For Direct Upload: "Your project will be served at `<PROJECT_NAME>.pages.dev` (or your project name plus a few random characters if your project name is already taken)" ([Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)). The Git integration guide doesn't mention the random characters.
  - *Inferred:* `pages.dev` names are one namespace across every account. A name held by the stand-in account would give the Plank account's project random characters, unless the stand-in project is deleted first and deletion frees the name.
- **Renaming:**
  - Known issues: "`*.pages.dev` subdomains currently cannot be changed. If you need to change your `*.pages.dev` subdomain, delete your project and create a new one" ([Known issues](https://developers.cloudflare.com/pages/platform/known-issues/)).
  - The Git integration guide's settings section lists "changing your project name" among the advanced settings.
  - The two pages don't reconcile what a rename does to the subdomain; unconfirmed.
- **Deletion:**
  - Whether deleting a project frees its name, and after how long, isn't documented; unconfirmed. A community thread is titled "Deleted Pages project name cannot be recreated - error 8000000" (title only, not read).
  - A project with over 100 deployments may fail to delete. The workaround is `wrangler pages deployment delete` for each deployment first ([Known issues](https://developers.cloudflare.com/pages/platform/known-issues/)).
- **New accounts:** "Cloudflare limits the number of new Pages projects you can create within your first 48 hours of using the service". The block lifts after 48 hours ([Limits](https://developers.cloudflare.com/pages/platform/limits/)).

**`workers.dev`:**
- **Changing it.** An account's subdomain is "configurable in the Cloudflare dashboard": **Workers & Pages** > **Change** next to **Your subdomain** ([workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)). The API has `PUT /accounts/{account_id}/workers/subdomain`, "Creates a Workers subdomain for an account", with body `subdomain` ([Create Subdomain](https://developers.cloudflare.com/api/resources/workers/subresources/subdomains/methods/update/)).
- **Not documented:** global uniqueness, what a taken name does, what happens to the old name or to deployed Workers on a change, and whether a name is ever freed. All unconfirmed. *Inferred:* it's a DNS label under `workers.dev`, so one account per label. Community snippets report "unavailable" errors on change (not read).
- **Name rules.** A Worker's `workers.dev` name must be 63 characters or less, alphanumeric and dashes, and can't start or end with a dash. Without `workers.dev`, names can be up to 255 characters.

**Confidence:** high for what's quoted; low for uniqueness and reuse (undocumented).

## 3. Transferring the GitHub App

**Who and where** ([Transferring ownership of a GitHub App](https://docs.github.com/en/apps/maintaining-github-apps/transferring-ownership-of-a-github-app)):
- **Who:** "The owner of a GitHub App registration can transfer ownership … App managers can also transfer ownership".
- **Where to:** "You can transfer apps from a user or organization to another account. You cannot transfer ownership to a team."
- **Steps:** Developer settings > GitHub Apps > the App > Advanced > **Transfer ownership**. Type the new owner's name and pick it from the dropdown, which can list an organization and an enterprise with the same name. "If transferring the app would uninstall it from your account, a warning will appear." Then **Transfer this GitHub App**.

**Acceptance: not stated for GitHub Apps; unconfirmed.** GitHub's page (and its source, [github/docs](https://github.com/github/docs/blob/main/content/apps/maintaining-github-apps/transferring-ownership-of-a-github-app.md)) says nothing about the recipient accepting. For OAuth apps, "the new owner needs to navigate to their OAuth apps page … 'Pending transfer requests' … click **Complete transfer**" ([OAuth app transfer](https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/transferring-ownership-of-an-oauth-app)).

**What carries over: not stated; unconfirmed.** GitHub's docs don't say whether the App ID, client ID, private keys, webhook settings or installations survive a transfer. The only related text is for transfers to an enterprise ([reusable text](https://github.com/github/docs/blob/main/data/reusables/apps/transfer-to-enterprise.md)): "The app is not uninstalled from any organization" and "The app is uninstalled from all user accounts."

**Private Apps** ([public or private](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/making-a-github-app-public-or-private)):
- "If you set your GitHub App registration to private, it can only be installed on the account that owns the app."
- *Inferred:* a private App owned by the personal account and installed there loses that installation when it moves to `plank`, which matches the warning above. Its installation on `plank` is then new.

**Limits and names** ([Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)):
- "A user or organization can register up to 100 GitHub Apps, but there is no limit to how many GitHub Apps can be installed on an account."
- An App's name is at most 34 characters. "The name must be unique across GitHub. You cannot use the same name as an existing GitHub account, unless it is your own user or organization name."
- An organization's Apps can be registered by its owners, or by App managers the owners designate ([App managers](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/adding-and-removing-github-app-managers-in-your-organization)).

**Deleting instead:**
- "When you delete a GitHub App registration, the app will be uninstalled from all accounts that the app is installed on."
- "any code that relies on your GitHub App's credentials will no longer function" ([Deleting a GitHub App](https://docs.github.com/en/apps/maintaining-github-apps/deleting-a-github-app)).
- Whether a deleted App's name becomes available again: unconfirmed.

**Confidence:** high for what's quoted; the acceptance and carry-over questions are unanswered by GitHub's docs.

## 4. Live DNS for `plank.co`

Queried 2026-09-13 with `dig`, the `packages` and wildcard checks against `dns1.registrar-servers.com` (authoritative).

| Query | Answer |
|---|---|
| `NS plank.co` | `dns1.registrar-servers.com`, `dns2.registrar-servers.com` (TTL 1800). `whois`: registrar NameCheap, Inc. |
| `SOA plank.co` | `dns1.registrar-servers.com. hostmaster.registrar-servers.com. 1781198794 43200 3600 604800 3601`, TTL 3601 |
| `A packages.plank.co` | **NXDOMAIN**, so no record of any type at that name |
| `A zz-nonexistent-probe-8472.plank.co`, `A *.plank.co` | **NXDOMAIN**, so no `*.plank.co` wildcard |
| `A plank.co` | `141.193.213.10`, `141.193.213.11` (WP Engine, per ADR 0008) |
| `CNAME www.plank.co` | `wp.wpenginepowered.com.` |
| `CAA plank.co` / `CAA packages.plank.co` | none (NOERROR, no answer) / NXDOMAIN |
| `MX plank.co` | Google (`aspmx.l.google.com` and alternates) |
| `TXT plank.co` | includes `google-site-verification=qO7BJ8_…` and several other services' verification records |

**BasicDNS or PremiumDNS:**
- BasicDNS's default nameservers are `dns1.registrar-servers.com` and `dns2.registrar-servers.com` ([What is your BasicDNS?](https://www.namecheap.com/support/knowledgebase/article.aspx/923/10/what-is-your-basicdns/)). BasicDNS allows up to 800 host records.
- PremiumDNS uses `pdns1.registrar-servers.com` and `pdns2.registrar-servers.com`. "If your domain is pointed to our BasicDNS, once a subscription is purchased, the domain in question will be automatically switched to the PremiumDNS nameservers" ([What is PremiumDNS?](https://www.namecheap.com/support/knowledgebase/article.aspx/9654/2231/what-is-premiumdns/)).
- So `plank.co` is on BasicDNS (inferred from the nameserver names).

**The apex `google-site-verification` TXT.** Someone has verified `plank.co` with a Google service through DNS. Google Workspace (the MX is Google's) and Search Console Domain properties both use this record form. Which one it is, and under which Google account, is unknown (inferred).

**CNAME at Namecheap:**
- "Select **CNAME Record** … put your desired host (e.g. www) for Host and enter the record itself … into Value", then "Wait for 30 minutes for the host records to be accepted" ([Create a CNAME](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/)).
- "CNAME record blocks any other records created for the same Host". CNAME, URL Redirect, ALIAS or A records on the same host "can conflict with each other and they should be removed".
- That guide's only TTL advice, as fetched: "Set the minimum possible TTL value."

**TTL options:**
- "Our default TTL is 30 minutes (5 minutes for ALIAS records). You can select it from the drop-down or just leave it 'Automatic'" ([Host records](https://www.namecheap.com/support/knowledgebase/article.aspx/434/2237/how-do-i-set-up-host-records-for-a-domain/)).
- For ALIAS: "only 1 min or 5 min are available" ([ALIAS record](https://www.namecheap.com/support/knowledgebase/article.aspx/10128/2237/how-to-create-an-alias-record/)).
- Microsoft's Namecheap guide shows `Automatic` and `30 min` picked from the TTL drop-down, `Automatic` for its CNAMEs ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/admin/dns/create-dns-records-at-namecheap)).
- **Full drop-down list: unconfirmed.** No Namecheap page read lists the CNAME drop-down's values; a search-engine summary gives 1, 5, 20, 30 and 60 minutes. Namecheap's API page (`setHosts`, which documents the TTL parameter) returned a bot challenge.
- `plank.co`'s existing records carry TTL 1800 (30 min), which matches "Automatic" (inferred).

**Confidence:** high for the live answers and the nameserver mapping; medium for TTL options (the default is confirmed, the full list isn't).

## 5. Search Console and Bing verification

**Google, HTML file on a URL-prefix property** ([Verify your site ownership](https://support.google.com/webmasters/answer/9008080)):
- **At verify time:**
  - "Upload the verification file to your website so that it will be available at the address specified … Complete verification by clicking **Verify**." For `https://packages.plank.co/` the file sits at `https://packages.plank.co/<file>.html`.
  - "Confirm that you can see the file by visiting it in your browser in the location specified". "Search Console does not follow redirects when looking for this file"; same-domain redirects are followed.
  - The errors Google lists include "unable to access your domain due to a DNS error" and "We were unable to connect to your server."
  - *Inferred:* the file has to be fetchable at `packages.plank.co` when **Verify** is clicked. That's after the CNAME is live and the Pages domain is active. Only the router serves root paths (ADR 0003).
- **Afterwards:**
  - "Removing this verification file from your site will cause you to lose verification for the site."
  - "Verification lasts as long as Search Console can confirm the presence and validity of your verification token. Search Console periodically checks … If verification can no longer be confirmed, you will be notified. If the issue is not fixed, your permissions on that property will expire after a certain grace period."
  - "If all verified owners lose access to a property, all users will lose access to the Search Console property."
- **The file is tied to one user.** "This file is tied to a specific user"; it "is associated with your Gmail account."
- **Other facts on the same page:**
  - "Data is collected for a property as soon as anyone adds it in Search Console, even before verification occurs."
  - Child properties: once a property is verified, "any child properties that you add will be auto-verified using the same verification method as the parent".
  - Domain properties verify by DNS record, and "To stay verified, don't remove the DNS record from your provider, even after verification succeeds."
  - "You might want to add more than one verification method in case one of your existing verification methods fails."

**Bing, importing from Search Console:**
- **Blog post** ([2019-09-13, updated June 2025](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)):
  - "the selected sites will be added and automatically verified in Bing Webmaster Tools".
  - "Bing Webmaster Tools will periodically validate your site ownership status by syncing with your Google Search Console account."
  - "If access to your Google Search Console account is revoked, you will need to reconnect or verify your sites using an alternative verification method."
  - "Up to 100 websites can be imported at once"; "The limit of 1000 sites addition per Bing Webmaster Tools account still applies."
- **Help page.** [Add and Verify site](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b) renders client-side, so WebFetch got nothing. Its text strings were read from the page source with `curl`:
  - "To import your data, we require you to sign-in to your Google Search Console account and would need View-Only permissions … We will be using this access to periodically validate your verification status and update sitemaps."
  - "We will also import sitemaps submitted on Google Search Console, but we will not be importing any site analytics related data."
  - "{0} was imported from Google Search Console. Since it is already verified on Google Search Console, there is no verification code needed on Bing for this site."
  - Bing's other methods:
    - Domain Connect, "only … visible for DNS providers who have adopted Domain Connect and have partnered with Bing";
    - `BingSiteAuth.xml` "to the root directory of the registered site";
    - a meta tag;
    - a CNAME record.
- **Unconfirmed:**
  - whether both Domain and URL-prefix Search Console properties can be imported;
  - whether a Search Console property losing verification un-verifies the Bing site (the "periodically validate" wording suggests it's rechecked, inferred);
  - whether Namecheap supports Domain Connect with Bing.

**Confidence:** high for Google (current help page); medium for Bing (a 2019 blog post updated 2025, plus UI strings rather than a rendered help article).

## 6. Retiring the forks

- **Upstream repos:**
  - "Deleting a forked repository does not delete the upstream repository" ([Deleting a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository)).
  - GitHub's table of effects on forks covers only deleting or re-scoping the *upstream* ([Forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility)).
- **What a fork owns.** "Each fork can have its own: Branches · Members and discussions · Issues and pull requests · Actions and projects · Tags, labels, and wikis" ([Forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility)).
  - *Inferred:* the fork's releases, tags, Actions runs, secrets, variables and App installations go with it. The upstream's releases and Actions are its own and untouched.
  - GitHub doesn't state this for releases in so many words.
- **Commits stay reachable:**
  - "If you delete a fork, code contributions from that fork can remain accessible to the repository network."
  - "Commits pushed to any repository in a network can be accessible from other repositories in that network, including the upstream repository."
  - *Inferred:* commits pushed to a stand-in fork, such as test workflows or Docs Configs, can stay reachable by SHA through `plank/*` after the fork is deleted.
- **Restoring:**
  - "A deleted repository can be restored within 90 days, unless the repository was part of a fork network that is not currently empty."
  - Restoring such a repo needs GitHub Support, and "You can only contact GitHub Support to restore a repository if you are on a paid GitHub plan" ([Restoring a deleted repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository)).
  - *Inferred:* a deleted fork of a live `plank/*` repo can't be restored by its owner.
- **Open pull requests from a fork:** not covered by GitHub's docs; unconfirmed. A community thread ([#65542](https://github.com/orgs/community/discussions/65542), 2023–2024, no GitHub staff answer) reports that open PRs are closed when their fork is deleted.
- **Detaching instead of deleting:** a fork can leave its network and become standalone. It "will not retain any of its issues, pull requests, wikis, stars, watchers, comments, child forks, or other metadata", and leaving is "permanent" ([Detaching a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/detaching-a-fork)).
- **Credentials tied to the forks** (inferred): Cloudflare tokens stored as secrets in the forks are deleted with them. Deleting a secret doesn't revoke the token in the stand-in Cloudflare account.

**Confidence:** high for quoted GitHub docs; low for open PRs (community only).
