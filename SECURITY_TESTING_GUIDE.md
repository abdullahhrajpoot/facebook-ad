# Security Testing Guide

## Manual Testing Instructions

### 1. Test CSRF Protection ✅
**Endpoint:** `POST /api/admin/users`

**Test Case 1: Without CSRF Token (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@"}'
```
**Expected:** `403 Unauthorized - CSRF token invalid`

**Test Case 2: With Valid CSRF Token (Should Succeed)**
```bash
# 1. Get CSRF token
curl http://localhost:3000/api/csrf-token

# 2. Use token in request (from response and cookies)
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <token-from-response>" \
  -d '{"email":"newuser@example.com","password":"SecurePass123!"}' \
  -b "__csrf_token=<token-from-response>"
```
**Expected:** `200 OK - User created`

---

### 2. Test SSRF Prevention ✅
**Endpoint:** `POST /api/transcribe`

**Test Case 1: Internal IP (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"http://localhost:5000/video.mp4"}'
```
**Expected:** `400 Bad Request - Invalid video URL. Only public HTTPS URLs are allowed`

**Test Case 2: Private IP Range (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"http://192.168.1.1/admin"}'
```
**Expected:** `400 Bad Request - Invalid video URL...`

**Test Case 3: AWS Metadata (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"http://169.254.169.254/latest/meta-data/"}'
```
**Expected:** `400 Bad Request - Invalid video URL...`

**Test Case 4: Valid Public URL (Should Pass)**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://example.com/video.mp4"}'
```
**Expected:** Video fetching attempt (may fail if URL invalid, but SSRF check passed)

---

### 3. Test Open Redirect Prevention ✅
**Endpoint:** `GET /auth/callback`

**Test Case 1: Malicious Redirect (Should Fail)**
```bash
curl -L "http://localhost:3000/auth/callback?code=test&next=//evil.com"
```
**Expected:** Redirects to `/user/dashboard` instead of evil.com

**Test Case 2: Protocol-Relative URL (Should Fail)**
```bash
curl -L "http://localhost:3000/auth/callback?code=test&next=//attacker.com/phishing"
```
**Expected:** Redirects to `/user/dashboard`

**Test Case 3: Absolute External URL (Should Fail)**
```bash
curl -L "http://localhost:3000/auth/callback?code=test&next=https://evil.com"
```
**Expected:** Redirects to `/user/dashboard`

**Test Case 4: Valid Relative URL (Should Succeed)**
```bash
curl -L "http://localhost:3000/auth/callback?code=test&next=/user/dashboard"
```
**Expected:** Redirects to `/user/dashboard` (valid redirect)

---

### 4. Test Password Strength Validation ✅
**Endpoint:** `POST /api/admin/users`

**Test Case 1: Too Short (Should Fail)**
```json
{"email":"user@example.com","password":"Short1!"}
```
**Expected:** `400 Bad Request - Password must be at least 8 characters long`

**Test Case 2: No Uppercase (Should Fail)**
```json
{"email":"user@example.com","password":"noupppercase1!"}
```
**Expected:** `400 Bad Request - Password must contain at least one uppercase letter`

**Test Case 3: No Lowercase (Should Fail)**
```json
{"email":"user@example.com","password":"NOLOWERCASE1!"}
```
**Expected:** `400 Bad Request - Password must contain at least one lowercase letter`

**Test Case 4: No Number (Should Fail)**
```json
{"email":"user@example.com","password":"NoNumber!@"}
```
**Expected:** `400 Bad Request - Password must contain at least one number`

**Test Case 5: No Special Character (Should Fail)**
```json
{"email":"user@example.com","password":"NoSpecial1"}
```
**Expected:** `400 Bad Request - Password must contain at least one special character`

**Test Case 6: Valid Password (Should Succeed)**
```json
{"email":"user@example.com","password":"ValidPass123!"}
```
**Expected:** `200 OK - User created` (with valid CSRF token)

---

### 5. Test Admin Authorization ✅
**Endpoint:** `DELETE /api/admin/users?id=<user_id>`

**Test Case 1: Self-Deletion (Should Fail)**
```bash
curl -X DELETE "http://localhost:3000/api/admin/users?id=<your_admin_id>" \
  -H "x-csrf-token: <token>"
```
**Expected:** `400 Bad Request - Cannot delete your own account`

**Test Case 2: Non-Admin User (Should Fail)**
```bash
# Login as regular user, then try
curl -X DELETE "http://localhost:3000/api/admin/users?id=<some_user_id>" \
  -H "x-csrf-token: <token>"
```
**Expected:** `403 Forbidden - Admin access required`

**Test Case 3: Valid Admin Delete (Should Succeed)**
```bash
# Login as admin, then try to delete different user
curl -X DELETE "http://localhost:3000/api/admin/users?id=<other_user_id>" \
  -H "x-csrf-token: <token>"
```
**Expected:** `200 OK - User deleted`

---

### 6. Test Email Validation ✅
**Endpoint:** `POST /api/admin/users`

**Test Case 1: Invalid Email (Should Fail)**
```json
{"email":"notanemail","password":"ValidPass123!"}
```
**Expected:** `400 Bad Request - Invalid email format`

**Test Case 2: Missing @ (Should Fail)**
```json
{"email":"user.example.com","password":"ValidPass123!"}
```
**Expected:** `400 Bad Request - Invalid email format`

**Test Case 3: Valid Email (Should Succeed)**
```json
{"email":"user@example.com","password":"ValidPass123!"}
```
**Expected:** `200 OK - User created` (with valid CSRF token)

---

### 7. Test Auth Rate Limiting ✅
**Endpoint:** `POST /auth/login` or `/api/auth/signin`

**Test Case: Exceed Rate Limit**
```bash
# Make 5+ rapid requests from same IP
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"wrong"}'
done
```
**Expected:** After 5th request, `429 Too Many Requests`

---

### 8. Test Error Message Sanitization ✅
**Endpoint:** `GET /auth/callback`

**Test Case: Check Error Messages Don't Expose Details**
```bash
curl "http://localhost:3000/auth/callback?error=something_went_wrong"
```
**Expected:** Redirects to `/auth/auth-code-error?error=authentication_failed` (generic message, not detailed)

---

## Automated Testing Script

```bash
#!/bin/bash
# test-security.sh

BASE_URL="http://localhost:3000"
RESULTS=0

test_csrf() {
  echo "Testing CSRF Protection..."
  
  # Get token
  TOKEN_RESPONSE=$(curl -s "$BASE_URL/api/csrf-token")
  TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get CSRF token"
    RESULTS=$((RESULTS + 1))
    return
  fi
  
  echo "✅ CSRF Token obtained: ${TOKEN:0:10}..."
}

test_ssrf() {
  echo "Testing SSRF Prevention..."
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/transcribe" \
    -H "Content-Type: application/json" \
    -d '{"videoUrl":"http://localhost:5000/video.mp4"}')
  
  if echo $RESPONSE | grep -q "Invalid video URL"; then
    echo "✅ SSRF protection working"
  else
    echo "❌ SSRF not blocked"
    RESULTS=$((RESULTS + 1))
  fi
}

test_password_validation() {
  echo "Testing Password Validation..."
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/users" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"short"}')
  
  if echo $RESPONSE | grep -q "8 characters"; then
    echo "✅ Password validation working"
  else
    echo "❌ Password validation failed"
    RESULTS=$((RESULTS + 1))
  fi
}

# Run all tests
test_csrf
test_ssrf
test_password_validation

echo ""
echo "Security Tests Complete!"
echo "Failed tests: $RESULTS"
exit $RESULTS
```

---

## Continuous Security Checklist

- [ ] Test CSRF token on each admin operation
- [ ] Test SSRF with various IP addresses
- [ ] Test open redirects with different URLs
- [ ] Test password validation with weak passwords
- [ ] Verify admin operations log user ID
- [ ] Check error logs don't contain sensitive data
- [ ] Monitor rate limit metrics
- [ ] Test with proxy tools (Burp Suite, OWASP ZAP)
- [ ] Regular security audits
- [ ] Dependency scanning (npm audit)

---

**Last Updated:** January 29, 2026
