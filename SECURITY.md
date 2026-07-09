# Security

## Current Safeguards

The scanner includes basic safeguards for an MVP:

- only `http` and `https` URLs are accepted
- URLs with embedded credentials are rejected
- localhost and internal-looking hostnames are rejected
- private IPv4 ranges are rejected
- common local IPv6 ranges are rejected
- fetches use timeouts
- HTML input is capped before parsing
- responses are not stored

## Important Limitations

This is still an MVP. Before production use, add:

- Cloudflare Turnstile or another abuse-control mechanism
- per-IP rate limiting
- stricter DNS / redirect validation
- logging with privacy controls
- queue-based scanning for slow sites
- monitoring and alerting

## Responsible Use

Only scan websites you own or are authorized to test. Do not use this project for large-scale crawling, spam, or scanning private systems.

## Reporting Issues

If you find a security issue in your fork, patch it before deploying publicly. If this repository is maintained publicly, open a private security advisory or contact the maintainer directly.
