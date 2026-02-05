# Login Debugging Guide

## 🆘 Step-by-Step Debugging

### Step 1: Check Environment Variables
1. Open `.env.local` in your project root
2. Verify these variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL=` (should have a URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (should have an API key)
   - `SUPABASE_SERVICE_ROLE_KEY=` (should have the service key)

If any are missing or empty → **Fill them in from your Supabase dashboard**

### Step 2: Check Diagnostics Page
1. Start your app: `npm run dev`
2. Go to: `http://localhost:3000/diagnostics`
3. Check each section:
   - ✅ Environment Variables should show "SET"
   - ✅ Supabase Connection should show "Connected"
   - ✅ Current Session should load without errors

### Step 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Try to login and look for logs:
   - 🔐 "Login attempt with:" - Form submitted
   - 📤 "Sending auth request to Supabase..." - Request sent
   - 📥 "Auth response:" - Server responded
   - ✅ "Auth successful" or ❌ Error message

### Step 4: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try to login and look for:
   - POST request to auth endpoint
   - Check Status: should be 200 (not 401, 500, etc.)
   - Response should contain user data

### Step 5: Verify Database Setup

#### Check if `profiles` table exists:
```sql
-- In Supabase SQL Editor, run:
SELECT * FROM profiles LIMIT 1;
```

If error → Table doesn't exist. Create it:
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Check if user exists:
```sql
-- In Supabase SQL Editor, run:
SELECT id, email FROM auth.users LIMIT 5;
```

If no results → No users in database. You need to create a test user.

### Step 6: Create a Test User

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard
2. Click "Authentication" → "Users"
3. Click "Add user"
4. Enter email and password
5. Click "Create user"
6. Click the user and note their ID

**Option B: Via SQL (faster)**
```sql
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

Then get the ID and create a profile:
```sql
INSERT INTO profiles (id, role) 
VALUES ('USER_ID_FROM_ABOVE', 'user');
```

### Step 7: Test Login
1. Go to `http://localhost:3000/auth/login`
2. Enter email: `test@example.com` (or your test user email)
3. Enter password: `TestPassword123!` (or whatever you set)
4. Click "Initialize Session"
5. Check console for logs (from Step 3)

## 🔍 Common Issues & Fixes

### Issue: "Missing Supabase environment variables"
**Symptom**: Console shows env variables are missing
**Fix**: 
- Copy `.env.local.template` to `.env.local`
- Fill in the values from your Supabase dashboard
- Restart dev server: `npm run dev`

### Issue: "signInWithPassword" returns error
**Symptom**: Error message like "Invalid login credentials"
**Possible Causes**:
- User doesn't exist in Supabase
- Password is wrong
- Email is wrong
- User account was deleted

**Fix**:
- Create a test user (see Step 6)
- Verify email and password are correct
- Check Supabase auth logs: Dashboard → Authentication → Logs

### Issue: "Profile query failed" or "Unexpected end of JSON"
**Symptom**: Auth succeeds but can't fetch profile
**Possible Causes**:
- `profiles` table doesn't exist
- User ID doesn't have a profile record
- Database permissions are restricted

**Fix**:
- Create `profiles` table (see Step 5)
- Add profile record for test user:
  ```sql
  INSERT INTO profiles (id, role) 
  VALUES ('USER_UUID', 'user');
  ```
- Check RLS policies: Dashboard → SQL Editor → Policies

### Issue: Form doesn't submit (button stays disabled)
**Symptom**: Click button but nothing happens
**Possible Causes**:
- Form validation failed (email/password empty)
- Browser JavaScript error
- Click listener not working

**Fix**:
- Check browser console for errors
- Verify email and password fields are filled
- Try refreshing the page
- Check DevTools → Elements → Form to see element state

### Issue: Login succeeds but no redirect
**Symptom**: Console shows "Auth successful" but page doesn't change
**Possible Causes**:
- Redirect path doesn't exist
- Router.push() not working
- Middleware blocking redirect

**Fix**:
- Check that `/user/dashboard` and `/admin/dashboard` exist
- Check browser console for errors
- Check Network tab for redirect response (should be 307)
- Verify middleware isn't redirecting to auth page

### Issue: "SameSite" cookie warning in console
**Symptom**: Yellow warning about SameSite cookies
**Causes**: Normal in development
**Fix**: Not needed - this is expected with iframe support

### Issue: Cookies not being saved
**Symptom**: Auth works but cookies not visible in DevTools
**Possible Causes**:
- HTTP instead of HTTPS (in production)
- Cookies blocked by browser
- SameSite=None without Secure flag

**Fix**:
- Check you're using HTTPS in production
- Check browser cookie settings (allow all)
- In DevTools → Storage → Cookies, look for `sb-*` cookies

## 📊 Detailed Network Debugging

### When login fails, check the network response:

1. Open DevTools → Network
2. Login (this creates a request)
3. Look for POST request to `/api/auth/*` or Supabase auth endpoint
4. Click it and check:

**Response Status:**
- `200` = Success
- `401` = Unauthorized (wrong credentials)
- `400` = Bad request (bad input)
- `500` = Server error

**Response Body** (click "Response" tab):
- Should contain `user` object with `id` and `email`
- If error, shows error message

## 🧪 Test Checklist

- [ ] Environment variables set in `.env.local`
- [ ] Diagnostics page shows all ✅
- [ ] Test user exists in Supabase
- [ ] Test user has profile record
- [ ] Browser console shows 🔐 "Login attempt" when form submitted
- [ ] Browser console shows ✅ "Auth successful" after submission
- [ ] No JavaScript errors in console
- [ ] Network tab shows 200 response
- [ ] Redirect happens to dashboard
- [ ] Cookies saved (check DevTools → Storage)

## 💬 Quick Debug Commands

Run these in browser console while on login page:

```javascript
// Check environment variables
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key set:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Check Supabase client
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()
console.log('Supabase:', supabase)

// Check session
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Test login manually
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'TestPassword123!'
})
console.log('Login result:', { data, error })
```

## 📞 If Still Stuck

1. **Check Supabase status page**: https://status.supabase.com
2. **Check app logs**: `npm run dev` and watch terminal for errors
3. **Verify database**: Run diagnostics page again
4. **Check security rules**: Supabase Dashboard → Database → Policies
5. **Try clearing cookies**: DevTools → Storage → Cookies → Delete all

---

**Pro Tip**: The diagnostics page (`/diagnostics`) is your friend! It will tell you exactly what's wrong.
