# Single Service Deployment Fix

## 🔧 Problem Fixed

The issue was that environment variables were pointing to separate backend/frontend URLs, but you're using a single Render.com service that hosts both.

## ✅ Fixed Environment Variables

### Root `.env`:
```env
SERVER_URL=https://rectangularductorder.onrender.com
CLIENT_URL=https://rectangularductorder.onrender.com
```

### Server `.env`:
```env
SERVER_URL=https://rectangularductorder.onrender.com
CLIENT_URL=https://rectangularductorder.onrender.com
```

### Client `.env.production`:
```env
VITE_API_URL=https://rectangularductorder.onrender.com
VITE_CLIENT_URL=https://rectangularductorder.onrender.com
```

## 🚀 Next Steps

1. **Render.com Environment Variables:**
   Set these in your Render.com service dashboard:
   ```env
   SERVER_URL=https://rectangularductorder.onrender.com
   CLIENT_URL=https://rectangularductorder.onrender.com
   DATABASE_URL=postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db
   USE_POSTGRESQL=true
   SESSION_SECRET=rectangularduct-super-secret-key-2024
   DEMO_MODE=false
   ```

2. **Google Console OAuth Settings:**
   Update redirect URIs to:
   ```
   https://rectangularductorder.onrender.com/api/auth/google/callback
   ```

3. **Deploy:**
   - Commit and push changes
   - Redeploy on Render.com
   - Test Google login

## 🔍 Test URLs

After deployment, test these:
- Health: `https://rectangularductorder.onrender.com/api/me`
- Google OAuth: `https://rectangularductorder.onrender.com/api/auth/google/status`
- Google Login: `https://rectangularductorder.onrender.com/api/auth/google`

The system should work exactly as before once redeployed with correct URLs!