# الجسد الواحد — Django API

REST backend for the charity platform: auth (email + Google), projects, donations.

## Quick start

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit secrets
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8010
```

Admin: http://127.0.0.1:8010/admin/  
Demo users (from seed):

| Email | Password | Role |
|-------|----------|------|
| admin@aiq.qa | Aiq@2026 | admin (superuser) |
| admin@aljasad.sd | admin1234 | admin |
| demo@aljasad.sd | demo1234 | user |

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register/` | Email + password signup |
| POST | `/api/auth/login/` | JWT login (`email`, `password`) |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/PATCH | `/api/auth/profile/` | Current user |
| POST | `/api/auth/password/change/` | Change password |
| POST | `/api/auth/google/` | Google ID token → JWT |
| GET | `/api/auth/google/config/` | Public Google client id |

### Google OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials  
2. Create **OAuth 2.0 Client ID** (Web application)  
3. Authorized JavaScript origins: `http://localhost:3000`  
4. Put the Client ID in `backend/.env`:

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx   # optional for ID-token flow
```

Frontend uses Google Identity Services; it posts the `credential` JWT to `/api/auth/google/`.

> No Google keys were found in the hamzoooz projects — add your own Client ID as above.

## Resource endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/projects/` | public (active) |
| GET | `/api/projects/:id/` | public |
| POST | `/api/projects/` | JWT |
| GET | `/api/projects/mine/` | JWT |
| POST | `/api/projects/:id/approve/` | staff |
| GET | `/api/donations/?projectId=` | public |
| GET | `/api/donations/mine/` | JWT |
| POST | `/api/donations/create/` | optional JWT |
| GET | `/api/categories/` | public |
| GET | `/api/health/` | public |

## Frontend

From repo root:

```bash
npm install
npm run dev   # proxies /api → :8010
```
