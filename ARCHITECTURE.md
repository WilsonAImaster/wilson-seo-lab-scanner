# Architecture

Open SEO Lab Scanner is intentionally small:

```text
Browser
  -> static HTML/CSS/JS
  -> POST /api/lab-scan
  -> Cloudflare Pages Function
  -> public target homepage
  -> Lab Brief JSON
  -> browser renders result
```

## Frontend

The frontend is framework-free:

- `index.html` contains the page structure.
- `assets/styles.css` contains all styling.
- `assets/app.js` handles form state, the human-check placeholder, API calls, and result rendering.

## Backend

`functions/api/lab-scan.js` is a Cloudflare Pages Function.

It:

- accepts `POST` requests with `{ "url": "...", "language": "zh" | "en" }`
- normalizes and validates the URL
- rejects local, private, and internal-looking hosts
- fetches the target homepage
- parses common SEO signals from HTML
- checks `robots.txt` and `sitemap.xml`
- returns a score, dimensions, issues, and evidence

## Scoring Model

The score starts at 100 and subtracts points for missing or weak signals:

- non-2xx status
- non-HTML response
- non-HTTPS final URL
- missing or out-of-range title / description
- missing or duplicated H1
- missing or mismatched canonical
- `noindex`
- missing viewport / language / Open Graph / JSON-LD
- weak image alt coverage
- thin readable content
- too few internal links
- missing robots or sitemap
- slow response

This is a simple MVP scoring model, not an official search engine ranking model.

## Extension Points

Good next steps:

- Cloudflare Turnstile validation
- rate limiting
- queue-based scan jobs
- scan history storage
- email / PDF reports
- Google Search Console integration
- WordPress patch generation
- AI-generated repair briefs
