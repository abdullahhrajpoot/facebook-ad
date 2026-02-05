# 🔥 Login Not Working? DO THIS NOW

## 1️⃣ Open This Page First
**http://localhost:3000/diagnostics**

This will tell you exactly what's wrong.

---

## 2️⃣ Look for Red ❌ Signs

### Missing Environment Variables?
1. Open `.env.local` in project root
2. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Save and restart: `npm run dev`

### Supabase Connection Failed?
- Check your credentials
- Verify Supabase project exists
- Check https://status.supabase.com if down

### No Test User?
1. Go to Supabase dashboard
2. Click Authentication → Users
3. Click "Add user"
4. Create user with email: `test@example.com`
5. Password: `TestPassword123`

---

## 3️⃣ Try Login with Logging

1. Go to **http://localhost:3000/auth/login**
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Enter credentials and click "Initialize Session"
5. **Watch the logs** - they show what's happening

---

## 4️⃣ Read the Error Message

### Different Errors = Different Fixes:

| Error | Fix |
|-------|-----|
| "Invalid login credentials" | User doesn't exist - create one |
| "relation profiles does not exist" | Create profiles table in SQL |
| "MISSING" environment variables | Add to `.env.local` |
| "Failed to fetch" | Supabase connection issue |
| No redirect after login | Redirect path doesn't exist |

---

## 5️⃣ Create Missing Profiles Table

If you see "relation profiles does not exist":

1. Go to Supabase dashboard
2. Click **SQL Editor**
3. New query
4. Paste this:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add profiles for existing users
INSERT INTO profiles (id, role)
SELECT id, 'user' FROM auth.users;
```

5. Click **Run**

---

## 📚 Full Guides

| File | Purpose |
|------|---------|
| `LOGIN_FIX_GUIDE.md` | Quick start for login fix |
| `LOGIN_DEBUG_GUIDE.md` | Detailed debugging steps |
| `/diagnostics` | Automated diagnostics page |

---

## ✅ When It Works

You'll see logs like:
```
🔐 Login attempt with: { email: "...", password: "***" }
📤 Sending auth request to Supabase...
✅ Auth successful for user: abc123xyz
🚀 Redirecting to: /user/dashboard
```

And you'll be logged in! ✨

---

**TL;DR**: Go to `/diagnostics` and it will tell you exactly what to fix. 🎯
