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

## 7. A shared `docs@plank.co` login

Facts gathered 2026-09-13. `plank.co`'s mail is on Google Workspace (section 4). Plank plans a Workspace address `docs@plank.co` whose recipients Plank configures. A shared login on it is meant to own the Cloudflare account (ADR 0008) and to register the Docs Site with Search Console and Bing ([#26](https://github.com/plank/docs/issues/26)). Several Workspace help pages now redirect from `support.google.com/a/answer/…` to `knowledge.workspace.google.com`; the links below are the pages as fetched.

**Three kinds of Workspace address:**
- **User alias** ("alternate email address") ([Add or delete an email alias](https://knowledge.workspace.google.com/admin/users/add-or-delete-an-alternate-email-address-email-alias)):
  - "Messages sent to the email alias automatically route to the user's primary email account's inbox."
  - "Email aliases are not Google Accounts, so you can't sign in with an email alias address and access Google services, like Google Drive."
  - "You can add up to 30 email aliases for each user at no extra cost."
  - "Only one user can use an email alias. If you need an email address that's used by multiple users, we recommend using Gmail delegation instead."
  - "Email aliases don't support delegates because an alias isn't a Google Account" ([Delegate a user's email address](https://knowledge.workspace.google.com/admin/users/delegate-a-users-email-address)).
- **Google Group:**
  - "A Google group is a named collection of Google Accounts." "Google groups don't have login credentials, and you can't use Google groups to establish identity to make a request to access a resource" ([IAM principals](https://docs.cloud.google.com/iam/docs/principals-overview), Google Cloud docs).
  - "Google Groups can be added as account delegates. One Group counts as a single delegate for that account" ([Delegate a user's email address](https://knowledge.workspace.google.com/admin/users/delegate-a-users-email-address)).
- **Workspace user:**
  - "A user needs a license to use a Google service." "Multiple users can't share a single Google Workspace license, even if they don't use all of the tools" ([How licensing works](https://knowledge.workspace.google.com/admin/billing/how-licensing-works)).
  - The price of a licence on Plank's plan wasn't checked; unconfirmed.
  - Shared use is through Gmail delegation. "In Gmail, delegated accounts and shared inboxes are the same." Delegates "can read, send, and delete messages for the delegated account. However, they can't chat with anyone from the delegated account or change the password." Up to 1000 delegates, with at most 40 concurrent users recommended ([Delegate a user's email address](https://knowledge.workspace.google.com/admin/users/delegate-a-users-email-address)).
- **One namespace.** The "Username already exists" error reads "A user, alias, or group already exists with that username" ([Username already exists](https://knowledge.workspace.google.com/admin/support/troubleshooting/username-already-exists)). "You can't create an alias with the same name as an existing Google Account in your organization" ([email alias](https://knowledge.workspace.google.com/admin/users/add-or-delete-an-alternate-email-address-email-alias)).
- *Inferred:* "recipients Plank configures", if that means several people, matches a Google Group, or a user whose mailbox is delegated. A user alias delivers to one user's inbox.

**Cloud Identity Free, a fourth kind** ([How licensing works for Cloud Identity](https://docs.cloud.google.com/identity/docs/how-to/how-licensing-works-for-cloud-identity)):
- Users added this way "automatically get a free Cloud Identity license". "When you sign up for a free Cloud Identity account, your user cap increases by 50."
- One account can mix the two. The page's example: "100 users with both free Cloud Identity and Google Workspace; 150 users with free Cloud Identity only."
- The fetch summarised the page as not including Gmail in the free licence; the exact sentence wasn't captured.
- Adding it to a Workspace account: Admin console **Billing** > **Buy or upgrade** > **Cloud Identity**. "If your organization bought Google Workspace from a third party, you need to contact your reseller" ([Add Cloud Identity licenses](https://docs.cloud.google.com/identity/docs/how-to/add-cloud-identity-licenses)).
- Unconfirmed: where mail sent to a Cloud Identity-only user's address goes.

**A personal Google Account on a Workspace address:**
- **Creating one.** Google Account help: **Create account** > **For my personal use** > **Use your existing email**, then enter the code sent to that address. "If the email is already used - You can't choose this email address for a new account" ([Create a Google Account](https://support.google.com/accounts/answer/27441)). The page says nothing about work addresses, Workspace domains, aliases or groups.
- **What address qualifies.** "A Google Account may be created using any standard email address that can receive mail. Because of this, you may have used your Google Workspace email address to create a conflicting account" ([How a conflicting account is created](https://support.google.com/accounts/answer/181526)).
- **Verification.** "When you're setting up a Google Account with a non-Google email, we'll send a verification code to the email address you used to create the account." "If you don't verify your address, you won't be able to create a Google Account" ([Verify your Google Account](https://support.google.com/accounts/answer/63950)).
- **Names Google uses:**
  - "A conflicting account is a personal Google Account that was created using the email address of a Google Workspace account." The two "share the same primary email address, but are completely unrelated" ([How a conflicting account is created](https://support.google.com/accounts/answer/181526)).
  - "Unmanaged accounts are users who independently created a Google account using one of your organization's domains." They are "not controlled by Google Workspace or Cloud Identity administrators" ([Find and add unmanaged users](https://knowledge.workspace.google.com/admin/users/find-and-add-unmanaged-users)).
- **On an alias address:**
  - No Google page read says outright that an alias address can be used. The unmanaged-users page does say "The Transfer tool for unmanaged users and the Conflicting accounts management setting only support handling conflicts on an account's primary email address. User invitations aren't supported for conflicts on an alternate or alias email address" ([Find and add unmanaged users](https://knowledge.workspace.google.com/admin/users/find-and-add-unmanaged-users)).
  - The Transfer tool: "You can only transfer accounts if the primary email address of the user is an organization email address, not an alternate email address" ([Use the transfer tool](https://knowledge.workspace.google.com/admin/users/use-the-transfer-tool-to-migrate-unmanaged-users)).
  - *Inferred:* an alias receives mail, so it meets "any standard email address that can receive mail", and the verification code lands in the one user's inbox. Untested.
- **On a Google Group address:**
  - No Google page read addresses it; unconfirmed.
  - The nearest page: for Gmail "send as" a group, "Gmail sends a confirmation code to the group". Receiving it may need the group's **Who can post** set to **Anyone on the web**, with moderation of non-members' messages optional ([Add a group as an email address in Gmail](https://support.google.com/groups/answer/10309372)).
  - *Inferred:* the account-creation code comes from outside the domain (the sender below), so a group gets it only if it accepts posts from outside. Untested.
- **Blocking it** ([Prevent creation of unmanaged user accounts](https://knowledge.workspace.google.com/admin/users/prevent-creation-of-unmanaged-user-accounts), updated 2026-09-10). Two options:
  - "Create a user for every person who has an email address in your domain", or invite existing unmanaged accounts to transfer.
  - "Configure your mail server to block the Google sign-up verification emails". Envelope from `*@idverification.bounces.google.com`, header from `noreply@google.com`, subject "Verify your email address". The subject is language-specific.
  - The page doesn't mention aliases or groups, or how to set up the block when the mail server is Gmail itself. Both unconfirmed.
  - *Inferred:* a block on the verification email would also stop a personal Google Account being created on `docs@`.
- **Conflicting accounts management** ([Workspace Updates, 2023-08-18](https://workspaceupdates.googleblog.com/2023/08/conflict-accounts-management-tool.html)). When an admin provisions a managed user on an address that already has a personal account, the options are:
  - invite the person to transfer;
  - replace the personal account, where "data owned by the account will not be imported" and the person gets "a temporary account address, which they'll need to manually replace with a @gmail.com address of their choice";
  - don't create the managed user.
  - The post says these apply "only when users are provisioned using the public Directory API with URL parameter resolveConflictAccount set to true". The current admin page's wording on this wasn't captured.
  - *Inferred:* a personal account on `docs@` becomes a conflict on a primary address if `docs@` later becomes a Workspace user. These tools cover that case, not the alias case.
- **Admin control over Search Console for managed users.** Search Console is one of the "Additional Google services" an admin turns on or off, for everyone, an organizational unit or an access group ([Turn Google Search Console on or off for users](https://knowledge.workspace.google.com/admin/users/access/turn-google-search-console-on-or-off-for-users)). That page doesn't say what happens to existing properties when it's off; unconfirmed. *Inferred:* the setting reaches managed users only, not a personal account on a Workspace address.

**Search Console ownership** ([Managing owners, users, and permissions](https://support.google.com/webmasters/answer/7687615)):
- **Two kinds of owner.** A verified owner used "a token to prove ownership (such as an HTML file uploaded to the website)". A delegated owner was granted ownership "by a verified owner without the use of a verification token."
- **Who can be added:**
  - "Users must have a valid Google Account."
  - "An email group cannot be added as a user."
  - "You must be a property owner (or an owner of a parent property) to add or remove another user."
- **Limits** (paraphrased by the fetch): up to 100 non-owner users per property. Delegated owners can be added until verified plus delegated owners reach 500. No cap on verified owners.
- **Losing verification.** "If all verified owners are removed, then all remaining users and delegated owners will lose access", after a grace period. Section 5 has the verification file being "tied to a specific user".
- **Seeing methods.** "If you are a verified owner, you can determine the method(s) used to verify yourself or any other verified owners."
- **Domain properties** ([Add a property](https://support.google.com/webmasters/answer/34592)):
  - A Domain property "Includes all subdomains (m, www, and so on) and multiple protocols (http, https, ftp)". It verifies by DNS record only.
  - Google's example: a Domain property on `example.com` includes "any subdomains of example.com (for example, m.example.com, support.m.example.com, www.example.com, and so on)".
  - Section 5: once a property is verified, "any child properties that you add will be auto-verified using the same verification method as the parent".
  - *Inferred:* a `plank.co` Domain property would include `packages.plank.co`. Its owners, as owners of a parent property, could add or remove users on a `packages.plank.co` property.
- **Does Plank have a `plank.co` Domain property?** Unconfirmed. The apex `google-site-verification=` TXT (section 4) fits both uses:
  - Workspace domain verification uses the form `google-site-verification=abcdef123_456wx789yz`. "The unique TXT record must stay in your domain's DNS settings until Google detects it and verifies ownership", and once verified "the TXT record can be safely removed" ([Verify your domain with a TXT record](https://knowledge.workspace.google.com/admin/domains/verify-your-domain-with-a-txt-record)).
  - A Search Console Domain property asks for the record to stay (section 5).
  - The admin page also notes "Search Console may also be used to verify site ownership for other Google Services" ([Turn Search Console on or off](https://knowledge.workspace.google.com/admin/users/access/turn-google-search-console-on-or-off-for-users)).
  - *Inferred:* the record alone doesn't tell which service placed it. Only a verified owner of such a property could see its methods.

**Bing Webmaster Tools sign-in:**
- **Account types:**
  - "Webmasters will be able to login to Bing Webmaster Tools using their Facebook and Google accounts in addition to their existing Microsoft account" ([Introducing Social Login](https://blogs.bing.com/webmaster/january-2018/Introducing-Social-Login-for-Bing-Webmaster-Tools), 2018-02-09).
  - "sign in using your Microsoft, Google, or Facebook account" ([Start Using Bing Webmaster Tools](https://blogs.bing.com/webmaster/June-2025/Start-Using-Bing-Webmaster-Tools-to-Improve-Your-Site-Visibility), 2025-06-17).
- **Mail.** "the messages Webmaster Tools may occasionally send you about your managed properties will be sent to the email account associated with the webmaster tools account you are logged in with" (2018 post).
- **Adding users.** Read from the help pages' source with `curl`, as in section 5 ([How to add users](https://www.bing.com/webmasters/help/how-to-add-users-to-your-site-account-d5d00364)):
  - "The new user needs to sign up on Bing Webmaster Tools using Microsoft, Facebook or Gmail account. Once the new user has signed up, the administrator can add him as a new user … Enter their Microsoft, Gmail or the email associated with Facebook account in the Email field".
  - The Administrator role "allows those with this level of permission to control all features and functions, including adding and delegating new users."
  - If the address isn't signed up: "User with this email does not exist. Please sign up on Bing Webmaster Tools with this email and try again."
  - Unconfirmed: whether "Gmail" there covers a Google Account on a non-Gmail address such as `docs@plank.co`.
- **Import from Search Console** ([Bing blog, 2019, updated June 2025](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)):
  - Step 1: "Sign-in to your Bing Webmaster Tools account or create a new one".
  - Step 3: "Sign-in with your Google Search Console account and click Allow to give Bing Webmaster Tools access to your list of verified sites and sitemaps."
  - UI strings: "we require you to sign-in to your Google Search Console account and would need View-Only permissions"; "We will only import the list of your verified sites"; the labels "Google search console accounts" and "No Search Console account is linked to Bing Webmaster Tools."
- **Unconfirmed:**
  - whether the Google account authorised in step 3 must be the one used to sign in to Bing. Neither source says. *Inferred:* they are separate steps, and the "linked" wording suggests a Google account connected to the Bing account rather than its sign-in;
  - whether "verified sites" includes properties where that Google account is a delegated owner or a user rather than a verified owner.

**Confidence:** high for quoted Google and Bing text; low for personal accounts on alias or group addresses (no Google page says so outright), and for which Google account Bing's import must use (not stated).
