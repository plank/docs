# The Docs Site has its own Cloudflare account, run through one shared login

The router Pages project and every Docs Version's Worker live in a Cloudflare account of Plank's that holds nothing else. The account is created by a login on a shared Plank mailbox, and that login is its only member. A named few Plank people hold the login: its password and authenticator code (TOTP) are kept together in a password manager they share, and the mailbox forwards to them. Both deploy tokens (the Packages' token and the router run's, ADR 0006) are account-owned, and the named few create and roll them through the shared login. The User chose this on 2026-09-13 in [Which Cloudflare account hosts the Docs Site, and who owns it?](https://github.com/plank/docs/issues/16). Until the attach step, a non-Plank stand-in account plays this part.

## Considered Options

- **Sharing an account that holds other things.** A Workers Scripts or Pages token can't be limited to certain Workers or projects, so every Package's token could overwrite or delete anything else there. The 100,000 requests a day and the 100 Workers would be shared too. No Plank Cloudflare account was found: `plank.co` resolves to WP Engine's Advanced Network, with DNS at Namecheap.
- **A named person's own login creating the account.** Credentials stay personal. But deleting a user profile deletes the accounts where it's the last member or the "primary owner", and the daily-limit emails would likely reach only that person.
- **Named people as members under their own logins**, either as Super Administrators (Cloudflare recommends more than one) or with a narrower role like Workers Platform Admin. Someone leaving is removed without rotating anything, and each person's actions are their own.
- **A security key per person, or no 2FA**, in place of a shared TOTP.
- **User-owned tokens.** On an account with one member, they stop working only when that member is removed. Cloudflare recommends account-owned tokens for CI/CD.

## Consequences

- **The tokens' reach, the daily limit and the Worker limit cover only the Docs Site.** Any Package's token can still overwrite or delete any Docs Version's Worker.
- **The shared password manager entry is the boundary.** Whoever can open it can deploy, delete, create tokens and flip fail-open. When one of the named few leaves, the password and TOTP are rotated.
- **Everything is done as one login**, so the account's audit log can't tell the named few apart (inferred).
- **The account depends on the shared login's Cloudflare user.** Deleting that user profile deletes the account.
- **Cloudflare's daily-limit emails reach the named few through the forward.** Cloudflare doesn't document who receives them (the account's email is inferred), and it has no configurable notification for the Workers daily limit.
- **Account-owned tokens need a Super Administrator to create or update**, which the shared login is. Cloudflare's docs don't mention Wrangler with account-owned tokens, so the builder confirms it on the stand-in while finding the tokens' minimum permissions.
- **The account is created at the attach step.** Its email must be verified before it can create a Worker (error 10034) or turn on 2FA. If the mailbox already has a Cloudflare user, a further account from the dashboard needs that user to be at least 7 days old, and one user can create up to 5 Free accounts.
- Which mailbox, and which people, aren't named here.
