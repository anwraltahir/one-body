# الجسد الواحد (Aljasad Alwahid)

Sudanese charity crowdfunding platform — React frontend + Django REST backend.

## Stack

- **Frontend:** React, Vite, Tailwind, React Router
- **Backend:** Django 6, DRF, SimpleJWT, CORS
- **Auth:** Email/password + Google Identity Services (optional)

## Run locally

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set DJANGO_SECRET_KEY, optionally Google keys
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8010
```

Seeded accounts:

| Email | Password | Role |
|-------|----------|------|
| `admin@aiq.qa` | `Aiq@2026` | admin (superuser) |
| `admin@aljasad.sd` | `admin1234` | admin |
| `demo@aljasad.sd` | `demo1234` | user |

Admin UI: http://127.0.0.1:8010/admin/

### 2. Frontend

```bash
npm install
npm run dev
```

Vite proxies `/api` → `http://127.0.0.1:8010`.

### Google login

No Google OAuth keys were present in the hamzoooz projects. Add your own:

1. Create an OAuth 2.0 Web Client in [Google Cloud Console](https://console.cloud.google.com/)
2. Authorized JS origins: `http://localhost:3000`
3. Set in `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

The login page shows the Google button when `GOOGLE_CLIENT_ID` is set.

## API overview

| Area | Base path |
|------|-----------|
| Auth | `/api/auth/` (register, login, google, profile, …) |
| Projects | `/api/projects/` |
| Donations | `/api/donations/`, `/api/donations/create/` |
| Bank transfer | `/api/direct-donations/` |
| Health | `/api/health/` |

See [backend/README.md](backend/README.md) for full endpoint list.
