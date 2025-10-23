# Cloudflare Demo Security Tests
# Usage:
#   hurl --variable domain=automatic-demo.com cloudflare-demos.hurl
# WARNING: Only run against domains you own or have permission to test.

# =============================================================================
# DDOS SIMULATION - RAPID SEQUENTIAL REQUESTS (10)
# =============================================================================

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-1/1.0

HTTP *
[Captures]
ddos1_status: status
ddos1_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-2/1.0

HTTP *
[Captures]
ddos2_status: status
ddos2_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-3/1.0

HTTP *
[Captures]
ddos3_status: status
ddos3_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-4/1.0

HTTP *
[Captures]
ddos4_status: status
ddos4_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-5/1.0

HTTP *
[Captures]
ddos5_status: status
ddos5_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-6/1.0

HTTP *
[Captures]
ddos6_status: status
ddos6_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-7/1.0

HTTP *
[Captures]
ddos7_status: status
ddos7_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-8/1.0

HTTP *
[Captures]
ddos8_status: status
ddos8_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-9/1.0

HTTP *
[Captures]
ddos9_status: status
ddos9_ray: header "Cf-Ray"

GET https://{{domain}}/?blockme=npvenJAo9gMlnd5yD37xQ9P2qp3934
User-Agent: Hurl-DDoS-Test-10/1.0

HTTP *
[Captures]
ddos10_status: status
ddos10_ray: header "Cf-Ray"

# =============================================================================
# LEAKED CREDENTIALS CHECK - application/x-www-form-urlencoded (use [Form])
# =============================================================================

POST https://{{domain}}/
User-Agent: Hurl-Credentials-Test-Form/1.0
[Form]
username: CF_EXPOSED_USERNAME@example.com
password: CF_EXPOSED_PASSWORD

HTTP *
[Captures]
creds_form_status: status
creds_form_ray: header "Cf-Ray"

# =============================================================================
# LEAKED CREDENTIALS CHECK - JSON body
# =============================================================================

POST https://{{domain}}/login
User-Agent: Hurl-Credentials-Test-JSON/1.0
Content-Type: application/json

{
  "email": "CF_EXPOSED_USERNAME@example.com",
  "passwd": "CF_EXPOSED_PASSWORD"
}

HTTP *
[Captures]
creds_json_status: status
creds_json_ray: header "Cf-Ray"

# =============================================================================
# WAF CONTENT SCANNING - MALICIOUS UPLOAD SIMULATION (multiline multipart body)
# =============================================================================

POST https://{{domain}}/upload
User-Agent: Hurl-Malicious-Upload-Test/1.0
[Multipart]
field1: file,eicar_com.pdf; text/plain

HTTP *
[Captures]
upload_status: status
upload_ray: header "Cf-Ray"

# =============================================================================
# CLOUDFLARE IMAGED DELIVERY - public examples
# =============================================================================

GET https://imagedelivery.net/2sbFr08YIps0arOTfjTqvQ/315f4dee-cba5-4b44-b12c-b77cccc79a00/w=250,quality=50,rotate=180
User-Agent: Hurl-CF-Images-Test-1/1.0

HTTP *
[Captures]
img1_status: status
img1_content_type: header "Content-Type"

GET https://imagedelivery.net/2sbFr08YIps0arOTfjTqvQ/315f4dee-cba5-4b44-b12c-b77cccc79a00/w=500,quality=75,rotate=90
User-Agent: Hurl-CF-Images-Test-2/1.0

HTTP *
[Captures]
img2_status: status
img2_content_type: header "Content-Type"

GET https://imagedelivery.net/2sbFr08YIps0arOTfjTqvQ/315f4dee-cba5-4b44-b12c-b77cccc79a00/w=800,quality=95,rotate=270
User-Agent: Hurl-CF-Images-Test-3/1.0

HTTP *
[Captures]
img3_status: status
img3_content_type: header "Content-Type"

GET https://imagedelivery.net/2sbFr08YIps0arOTfjTqvQ/315f4dee-cba5-4b44-b12c-b77cccc79a00/w=100,quality=25
User-Agent: Hurl-CF-Images-Test-4/1.0

HTTP *
[Captures]
img4_status: status
img4_content_type: header "Content-Type"

# =============================================================================
# CLOUDFLARE IMAGE TRANSFORMATIONS (cdn-cgi/image) on your domain
# =============================================================================

GET https://{{domain}}/cdn-cgi/image/width=800,quality=75,fit=scale-down/demos/performance/img/munich-original-img.jpeg
User-Agent: Hurl-CF-Transform-Test-1/1.0

HTTP *
[Captures]
transform1_status: status
transform1_content_type: header "Content-Type"

GET https://{{domain}}/cdn-cgi/image/width=400,quality=85,fit=cover/demos/performance/img/munich-original-img.jpeg
User-Agent: Hurl-CF-Transform-Test-2/1.0

HTTP *
[Captures]
transform2_status: status
transform2_content_type: header "Content-Type"

GET https://{{domain}}/cdn-cgi/image/width=600,quality=90,fit=crop/demos/performance/img/munich-original-img.jpeg
User-Agent: Hurl-CF-Transform-Test-3/1.0

HTTP *
[Captures]
transform3_status: status
transform3_content_type: header "Content-Type"

GET https://{{domain}}/cdn-cgi/image/width=300,quality=60,fit=contain/demos/performance/img/munich-original-img.jpeg
User-Agent: Hurl-CF-Transform-Test-4/1.0

HTTP *
[Captures]
transform4_status: status
transform4_content_type: header "Content-Type"

# =============================================================================
# WAF MANAGED RULES - attack payloads (URL-encoded where necessary)
# =============================================================================

GET https://{{domain}}/?url=file:///etc/passwd
User-Agent: Hurl-WAF-FileInclusion-Test/1.0

HTTP *
[Captures]
waf1_status: status
waf1_ray: header "Cf-Ray"

GET https://{{domain}}/?id=1%27%20OR%20%271%27%3D%271
User-Agent: Hurl-WAF-SQLInjection-Test/1.0

HTTP *
[Captures]
waf2_status: status
waf2_ray: header "Cf-Ray"

GET https://{{domain}}/?search=%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E
User-Agent: Hurl-WAF-XSS-Test/1.0

HTTP *
[Captures]
waf3_status: status
waf3_ray: header "Cf-Ray"

GET https://{{domain}}/?page=..%2F..%2F..%2Fetc%2Fpasswd
User-Agent: Hurl-WAF-DirectoryTraversal-Test/1.0

HTTP *
[Captures]
waf4_status: status
waf4_ray: header "Cf-Ray"

GET https://{{domain}}/?cmd=%3Bcat%20%2Fetc%2Fpasswd
User-Agent: Hurl-WAF-CommandInjection-Test/1.0

HTTP *
[Captures]
waf5_status: status
waf5_ray: header "Cf-Ray"

GET https://{{domain}}/?file=php%3A%2F%2Finput
User-Agent: Hurl-WAF-PHPInjection-Test/1.0

HTTP *
[Captures]
waf6_status: status
waf6_ray: header "Cf-Ray"

# =============================================================================
# ADDITIONAL ENCODING BYPASS ATTEMPTS
# =============================================================================

GET https://{{domain}}/?url=%66%69%6c%65%3a%2f%2f%2f%65%74%63%2f%70%61%73%73%77%64
User-Agent: Hurl-WAF-URLEncoded-Test/1.0

HTTP *
[Captures]
bypass1_status: status
bypass1_ray: header "Cf-Ray"

GET https://{{domain}}/?url=%2566%2569%256c%2565%253a%252f%252f%252f%2565%2574%2563%252f%2570%2561%2573%2573%2577%2564
User-Agent: Hurl-WAF-DoubleEncoded-Test/1.0

HTTP *
[Captures]
bypass2_status: status
bypass2_ray: header "Cf-Ray"

# =============================================================================
# HMAC-SIGNED DOWNLOADS - explicit host tests
# =============================================================================
# Signed HMAC download: BIN (100MB)
GET https://hmac.automatic-demo.com/downloads/100MB.bin
User-Agent: Hurl-HMAC-Download-100MB/1.0

HTTP *
[Captures]
hmac_bin_status: status
hmac_bin_ray: header "Cf-Ray"

# Signed HMAC download: EICAR PDF
GET https://hmac.automatic-demo.com/downloads/eicar_com.pdf
User-Agent: Hurl-HMAC-Download-EICAR/1.0

HTTP *
[Captures]
hmac_eicar_status: status
hmac_eicar_ray: header "Cf-Ray"

# =============================================================================
# FIREWALL FOR AI API TEST
# =============================================================================

POST https://dls-ai.dlsdemo.com
User-Agent: Hurl-DLS-Firewall-for-AI-Test/1.0
Content-Type: application/json

{
  "prompt": "user@example.com"
}

HTTP *
[Captures]
dls_ai_status: status
dls_ai_ray: header "Cf-Ray"

# =============================================================================
# SUMMARY REQUEST
# =============================================================================

GET https://{{domain}}/
User-Agent: Hurl-CF-Demo-Summary/1.0

HTTP *
[Captures]
summary_status: status
summary_ray: header "Cf-Ray"
summary_server: header "Server"
summary_content_type: header "Content-Type"
