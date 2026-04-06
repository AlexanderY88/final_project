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

## Project scripts

Root (`package.json`):
- `npm run dev` -> run server + client together
- `npm run install:all` -> install dependencies for all parts
- `npm run build` -> build client

Server (`server/package.json`):
- `npm run dev` -> run backend in development
- `npm run seed:full` -> seed sample data

Client (`client/package.json`):
- `npm start` -> run frontend
- `npm test` -> run frontend tests

---

## גרסה בעברית

### מה למסור למרצה

יש לצרף את קובץ הסביבה שסיפקת ולבקש לשים אותו כאן:
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
