# Open Source Release Log

Date: 2026-07-06  
Timezone: Asia/Taipei  
Repository: `WilsonAImaster/wilson-seo-lab-scanner`  
Public URL: https://github.com/WilsonAImaster/wilson-seo-lab-scanner

## Goal

Prepare the Wilson AI Lab SEO scanner MVP for public GitHub sharing while removing private assets, deployment artifacts, old prototype routes, and any traces that could make the project look like a direct copy of an earlier reference site.

## Scope

Created a separate open-source project folder:

```text
C:\Claude\威耀網站優化\wilson-seo-lab-scanner
```

This folder is separate from the production site folder:

```text
C:\Claude\威耀網站優化\wilson-ai-lab-site
```

## Source Separation

The public project was not made by publishing the full production website folder.

Excluded from the public repository:

- `相關素材`
- Wilson personal headshot source images
- video files
- screenshots
- `.env`
- `.wrangler`
- zip files
- log files
- output/deployment folders
- old prototype HTML files
- old `tools/seo-audit` route
- private workspace notes

Included in the public repository:

- static frontend
- Cloudflare Pages Function scanner API
- neutral SVG logo
- README
- architecture notes
- security notes
- MIT license
- Wrangler config

## Positioning Changes

Changed the public project positioning from a commercial Wilson AI Lab website to a neutral open-source engineering project:

```text
Open SEO Lab Scanner
```

Main messaging:

- open-source SEO scanner MVP
- Cloudflare Pages Function demo
- transparent scanner implementation
- forkable starter project
- not a complete commercial SEO platform

Removed or avoided commercial landing page structure such as:

- pain point / product / pricing / FAQ navigation
- paid plan CTAs
- email unlock promises
- PDF/email delivery claims
- old SEO audit clone-style phrasing

## Public Files Created

```text
.gitignore
ARCHITECTURE.md
LICENSE
OPEN_SOURCE_RELEASE_LOG.md
README.md
SECURITY.md
assets/app.js
assets/lab-grid.svg
assets/logo.svg
assets/styles.css
functions/api/lab-scan.js
index.html
package.json
wrangler.jsonc
```

## API Changes

Updated the scanner API identity for the open-source release:

```text
USER_AGENT = "OpenSEOLabScanner/0.1"
reportId prefix = "OSL-"
```

This avoids leaking the production Pages URL or production report prefix into the open-source package.

## Security And Privacy Review

Checked that the public project does not include:

- Cloudflare API keys
- authorization callback codes
- auth header secrets
- personal Gmail addresses
- `.env` files
- deployment state
- local Wrangler state
- private assets
- test client data
- private test-domain data
- old reference-site brand names or slogans
- old reference-analysis notes

Keyword scan covered categories such as:

- reference-site domains and brand names
- old prototype route names
- commercial offer phrases from the reference analysis
- private email patterns
- private test-domain data
- authorization callback markers
- API key and access token markers

No sensitive matches were found in the final public project.

## Validation Run

Syntax checks:

```bash
node --check assets/app.js
node --check functions/api/lab-scan.js
```

Result:

```text
Passed
```

Local Cloudflare Pages Function test:

```bash
npx wrangler@4.103.0 pages dev . --port 8788
```

Result:

```text
Local server returned HTTP 200 at http://127.0.0.1:8788/
```

API test:

```bash
POST http://127.0.0.1:8788/api/lab-scan
Body: {"url":"https://example.com","language":"zh"}
```

Observed response:

```text
ReportId: OSL-27DF13
Score: 41
Status: 200
FinalUrl: https://example.com/
IssueCount: 8
Title: Example Domain
```

## GitHub Release Steps

Initialized a new Git repository in the clean open-source folder:

```bash
git init -b feat/open-source-seo-scanner
git add -A
git commit -m "feat(scanner): open-source seo lab scanner"
```

Initial commit:

```text
8dfa72e feat(scanner): open-source seo lab scanner
```

Created and pushed the public GitHub repository:

```bash
gh repo create wilson-seo-lab-scanner --public --source . --remote origin --push
```

Repository:

```text
https://github.com/WilsonAImaster/wilson-seo-lab-scanner
```

Repository metadata added:

```text
Description: Open-source SEO scanner MVP for Cloudflare Pages Functions
Topics: seo, seo-scanner, cloudflare-pages, pages-functions, open-source
```

## Current Repository State

Branch:

```text
feat/open-source-seo-scanner
```

Visibility:

```text
PUBLIC
```

Default branch:

```text
feat/open-source-seo-scanner
```

## Notes

The repository is safe to share as an open-source MVP. It does not contain the private production site, private media assets, old reference-analysis artifacts, or service credentials.

Recommended future cleanup before a bigger public launch:

- add screenshots or an animated demo
- add a short social sharing section to README
- optionally rename the default branch to `main`
- deploy a separate demo instance for the open-source project
- add Turnstile and rate limiting before wider public traffic

## 2026-07-07 Production Site Alignment

Updated the production Wilson AI Lab Pages site so the public Lab Scan experience matches the open-source MVP positioning.

Removed or replaced:

- pricing-style navigation and `#pricing` references
- upgrade-plan CTA wording
- email-gated unlock form copy
- locked/free-plan brief language
- old "Full Plan" and Lab Sprint sales copy in the Lab Scan page

Current positioning:

- the scanner shows the full Lab Brief directly on the page
- the GitHub/open-source path is the primary CTA
- implementation help is described only as optional service support
- no fixed prices are shown on the public pages

Verification:

```text
node --check assets/audit.js
node --check assets/site.js
node --check functions/api/lab-scan.js
rg scan for pricing, upgrade, locked, unlock, and old plan wording: clean
Cloudflare Pages deploy: success
Live page check: https://wilson-ai-lab.pages.dev/tools/lab-scan/ has Open Source Roadmap and no upgrade/email-gate/full-plan wording
API check: POST https://wilson-ai-lab.pages.dev/api/lab-scan returned 200
```

## 2026-07-07 Lead Capture Layer

Adjusted the production Wilson AI Lab site from a fully open public report to an open-source lead magnet flow.

Product decision:

- the scanner still provides useful value before signup
- users can see the score, scan evidence, dimensions, and the first three priority issues
- the full Lab Brief is unlocked after submitting an email and consent checkbox
- submitted leads can be used for follow-up or remarketing according to the privacy notice

Implementation:

- configured production-only lead storage for the hosted demo
- added a hosted-demo report lead endpoint
- updated Lab Scan UI with email capture and consent
- updated privacy copy to disclose email collection and follow-up usage

Stored fields:

- email
- consent flag
- input/final scanned URL
- report ID, score, grade, issue count
- source path, referrer, and UTM fields
- sanitized report JSON
- user agent and country metadata

Verification:

```text
node --check assets/audit.js
node --check assets/site.js
node --check functions/api/lab-scan.js
node --check functions/api/report-lead.js
production lead storage migration: applied
Cloudflare Pages deploy: success
Live scan API: POST /api/lab-scan returned 200
Live lead API: POST /api/report-lead returned 200
Lead storage verification: test row was written successfully, then deleted
Live page check: Lab Scan page contains email unlock form and no old "no email required" copy
Privacy page check: email collection and follow-up usage are disclosed
```

## 2026-07-07 Resend Email Delivery

Added real email delivery for the production Lab Scan full-report flow.

Implementation:

- stored the email provider API key as a Cloudflare Pages production secret
- added Resend REST API delivery to the hosted-demo lead endpoint
- configured a default test sender and reply-to address
- added production lead storage fields for email delivery status
- updated the frontend unlock message so users know whether the report email was sent

Verification:

```text
node --check assets/audit.js
node --check assets/site.js
node --check functions/api/lab-scan.js
node --check functions/api/report-lead.js
production lead storage migration: applied
Cloudflare Pages deploy: success
POST /api/lab-scan returned 200
POST /api/report-lead returned 200
Lead storage recorded email delivery status
Resend returned a provider delivery id
Test lead rows were deleted after verification
```

Current limitation:

- With an unverified Resend test sender, email can only be sent to the Resend account owner's email address.
- To email arbitrary visitors, verify a sending domain in Resend and change the production sender to an address on that domain.

## 2026-07-07 Rich Email Report Template

Upgraded the production full-report email from a minimal delivery test template into a more complete branded SEO Lab Brief.

Added to the email:

- branded Wilson AI Lab header
- score circle and grade conclusion
- scan summary table
- top priority repair tasks
- Lab dimension bars
- scan evidence table
- full repair checklist
- practical next-step section
- richer plain-text fallback

Verification:

```text
node --check functions/api/report-lead.js
node --check functions/api/lab-scan.js
node --check assets/audit.js
node --check assets/site.js
Cloudflare Pages deploy: success
Live scan target: production test website
POST /api/lab-scan returned 200
POST /api/report-lead returned 200
Resend email delivery succeeded
Provider delivery id returned
Test lead row was deleted after verification
```

## 2026-07-07 README Hosted Demo Clarification

Clarified the documentation split between the public open-source scanner core and the Wilson AI Lab hosted production demo.

Why:

- the open-source repository intentionally remains simple and does not store scans or send email by default
- the hosted Wilson AI Lab demo now has production-only lead capture and Resend delivery
- README wording needed to prevent confusion between the forkable starter and the hosted lead magnet

Updated:

- `README.md`
- `README.zh-TW.md`

Clarified that:

- the GitHub repo does not store scan history or send emails by default
- the hosted Wilson AI Lab demo may collect email when a visitor requests the full report
- hosted demo data handling is governed by the hosted site's privacy notice
- production lead capture remains separate from the open-source starter

## 2026-07-07 Public Copy Hardening

Reviewed the public Wilson AI Lab site after the open-source alignment and removed copy that exposed internal product roadmap or service implementation details to casual visitors.

Removed or generalized:

- FAQ copy explaining that Lab Scan is only an entry point to a deeper agent workflow
- roadmap copy naming Turnstile, database, email brief, Cloudflare Worker API, GSC, WordPress patch, and agent task queues
- checkout/service copy that described the internal implementation chain too specifically
- privacy copy that mentioned email collection even though the current MVP does not collect email

Current public copy focuses on:

- how to use the open-source scanner
- whether scan data is stored
- how to fork and deploy the project
- optional customization support without exposing the internal playbook

Verification:

```text
rg scan for old FAQ, roadmap, Turnstile, email brief, agent workflow, GSC/WordPress patch wording: clean
Cloudflare Pages deploy: success
Live page check: home, Lab Scan, checkout, and privacy pages no longer contain the removed roadmap terms
API check: POST https://wilson-ai-lab.pages.dev/api/lab-scan returned 200
```
