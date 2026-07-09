# Open SEO Lab Scanner

[繁體中文說明](README.zh-TW.md) | English

An open-source SEO scanner MVP that runs on Cloudflare Pages.

**Live Demo:** https://wilson-ai-lab.pages.dev/tools/lab-scan/

Type a public website URL, and the app fetches the homepage from a Pages Function, extracts SEO signals, and returns a small Lab Brief with score, evidence, dimensions, and prioritized fixes.

Built by Wilson AI Lab as a transparent starter project for people who want to learn how an SEO audit flow can move from demo UI to a deployable MVP.

## Hosted Demo vs Open-source Core

The GitHub repository is the open-source scanner core. It does not store scan history or send email reports by default.

The hosted Wilson AI Lab demo may include production-only lead capture features, such as unlocking a fuller report after email consent and sending that report through an email provider. Those production additions are intentionally separate from the open-source starter so the public repo stays simple, forkable, and safe to inspect.

## MVP Status

This repository is ready to share as a complete open-source MVP.

Included:

- static frontend for entering a public website URL
- Cloudflare Pages Function API for live homepage scanning
- scoring, evidence, dimensions, and prioritized issue output
- SSRF-oriented URL validation for local/private targets
- bilingual README documentation
- architecture and security notes
- Cloudflare Pages deployment config

Not included by default:

- email capture or email delivery
- database storage
- analytics or remarketing pixels
- account login
- private Wilson AI Lab production assets

Those are intentionally left out so the repository stays clean, easy to fork, and safe for public sharing.

## What It Checks

- HTTP status, HTTPS, content type, and response time
- `title`, `meta description`, `H1`, `canonical`, and robots meta
- `robots.txt` and `sitemap.xml`
- Open Graph signals
- JSON-LD structured data
- Image alt coverage
- Internal and external link counts
- Approximate readable text volume

## What It Does Not Do Yet

- It does not send email reports.
- It does not save scan history.
- It does not connect Google Search Console.
- It does not modify the scanned website.
- It does not replace a full technical SEO audit.

Those are intentionally left as extension points.

## Project Structure

```text
.
├── index.html
├── assets/
│   ├── app.js
│   ├── lab-grid.svg
│   ├── logo.svg
│   └── styles.css
├── functions/
│   └── api/
│       └── lab-scan.js
├── ARCHITECTURE.md
├── SECURITY.md
├── wrangler.jsonc
└── package.json
```

## Local Development

Install Wrangler through `npx` and start a local Pages dev server:

```bash
npx wrangler pages dev . --compatibility-date=2026-06-24
```

Open:

```text
http://localhost:8788
```

Then scan a public website such as:

```text
https://example.com
```

## Deploy To Cloudflare Pages

```bash
npx wrangler pages deploy . --project-name open-seo-lab-scanner
```

You can also connect this repository to Cloudflare Pages and use the default static output root:

```text
/
```

Cloudflare Pages automatically detects the `functions/api/lab-scan.js` route.

## API Example

```bash
curl -X POST "http://localhost:8788/api/lab-scan" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","language":"zh"}'
```

The response includes:

```json
{
  "reportId": "OSL-123ABC",
  "score": 82,
  "grade": {},
  "dimensions": [],
  "issues": [],
  "summary": {}
}
```

## Privacy Notes

This open-source core does not store user input, email addresses, or scan results. The scanned URL is sent to the Cloudflare Pages Function only for the current request.

The Wilson AI Lab hosted demo may collect an email address when a visitor requests the full report. In that case, the hosted site's own privacy notice applies.

If you add email reports, analytics, a database, or account features, update this README and add a real privacy policy before production use.

## Origin

This project was created as a Wilson AI Lab open-source MVP. It follows common SEO audit product patterns, but the implementation, copy, UI, API, and scoring logic in this repository are written for this project.

## License

MIT
