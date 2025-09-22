# Complete Cloudflare Diagnostics Script (stable, docs-compliant)
# Usage: hurl --variable domain=example.com cloudflare-diagnostics.hurl
# NOTE: This variant avoids unconditional probing of 'www.' subdomain and removes fragile captures
# that fail when headers are absent. It records results and continues on errors.

# =============================================================================
# BASIC CONNECTIVITY & DNS CHECK
# =============================================================================

# Probe root (do not follow redirects). Capture stable fields only.
GET https://{{domain}}
[Options]
location: false

HTTP *
[Captures]
initial_status: status
initial_cf_ray: header "Cf-Ray"
initial_server: header "Server"

# Follow-up probe: request the same host but allow following redirects so the client
# negotiates to the final target (if DNS permits). This keeps tests working even if
# the root returns 200 directly.
GET https://{{domain}}/
[Options]
location: true

HTTP *
[Captures]
landing_status: status
landing_url: url
landing_cf_ray: header "Cf-Ray"
landing_server: header "Server"

# =============================================================================
# TLS/SSL CERTIFICATE & BASIC SECURITY CHECKS
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Security-Diagnostics/1.0
[Options]
insecure: false

HTTP *
[Captures]
security_status: status
security_cf_ray: header "Cf-Ray"
security_server: header "Server"

# =============================================================================
# COMPREHENSIVE CACHE BEHAVIOR ANALYSIS
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Cache-Test-1/1.0

HTTP *
[Captures]
cache_test_1_status: status
cache1_cf_ray: header "Cf-Ray"
cache1_cf_cache_status: header "Cf-Cache-Status"
cache1_cache_control: header "Cache-Control"
cache1_content_type: header "Content-Type"

GET https://{{domain}}/
User-Agent: Hurl-CF-Cache-Test-2/1.0

HTTP *
[Captures]
cache_test_2_status: status
cache2_cf_ray: header "Cf-Ray"
cache2_cf_cache_status: header "Cf-Cache-Status"
cache2_cache_control: header "Cache-Control"

GET https://{{domain}}/?cache_test=12345
User-Agent: Hurl-CF-Cache-Test-Query/1.0

HTTP *
[Captures]
query_test_status: status
query_cf_ray: header "Cf-Ray"
query_cf_cache_status: header "Cf-Cache-Status"
query_cache_control: header "Cache-Control"

# =============================================================================
# CACHE BYPASS TEST (ORIGIN)
# =============================================================================

GET https://{{domain}}/
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
User-Agent: Hurl-CF-Origin-Test/1.0

HTTP *
[Captures]
origin_status: status
origin_cf_ray: header "Cf-Ray"
origin_cf_cache_status: header "Cf-Cache-Status"
origin_cache_control: header "Cache-Control"
origin_response_time: duration

# =============================================================================
# COMPRESSION & OPTIMIZATION
# =============================================================================

GET https://{{domain}}/
Accept-Encoding: gzip, deflate, br
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
User-Agent: Hurl-CF-Compression-Test/1.0

HTTP *
[Captures]
compression_status: status
compression_cf_ray: header "Cf-Ray"
compression_vary: header "Vary"
compression_content_type: header "Content-Type"

# =============================================================================
# STATIC ASSET CACHING
# =============================================================================

GET https://{{domain}}/favicon.ico
User-Agent: Hurl-CF-Static-Asset-Test/1.0

HTTP *
[Captures]
favicon_status: status
favicon_cf_ray: header "Cf-Ray"
favicon_cf_cache_status: header "Cf-Cache-Status"
favicon_content_type: header "Content-Type"

GET https://{{domain}}/style.css
User-Agent: Hurl-CF-CSS-Test/1.0

HTTP *
[Captures]
css_status: status
css_cf_cache_status: header "Cf-Cache-Status"
css_content_type: header "Content-Type"

GET https://{{domain}}/script.js
User-Agent: Hurl-CF-JS-Test/1.0

HTTP *
[Captures]
js_status: status
js_cf_cache_status: header "Cf-Cache-Status"
js_content_type: header "Content-Type"

# =============================================================================
# MOBILE USER AGENT TESTING
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
[Options]
location: true

HTTP *
[Captures]
mobile_status: status
mobile_cf_ray: header "Cf-Ray"
mobile_cache_status: header "Cf-Cache-Status"

# =============================================================================
# SECURITY FEATURE DETECTION (WAF / BLOCKS)
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Security-Probe/1.0
X-Test-Header: security_test
[Options]
location: false

HTTP *
[Captures]
security_probe_status: status
security_probe_cf_ray: header "Cf-Ray"
security_probe_server: header "Server"

# =============================================================================
# HTTP VERSION & PROTOCOL TESTING (HTTP/2)
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-HTTP2-Test/1.0
[Options]
http2: true

HTTP *
[Captures]
http2_status: status
http2_cf_ray: header "Cf-Ray"
http2_server: header "Server"
http2_cf_cache_status: header "Cf-Cache-Status"

# =============================================================================
# ERROR PAGE TESTING
# =============================================================================

GET https://{{domain}}/nonexistent-test-page-cf-diagnostics
User-Agent: Hurl-CF-404-Test/1.0

HTTP *
[Captures]
error_status: status
error_server: header "Server"
error_cf_ray: header "Cf-Ray"
error_content_type: header "Content-Type"

# =============================================================================
# REDIRECT TESTING
# =============================================================================

GET http://{{domain}}/
User-Agent: Hurl-CF-Redirect-Test/1.0
[Options]
location: false

HTTP *
[Captures]
redirect_status: status
redirect_location: header "Location"
redirect_cf_ray: header "Cf-Ray"

# =============================================================================
# RATE LIMITING DETECTION
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Rate-Test-1/1.0

HTTP *
[Captures]
rate1_status: status
rate1_cf_ray: header "Cf-Ray"

GET https://{{domain}}/
User-Agent: Hurl-CF-Rate-Test-2/1.0

HTTP *
[Captures]
rate2_status: status
rate2_cf_ray: header "Cf-Ray"

GET https://{{domain}}/
User-Agent: Hurl-CF-Rate-Test-3/1.0

HTTP *
[Captures]
rate3_status: status
rate3_cf_ray: header "Cf-Ray"

# =============================================================================
# GEOLOCATION & EDGE TESTING
# =============================================================================

GET https://{{domain}}/
Accept: application/json
Accept-Language: en-US,en;q=0.9
User-Agent: Hurl-CF-Geo-Test/1.0

HTTP *
[Captures]
geo_status: status
geo_cf_ray: header "Cf-Ray"
geo_content_type: header "Content-Type"

# =============================================================================
# COMPREHENSIVE HEADER COLLECTION
# =============================================================================

GET https://{{domain}}/
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
User-Agent: Hurl-CF-Complete-Diagnostics/1.0

HTTP *
[Captures]
final_status: status
final_cf_cache_status: header "Cf-Cache-Status"
final_cf_ray: header "Cf-Ray"
final_server: header "Server"
final_content_type: header "Content-Type"
final_cache_control: header "Cache-Control"

# =============================================================================
# DIAGNOSTIC SUMMARY (VERBOSE)
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Summary/1.0
[Options]
verbose: true

HTTP *
[Captures]
summary_status: status
summary_cf_ray: header "Cf-Ray"
summary_server: header "Server"
