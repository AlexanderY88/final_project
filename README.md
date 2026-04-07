# Final Project

Full-stack product management system:
- Frontend: React + TypeScript (`client`)
- Backend: Node.js + Express + MongoDB (`server`)

## Quick Start

1. Place the provided env file at `server/.env.development`.
2. Install dependencies from project root: `npm run install:all`.
3. Run locally from project root: `npm run dev`.
4. Open:
- Client: `http://localhost:3000`
- Server health: `http://localhost:5000/api/health`

## What to submit to the teacher

Include your provided environment file and tell the teacher to place it in:
- `server/.env.development` for local development run

Important:
- This project reads `server/.env.development` when running in development mode.
- If your file name is different (for example `.env`), rename it to `.env.development`.

## Prerequisites

Install these on the local machine:
- Node.js 18+ (LTS recommended)
- npm 9+
- MongoDB running locally (or a valid cloud `MONGODB_URI` inside the env file)

Note:
- The server now uses `sharp` to optimize uploaded product images automatically.
- No extra env variables or manual config are required for this feature.

## Local setup

From project root:

```bash
npm run install:all
```

This installs dependencies for root, server, and client.

## Run locally

From project root:

```bash
npm run dev
```

This starts both apps together:
- Client: `http://localhost:3000`
- Server health endpoint: `http://localhost:5000/api/health`

## Auto Seed In Development

When the backend starts in `development`, it automatically runs incremental seed (`server/seed.js`).

What it does:
- Creates missing default users from seed data.
- Skips users/products that already exist.
- Does not wipe existing DB data.

## Run separately (optional)

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm start
```

## Build for production (frontend)

From project root:

```bash
npm run build
```

## Common issues

1. Port already in use (`3000` or `5000`)
- Stop old terminals/processes and run again.

2. MongoDB connection error
- Make sure MongoDB is running.
- Verify `MONGODB_URI` in `server/.env.development`.

3. Missing script error from root
- Use root commands exactly as written above (`npm run dev`, `npm run install:all`).
- Do not run `npm start` in project root.

4. Auto-seed did not run / test users are missing
- Run seed manually from `server` folder.
- PowerShell:

```powershell
cd server
$env:NODE_ENV="development"
node seed.js
```

- Bash:

```bash
cd server
NODE_ENV=development node seed.js
```

- Then restart backend:

```bash
npm run dev
```

5. Large product image upload fails
- The backend accepts product images up to `10MB` and compresses them automatically with `sharp` before saving.
- Uploaded product images are optimized on the server, usually converted to a smaller WebP file.
- Files larger than `10MB` are rejected.
- If an upload still fails, check that the file is a valid `jpg`, `jpeg`, `png`, or `webp` image.

## Project scripts

Root (`package.json`):
- `npm run dev` -> run server + client together
- `npm run install:all` -> install dependencies for all parts
- `npm run build` -> build client

Server (`server/package.json`):
- `npm run dev` -> run backend in development
- `npm run seed:full` -> seed sample data
- Server dependencies include `sharp` for automatic uploaded image compression

Client (`client/package.json`):
- `npm start` -> run frontend
- `npm test` -> run frontend tests

## Test Users (Seed Data)

Seed runs automatically when backend starts in development.
If users are missing, run seed manually:

```bash
cd server
$env:NODE_ENV="development"
node seed.js
```

Available users from `server/seed.js`:
- Admin
	email: `admin@admin.com`
	password: `Admin123!`
- Main Branch
	email: `main@branch.com`
	password: `Business123!`
- Child Branch
	email: `north@branch.com`
	password: `User123!`

---

## גרסה בעברית

יש להדביק את הקובץ הסביבה שמצורף ואבקש לשים אותו כאן:
- `server/.env.development`

חשוב:
- הפרויקט קורא קובץ `server/.env.development` במצב פיתוח.
- אם שם הקובץ הוא `.env`, יש לשנות את השם ל-`.env.development`.

### דרישות מקדימות

יש לוודא שמותקן במחשב:
- Node.js גרסה 18 ומעלה (מומלץ LTS)
- npm גרסה 9 ומעלה
- MongoDB מקומי פועל, או `MONGODB_URI` תקין בתוך קובץ הסביבה

### התקנה מקומית

מהתיקיה הראשית של הפרויקט:

```bash
npm run install:all
```

### הרצת הפרויקט מקומית

מהתיקיה הראשית של הפרויקט:

```bash
npm run dev
```

הפקודה מפעילה את שני הצדדים יחד:
- צד לקוח: `http://localhost:3000`
- בדיקת שרת: `http://localhost:5000/api/health`

### הרצה בנפרד (אופציונלי)

טרמינל 1:

```bash
cd server
npm run dev
```

טרמינל 2:

```bash
cd client
npm start
```

### תקלות נפוצות

1. פורט תפוס (`3000` או `5000`)
- לסגור טרמינלים/תהליכים ישנים ולהריץ שוב.

2. שגיאת חיבור ל-MongoDB
- לוודא ש-MongoDB פעיל.
- לבדוק את הערך `MONGODB_URI` בקובץ `server/.env.development`.

3. שגיאת `Missing script` בתיקיה הראשית
- להשתמש בפקודות מה-README: `npm run dev`, `npm run install:all`.
- לא להריץ `npm start` מהתיקיה הראשית.
