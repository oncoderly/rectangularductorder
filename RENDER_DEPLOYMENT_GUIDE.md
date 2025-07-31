# Render.com Deployment Guide

## Critical Environment Variables for Render.com

To prevent user data loss on Render.com, ensure these environment variables are set correctly:

### Backend Service Environment Variables

```env
# PostgreSQL Database (CRITICAL - This prevents data loss)
DATABASE_URL=postgresql://rectangularduct_user:WvlaSwkbrZlDVBV1gc34RCKCO5PF3aGC@dpg-d23m9kali9vc73f85n40-a.frankfurt-postgres.render.com/rectangularductorder_db
USE_POSTGRESQL=true

# Session Secret (Required for authentication)
SESSION_SECRET=rectangularduct-super-secret-key-2024

# Client URL (Update with your actual frontend URL)
CLIENT_URL=https://rectangularductorder.onrender.com

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=havakanalsiparis@gmail.com
SMTP_PASSWORD=qumo dlhm npcg jjhn
SENDER_EMAIL=havakanalsiparis@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=781991570845-o0a0radjv944bjo7utgmrfsca3ts78m2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Demo Mode (Set to false for production)
DEMO_MODE=false
```

### Frontend Service Environment Variables

```env
# Backend API URL (Update with your actual backend URL)
VITE_API_URL=https://rectangularductorder-server.onrender.com
```

## Deployment Steps

1. **Backend Deployment:**
   - Service Type: Web Service
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add all environment variables listed above

2. **Frontend Deployment:**
   - Service Type: Static Site
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Add frontend environment variables

3. **Database Setup:**
   - Create PostgreSQL database on Render.com
   - Use the provided DATABASE_URL in environment variables
   - Database will be automatically initialized on first startup

## Troubleshooting

### If users are still being deleted:

1. Check Render.com logs for PostgreSQL connection errors
2. Verify DATABASE_URL is correctly set in Render dashboard
3. Ensure USE_POSTGRESQL=true is set
4. Look for "✅ PostgreSQL connected successfully" in logs

### Common Issues:

- **Connection timeout**: Database URL might be incorrect
- **Users still deleted**: SQLite fallback is being used instead of PostgreSQL
- **Login issues**: SESSION_SECRET not set or changed

## Important Notes

- **Never commit .env files** to the repository
- Set environment variables directly in Render.com dashboard
- PostgreSQL database is persistent - data will not be lost on redeploys
- SQLite database is temporary and gets wiped on each deploy