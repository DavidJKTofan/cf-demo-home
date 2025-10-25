# Cloudflare Diagnostics with Hurl - Usage Guide

This collection of scripts helps you troubleshoot Cloudflare-proxied websites using [Hurl](https://hurl.dev/), providing some insights into DNS resolution, TLS/SSL configuration, caching behavior, and Cloudflare-specific settings.

## How To Use

```bash
# Basic diagnostics
hurl --variable domain=example.com cloudflare-diagnostics.hurl

# Generate HTML report
hurl --variable domain=example.com cloudflare-diagnostics.hurl --report-html cf-report.html

# Run General Diagnostic Script
./cf-diagnostics.sh -d example.com

# Run Security Demo
hurl --variable domain=automatic-demo.com cloudflare-demos.hurl --report-html cf-report.html
```

### Note

EICAR files are available for [download](https://www.eicar.org/download-anti-malware-testfile/) and malware testing.
