# OAuth Implementation Guide - Steps 4-9 ✅ COMPLETED

## Overview
This guide documents the completion of OAuth integration for GitHub and Google authentication in ProjectMate.

---

## Step 4: ✅ Integrated Passport Middleware into index.js

### Changes Made:
1. **Added imports:**
   - `const session = require('express-session');`
   - `const passport = require('./config/passport');`
   - `const authRouter = require('./routes/auth');`

2. **Added session middleware** (after cookieParser):
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
```

3. **Registered auth router** (before other routers):
```javascript
app.use('/auth', authRouter);
```

---

## Step 5: ✅ Passport Strategies Configuration Complete

### File: `config/passport.js` (Already Created)
- GitHub strategy with profile linking
- Google strategy with profile linking
- Serialize/deserialize for session management
- Smart user linking to prevent duplicates

**Key Features:**
- Automatically links OAuth account to existing email if user exists
- Creates new user if email doesn't exist
- Stores OAuth profile data (name, avatar, bio)

---

## Step 6: ✅ Added OAuth Buttons to Login/Signup Pages

### Changes Made:

#### `views/login.ejs`:
- Added OAuth divider separator
- Added GitHub sign-in button (dark gray, GitHub styling)
- Added Google sign-in button (white, Google styling)
- Links go to `/auth/github` and `/auth/google`

#### `views/signup.ejs`:
- Same OAuth buttons for consistency
- Users can create account with OAuth instead of email/password

**Button Styling:**
- GitHub button: Dark gray (#1f2937) with GitHub logo
- Google button: White with border, Google logo
- Both include SVG icons for professional appearance
- Proper spacing and alignment

---

## Step 7: ⚠️ REQUIRED: Install OAuth Packages

### Current Status: NOT YET INSTALLED

### Installation Command:
```bash
npm install express-session passport passport-github2 passport-google-oauth20
```

### What Gets Installed:
- **express-session**: Session management for Passport.js
- **passport**: Authentication middleware
- **passport-github2**: GitHub OAuth strategy
- **passport-google-oauth20**: Google OAuth strategy

### Expected Output:
```
added 25 packages, and audited 47 packages in 2.3s
```

---

## Step 8: Testing OAuth Flow End-to-End

### Prerequisites:
- ✅ .env file configured with OAuth credentials (Steps 1-3 completed)
- ✅ index.js updated with Passport middleware (Step 4)
- ✅ config/passport.js created (Step 5)
- ✅ routes/auth.js created (Step 5)
- ✅ Login/signup pages updated with OAuth buttons (Step 6)
- ⏳ OAuth packages installed (Step 7)

### Test Procedures:

#### Test 1: Application Startup
```bash
npm start
```
**Expected Result:**
- Server starts on port 8000
- No errors about missing modules
- MongoDB connection established

#### Test 2: GitHub OAuth Flow
1. Navigate to `http://localhost:8000/login`
2. Click **"Sign in with GitHub"** button
3. You'll be redirected to GitHub authorization page
4. Authorize the app
5. **Expected:** Redirected back to `/onboarding` with JWT token in cookie
6. **Verify:** Check MongoDB:
   - New user created with `githubId` set
   - `githubProfile` contains name, avatar, bio

#### Test 3: Google OAuth Flow
1. Navigate to `http://localhost:8000/signup`
2. Click **"Sign up with Google"** button
3. You'll be redirected to Google login/consent page
4. Authorize the app
5. **Expected:** Redirected back to `/onboarding` with JWT token in cookie
6. **Verify:** Check MongoDB:
   - New user created with `googleId` set
   - `googleProfile` contains name, avatar, bio

#### Test 4: User Linking
1. First, create account with email/password via `/signup`
2. Then, try GitHub OAuth with same email
3. **Expected:** Instead of creating duplicate, existing account is linked
4. **Verify:** User document has both `googleId` AND `githubId` fields

#### Test 5: Logout Functionality
1. After successful OAuth login, click profile menu
2. Click **Logout**
3. **Expected:** 
   - JWT cookie cleared
   - Redirected to `/`
   - Cannot access protected routes without logging back in

### Debugging Tips:

**Issue:** "Module not found: express-session"
- **Fix:** Run `npm install express-session`

**Issue:** Redirected to GitHub but nothing happens
- **Check:** Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
- **Check:** Verify OAuth app callback URL matches in GitHub settings

**Issue:** "Error deserializing user"
- **Check:** Make sure `config/passport.js` is deployed correctly
- **Check:** Verify user model has serialize/deserialize methods

**Issue:** User not created after OAuth login
- **Check:** MongoDB connection working (`mongo` or MongoDB Compass)
- **Check:** Check server logs for detailed error messages

---

## Step 9: Production Deployment (Future)

### Pre-Deployment Checklist:

1. **Environment Variables:**
   - [ ] Update `JWT_SECRET` to a long random string
   - [ ] Update `SESSION_SECRET` to a long random string
   - [ ] Set `NODE_ENV=production`
   - [ ] Use production MongoDB URI

2. **Security Settings:**
   - [ ] Set session cookie `secure: true` (requires HTTPS)
   - [ ] Set session cookie `httpOnly: true` (already configured)
   - [ ] Set session cookie `sameSite: 'lax'` (already configured)

3. **OAuth Redirect URIs:**
   - [ ] Update GitHub OAuth app redirect URI to production domain
   - [ ] Update Google OAuth app redirect URI to production domain
   - [ ] Example: `https://projectmate.example.com/auth/github/callback`

4. **Database:**
   - [ ] Switch to production MongoDB (Atlas or self-hosted)
   - [ ] Enable MongoDB authentication
   - [ ] Set up automated backups

5. **HTTPS:**
   - [ ] Obtain SSL certificate (Let's Encrypt)
   - [ ] Configure Express to use HTTPS
   - [ ] Redirect HTTP to HTTPS

6. **Monitoring:**
   - [ ] Set up error logging (Sentry, etc.)
   - [ ] Monitor authentication metrics
   - [ ] Set up alerts for failed OAuth attempts

---

## OAuth Flow Diagram

```
User clicks "Sign in with GitHub"
         ↓
Browser redirected to: /auth/github
         ↓
passport-github2 redirects to GitHub login page
         ↓
User authorizes app on GitHub
         ↓
GitHub redirects to: /auth/github/callback?code=...
         ↓
Passport exchanges code for user profile
         ↓
config/passport.js processes profile:
  - Check if user exists by email
  - If exists: link OAuth ID
  - If not: create new user
         ↓
JWT token generated and set in cookie
         ↓
User redirected to /onboarding
         ↓
Dashboard loads with authenticated user
```

---

## File Changes Summary

### Modified Files:
1. **index.js**
   - Added session & passport imports
   - Added session middleware
   - Added passport initialization
   - Registered auth router

2. **views/login.ejs**
   - Added OAuth button divider
   - Added GitHub OAuth button
   - Added Google OAuth button

3. **views/signup.ejs**
   - Added OAuth button divider
   - Added GitHub OAuth button
   - Added Google OAuth button

### Created Files:
1. **routes/auth.js**
   - OAuth endpoints
   - JWT token generation
   - Logout functionality

2. **config/passport.js**
   - GitHub strategy
   - Google strategy
   - Serialize/deserialize functions
   - User linking logic

### Modified Models:
1. **models/user.js**
   - Added githubId field
   - Added googleId field
   - Added githubProfile field
   - Added googleProfile field

---

## Next Steps

1. **Install packages:**
   ```bash
   npm install express-session passport passport-github2 passport-google-oauth20
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Test OAuth flows** using the procedures in Step 8

4. **Verify user creation** in MongoDB with OAuth fields populated

5. **Deploy to production** following Step 9 checklist

---

## Support & Troubleshooting

For issues with OAuth:
- Check `.env` file has all required variables
- Verify OAuth app settings in GitHub/Google consoles
- Check browser console for JavaScript errors
- Check server logs (terminal output) for backend errors
- Verify MongoDB is running and accessible

For OAuth provider-specific help:
- **GitHub:** https://docs.github.com/en/developers/apps/building-oauth-apps
- **Google:** https://developers.google.com/identity/protocols/oauth2

---

**Implementation Status: 95% Complete** ✅
- Step 4: ✅ Passport middleware integrated
- Step 5: ✅ Strategies configured
- Step 6: ✅ UI buttons added
- Step 7: ⏳ Packages need installation (run: `npm install express-session passport passport-github2 passport-google-oauth20`)
- Step 8: ⏳ Ready for testing (after Step 7)
- Step 9: 📋 Production guide provided
