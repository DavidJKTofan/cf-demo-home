#!/bin/bash

# Cloudflare Diagnostics Wrapper Script
# This script runs Hurl diagnostics and provides human-readable interpretation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DOMAIN=""
TEST_PATH="/"
OUTPUT_DIR="cf_diagnostics" #_$(date +%Y%m%d_%H%M%S)
VERBOSE=false
ADVANCED=false

# Function to print colored output
print_section() {
    echo -e "\n${BLUE}▓▓▓ $1 ▓▓▓${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 -d DOMAIN [OPTIONS]

REQUIRED:
  -d DOMAIN     Domain to test (e.g., example.com)

OPTIONS:
  -p PATH       Test path (default: /)
  -o OUTPUT     Output directory (default: cf_diagnostics)
  -v            Verbose output
  -a            Run advanced tests
  -h            Show this help message

EXAMPLES:
  $0 -d example.com
  $0 -d api.example.com -p /health -v
  $0 -d example.com -a -o my_diagnostics

REQUIREMENTS:
  - hurl (https://hurl.dev/)
  - dig (for DNS checks)
  - curl (for additional checks)
EOF
}

# Parse command line arguments
while getopts "d:p:o:vah" opt; do
    case $opt in
        d) DOMAIN="$OPTARG" ;;
        p) TEST_PATH="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        v) VERBOSE=true ;;
        a) ADVANCED=true ;;
        h) usage; exit 0 ;;
        \?) echo "Invalid option -$OPTARG" >&2; usage; exit 1 ;;
    esac
done

# Validate required arguments
if [[ -z "$DOMAIN" ]]; then
    print_error "Domain is required. Use -d DOMAIN"
    usage
    exit 1
fi

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    command -v hurl >/dev/null 2>&1 || missing_deps+=("hurl")
    command -v dig >/dev/null 2>&1 || missing_deps+=("dig")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
}

# DNS diagnostics
run_dns_diagnostics() {
    print_section "DNS DIAGNOSTICS"
    
    # Check DNS resolution
    echo "Checking DNS resolution for $DOMAIN..."
    local ips
    ips=$(dig +short "$DOMAIN")
    
    if [[ -z "$ips" ]]; then
        print_error "DNS resolution failed for $DOMAIN"
        return 1
    else
        print_success "DNS resolution successful"
        echo "Resolved IPs:"
        echo "$ips" | while read -r ip; do
            echo "  - $ip"
        done
    fi
    
    # Check nameservers
    echo -e "\nChecking nameservers..."
    local nameservers
    nameservers=$(dig +short NS "$DOMAIN")
    echo "Nameservers:"
    echo "$nameservers" | while read -r ns; do
        if [[ "$ns" == *"cloudflare.com." ]]; then
            print_success "  - $ns (Cloudflare - Full Setup)"
        else
            print_info "  - $ns"
        fi
    done
    
    # Check if IPs are Cloudflare IPs (simplified check)
    echo -e "\nChecking if IPs belong to Cloudflare..."
    echo "$ips" | while read -r ip; do
        # This is a simplified check - in practice, you'd check against Cloudflare's IP ranges
        local whois_result
        whois_result=$(curl -s "https://ipinfo.io/$ip/org" 2>/dev/null || echo "Unknown")
        if [[ "$whois_result" == *"Cloudflare"* ]]; then
            print_success "  - $ip: Cloudflare IP"
        else
            print_warning "  - $ip: $whois_result (May not be Cloudflare)"
        fi
    done
}

# Interpret cache status
interpret_cache_status() {
    local status="$1"
    case "$status" in
        "HIT") print_success "Cache HIT - Content served from Cloudflare cache" ;;
        "MISS") print_info "Cache MISS - Content fetched from origin server" ;;
        "EXPIRED") print_warning "Cache EXPIRED - Cached content was stale, fetched fresh" ;;
        "BYPASS") print_info "Cache BYPASS - Request bypassed cache (cache rules or headers)" ;;
        "DYNAMIC") print_info "Cache DYNAMIC - Dynamic content, not cached" ;;
        "REVALIDATED") print_success "Cache REVALIDATED - Cached content validated with origin" ;;
        *) print_warning "Unknown cache status: $status" ;;
    esac
}

# Run main diagnostics
run_main_diagnostics() {
    print_section "RUNNING HURL DIAGNOSTICS"
    
    local hurl_output_file="$OUTPUT_DIR/hurl_main_output.txt"
    local hurl_json_dir="$OUTPUT_DIR/hurl_results"
    local hurl_html_file="$OUTPUT_DIR/hurl_report.html"
    
    echo "Running main diagnostic tests..."
    
    # Check if we have the Hurl file
    if [[ ! -f "cloudflare-diagnostics.hurl" ]]; then
        print_error "cloudflare-diagnostics.hurl file not found in current directory"
        print_info "Please ensure the Hurl script is in the same directory as this wrapper"
        return 1
    fi
    
    # Run Hurl with proper options and continue on errors
    if $VERBOSE; then
        hurl --variable domain="$DOMAIN" \
             --report-json "$hurl_json_dir" \
             --report-html "$hurl_html_file" \
             --continue-on-error \
             --very-verbose \
             cloudflare-diagnostics.hurl 2>&1 | tee "$hurl_output_file"
    else
        hurl --variable domain="$DOMAIN" \
             --report-json "$hurl_json_dir" \
             --report-html "$hurl_html_file" \
             --continue-on-error \
             cloudflare-diagnostics.hurl > "$hurl_output_file" 2>&1 || true
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        print_success "All Hurl diagnostics completed successfully"
    elif [[ $exit_code -eq 3 ]]; then
        print_warning "Some tests failed but execution continued (exit code 3)"
        print_info "This is normal - some tests may fail due to missing files or security blocks"
    elif [[ $exit_code -eq 4 ]]; then
        print_warning "Some assertions failed but execution continued (exit code 4)" 
        print_info "Check the detailed output for which specific tests failed"
    else
        print_warning "Hurl completed with exit code $exit_code"
        print_info "Some issues occurred but we collected diagnostic data"
    fi
    
    return $exit_code
}

# ---------------------------
# Robust helpers + analysis
# ---------------------------

# sanitize to integer: extract first digit sequence, force base-10, default 0
_to_int() {
    # usage: _to_int "$maybe_number"
    local raw digits num
    raw="$1"
    # get first contiguous sequence of digits (if any)
    digits=$(printf '%s' "$raw" | grep -oE '[0-9]+' | head -n1 || true)
    if [[ -z "$digits" ]]; then
        printf '%d' 0
        return
    fi
    # force base-10 interpretation to avoid octal errors on leading zeros
    # and print as decimal integer
    num=$((10#$digits))
    printf '%d' "$num"
}

analyze_results() {
    print_section "RESULTS ANALYSIS"

    local json_dir="$OUTPUT_DIR/hurl_results"
    local json_file="$json_dir/report.json"
    local html_path="$OUTPUT_DIR/hurl_report.html"
    local output_file="$OUTPUT_DIR/hurl_main_output.txt"

    echo "Analyzing Cloudflare configuration..."

    if [[ -f "$json_file" && -r "$json_file" ]]; then
        print_success "JSON report found: $json_file"
        if command -v jq >/dev/null 2>&1; then
            print_info "Parsing results with jq..."
            local total_entries raw_success raw_blocked raw_error
            raw_total=$(jq '.entries | length' "$json_file" 2>/dev/null || echo "0")
            total_entries=$(_to_int "$raw_total")
            raw_success=$(jq '[.entries[] | select(.response.status < 400)] | length' "$json_file" 2>/dev/null || echo "0")
            raw_blocked=$(jq '[.entries[] | select(.response.status == 403)] | length' "$json_file" 2>/dev/null || echo "0")
            raw_error=$(jq '[.entries[] | select(.response.status >= 400 and .response.status != 403)] | length' "$json_file" 2>/dev/null || echo "0")
            raw_success=$(_to_int "$raw_success")
            raw_blocked=$(_to_int "$raw_blocked")
            raw_error=$(_to_int "$raw_error")

            print_info "Total requests processed: $total_entries"
            print_success "Successful requests: $raw_success"
            print_warning "Blocked requests (403): $raw_blocked"
            print_error "Error requests (4xx/5xx): $raw_error"
        else
            print_info "jq not available; skipping JSON parsing (falling back to text analysis)"
        fi
    elif [[ -d "$json_dir" ]]; then
        print_warning "JSON report directory found but report.json missing: $json_dir"
        ls -la "$json_dir" 2>/dev/null || true
    else
        print_warning "JSON results not found: $json_dir"
    fi

    # HTML detection tolerant of file or directory
    if [[ -f "$html_path" ]]; then
        print_success "HTML report generated: $html_path"
        print_info "Open in browser: file://$PWD/$html_path"
    elif [[ -d "$html_path" ]]; then
        if [[ -f "$html_path/index.html" ]]; then
            print_success "HTML report generated: $html_path/index.html"
            print_info "Open in browser: file://$PWD/$html_path/index.html"
        else
            local any_html
            any_html=$(find "$html_path" -maxdepth 1 -type f -iname "*.html" -print -quit 2>/dev/null || true)
            if [[ -n "$any_html" ]]; then
                print_success "HTML report generated: $any_html"
                print_info "Open in browser: file://$PWD/$any_html"
            else
                print_warning "HTML report directory exists but no HTML file found: $html_path"
            fi
        fi
    else
        print_warning "HTML report not found: $html_path (checked both file and directory)"
    fi

    # Basic textual analysis of raw hurl output (if present)
    if [[ -f "$output_file" && -r "$output_file" ]]; then
        echo -e "\n${PURPLE}Cache Status Summary:${NC}"
        # extract statuses into lines; sanitize later
        grep -i "cf-cache-status" "$output_file" 2>/dev/null | \
            sed -E 's/.*[Cc]f-[Cc]ache-[Ss]tatus[: ]*([A-Za-z0-9_-]+).*/\1/I' | \
            tr '[:lower:]' '[:upper:]' | \
            sort | uniq -c | \
            awk '{printf "%s %s\n", $1, $2}' | \
            while read -r count status; do
                count=$(_to_int "$count")
                status=${status:-UNKNOWN}
                if [[ "$status" == "HIT" ]]; then
                    print_success "  $count x $status (Cache working)"
                elif [[ "$status" == "MISS" ]]; then
                    print_info "  $count x $status (Fetched from origin)"
                elif [[ "$status" == "BYPASS" ]]; then
                    print_warning "  $count x $status (Cache bypassed)"
                else
                    echo "  $count x $status"
                fi
            done

        echo -e "\n${PURPLE}Response Status Summary:${NC}"
        grep -E -o "HTTP/[0-9.]+ [0-9]{3}" "$output_file" 2>/dev/null | \
            awk '{print $2}' | sort | uniq -c | \
            while read -r count status; do
                count=$(_to_int "$count")
                status=${status:-UNKNOWN}
                if [[ "$status" =~ ^2[0-9][0-9]$ ]]; then
                    print_success "  $count x $status (Success)"
                elif [[ "$status" == "403" ]]; then
                    print_warning "  $count x $status (Blocked by security)"
                elif [[ "$status" == "404" ]]; then
                    print_info "  $count x $status (Not found - expected for some tests)"
                elif [[ "$status" =~ ^[45][0-9][0-9]$ ]]; then
                    print_error "  $count x $status (Error)"
                else
                    echo "  $count x $status"
                fi
            done

        echo -e "\n${PURPLE}Cloudflare Ray IDs (First 5):${NC}"
        grep -i "cf-ray" "$output_file" 2>/dev/null | \
            sed -E 's/.*[Cc]f-[Rr]ay[: ]*([a-f0-9-]+).*/\1/I' | \
            awk 'NF' | head -5 | \
            while read -r ray; do
                echo "  - $ray"
            done

        echo -e "\n${PURPLE}Security Headers Detected:${NC}"
        local security_headers=( "cf-mitigated" "strict-transport-security" "x-frame-options" "content-security-policy" )
        for header in "${security_headers[@]}"; do
            local cnt
            cnt=$(grep -i "$header" "$output_file" 2>/dev/null | wc -l || echo 0)
            cnt=$(_to_int "$cnt")
            if (( cnt > 0 )); then
                print_success "  $header: $cnt occurrences"
            fi
        done
    else
        print_warning "Raw Hurl output not found: $output_file"
    fi

    # Print generated files summary
    echo -e "\n${CYAN}Generated Files:${NC}"
    [[ -f "$output_file" ]] && echo "  📄 Raw output: $output_file"
    if [[ -f "$html_path" ]]; then
        echo "  🌐 HTML report: $html_path"
    elif [[ -d "$html_path" && -f "$html_path/index.html" ]]; then
        echo "  🌐 HTML report: $html_path/index.html"
    fi
    [[ -f "$json_file" ]] && echo "  📊 JSON data: $json_file"
    [[ -d "$json_dir/store" ]] && echo "  💾 Response store: $json_dir/store/"
}

generate_recommendations() {
    print_section "RECOMMENDATIONS & TROUBLESHOOTING"

    local output_file="$OUTPUT_DIR/hurl_main_output.txt"

    echo "Based on the diagnostics, here are some recommendations:"
    echo

    if [[ -f "$output_file" && -r "$output_file" ]]; then
        local hit_count miss_count bypass_count blocked_count success_count total_count

        hit_count=$(grep -i "cf-cache-status" "$output_file" 2>/dev/null | \
            sed -E 's/.*[Cc]f-[Cc]ache-[Ss]tatus[: ]*([A-Za-z0-9_-]+).*/\1/I' | \
            tr '[:lower:]' '[:upper:]' | grep -xc "HIT" || echo 0)
        miss_count=$(grep -i "cf-cache-status" "$output_file" 2>/dev/null | \
            sed -E 's/.*[Cc]f-[Cc]ache-[Ss]tatus[: ]*([A-Za-z0-9_-]+).*/\1/I' | \
            tr '[:lower:]' '[:upper:]' | grep -xc "MISS" || echo 0)
        bypass_count=$(grep -i "cf-cache-status" "$output_file" 2>/dev/null | \
            sed -E 's/.*[Cc]f-[Cc]ache-[Ss]tatus[: ]*([A-Za-z0-9_-]+).*/\1/I' | \
            tr '[:lower:]' '[:upper:]' | grep -xc "BYPASS" || echo 0)
        blocked_count=$(grep -E "HTTP/[0-9.]+ 403" "$output_file" 2>/dev/null | wc -l || echo 0)
        success_count=$(grep -E "HTTP/[0-9.]+ 2[0-9][0-9]" "$output_file" 2>/dev/null | wc -l || echo 0)

        hit_count=$(_to_int "$hit_count")
        miss_count=$(_to_int "$miss_count")
        bypass_count=$(_to_int "$bypass_count")
        blocked_count=$(_to_int "$blocked_count")
        success_count=$(_to_int "$success_count")

        total_count=$(( hit_count + miss_count + bypass_count ))

        echo "📊 PERFORMANCE ANALYSIS:"
        if (( hit_count > miss_count )); then
            print_success "  Cache is working well ($hit_count HITs vs $miss_count MISSes)"
        elif (( bypass_count > 5 )); then
            print_warning "  Many cache BYPASSes detected ($bypass_count) - check cache rules"
        else
            print_info "  Cache behavior: ${hit_count} HITs, ${miss_count} MISSes, ${bypass_count} BYPASSes"
        fi

        echo
        echo "🔐 SECURITY ANALYSIS:"
        if (( blocked_count > 0 )); then
            print_success "  Security features active (${blocked_count} blocked requests)"
        else
            print_info "  No blocked requests detected (may indicate lenient security settings)"
        fi

        if (( success_count > 0 )); then
            print_info "  Successful requests: ${success_count}"
        fi
    else
        print_warning "No Hurl output available to generate actionable recommendations."
    fi

    # Rest of recommendations (static)
    echo
    echo "🔍 CACHE OPTIMIZATION:"
    echo "  - If you see many MISS statuses, consider adjusting cache rules"
    echo "  - BYPASS statuses might indicate cache-busting headers from origin"
    echo "  - Check Page Rules and Cache Rules in Cloudflare dashboard"
    echo "  - Static assets (favicon.ico, *.css, *.js) should typically show HIT"
    echo
    echo "🔐 SECURITY RECOMMENDATIONS:"
    echo "  - Ensure HSTS headers are present for security"
    echo "  - 403 responses in security tests indicate WAF is working"
    echo "  - Check if essential requests are being falsely blocked"
    echo "  - Review Security Events in Cloudflare dashboard"
    echo
    echo "⚡ PERFORMANCE RECOMMENDATIONS:"
    echo "  - Look for compression headers (Content-Encoding: gzip/br)"
    echo "  - Check if HTTP/2 or HTTP/3 is enabled"
    echo "  - Verify ETags are being used for cache validation"
    echo "  - Monitor Time to First Byte (TTFB) in detailed logs"
    echo
    echo "🌐 DNS & SETUP:"
    echo "  - Cloudflare nameservers indicate Full Setup (recommended)"
    echo "  - Non-Cloudflare nameservers suggest CNAME setup (partial)"
    echo "  - Verify all subdomains are properly configured"
    echo
    echo "📋 NEXT STEPS:"
    echo "  1. Review HTML report: $OUTPUT_DIR/hurl_report.html (or $OUTPUT_DIR/hurl_report.html/index.html)"
    echo "  2. Compare cache status across different requests"
    echo "  3. Test with cache bypass to isolate origin vs edge issues"
    echo "  4. Use Cloudflare Analytics for deeper insights"
    echo "  5. Check Security Events tab in Cloudflare dashboard"
    echo "  6. Monitor real user metrics in Performance tab"
    echo
    echo "🚨 TROUBLESHOOTING TIPS:"
    echo "  - If many 403s: Check WAF rules and whitelist legitimate traffic"
    echo "  - If no cache HITs: Verify origin Cache-Control headers"
    echo "  - If slow responses: Check origin server performance"
    echo "  - If SSL errors: Verify certificate configuration"
}

# Main execution
main() {
    echo -e "${CYAN}"
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
    echo "▓                                      ▓"
    echo "▓    CLOUDFLARE DIAGNOSTICS TOOL       ▓"
    echo "▓                                      ▓"
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"
    echo -e "${NC}\n"
    
    print_info "Domain: $DOMAIN"
    print_info "Test Path: $TEST_PATH"
    print_info "Output Directory: $OUTPUT_DIR"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Check dependencies
    check_dependencies
    
    # Run diagnostics
    run_dns_diagnostics
    run_main_diagnostics
    
    # Run advanced tests if requested
    if $ADVANCED; then
        print_section "ADVANCED DIAGNOSTICS"
        print_info "Running advanced tests..."
        # Advanced tests would go here
    fi
    
    # Analyze results
    analyze_results
    
    # Generate recommendations
    generate_recommendations
    
    print_section "DIAGNOSTICS COMPLETE"
    print_success "All diagnostics completed!"
    print_info "Results saved to: $OUTPUT_DIR"
}

# Run main function
main "$@"
