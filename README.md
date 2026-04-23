# Final Project

StockManager is a full-stack inventory and branch-management application for businesses that work with multiple branches.

The project includes:
- A React + TypeScript client in `client/`
- A Node.js + Express + MongoDB server in `server/`
- Role-based access for admin, main branch, and child branch users
- Product management, branch management, logs/history, mailbox, and image upload support

## App Summary

The app is built for a business structure with one or more main branches and optional child branches under each main branch.

Core business flows:
- Manage users and branches
- Create, edit, delete, and track products
- Upload product images or use external image URLs
- View product change history and system logs
- Send and manage contact messages through the mailbox

## Tech Stack

- Frontend: React 18, TypeScript, Redux Toolkit, React Router, Axios, Tailwind CSS, Joi
- Backend: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, Multer, Sharp, Joi
- Workspace scripts: npm, concurrently, serve, cross-env

## Prerequisites

Install these before running the project:
- Node.js 18+
- npm 9+
- MongoDB running locally, or a valid remote `MONGODB_URI`

## Dependencies And Installation

There are three package manifests in this repo:
- Root: workspace scripts for running client and server together
- `client/package.json`: frontend dependencies
- `server/package.json`: backend dependencies

Recommended installation from the project root:

```bash
npm install
npm run install:all
```

This installs dependencies for:
- root via `npm install`
- client via `npm run install:all`
- server via `npm run install:all`

Manual installation is also possible:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

## Environment Files

Development:
- Put the development env file at `server/.env.development`

Production:
- Put the production env file at `server/.env.production`

Important:
- Local development reads `server/.env.development`
- Production start reads `server/.env.production`

## Run In Development

From the project root:

```bash
npm run dev
```

This starts:
- Client: `http://localhost:3000`
- Server: `http://localhost:5000`
- Health endpoint: `http://localhost:5000/api/health`

Optional separate run:

```bash
cd server
npm run dev
```

```bash
cd client
npm start
```

## Build And Run In Production

Build the frontend only:

```bash
npm run build
```

Build both client and server:

```bash
npm run prod:build
```

Run the production version from the root:

```bash
npm start
```

Equivalent production commands:

```bash
npm run start:prod
```

```bash
npm run prod
```

What the production root flow does:
- Builds the backend TypeScript output
- Builds the frontend production bundle
- Starts the backend from `server/dist`
- Serves the client build on port `3000`

## Root Scripts

Root `package.json`:
- `npm run dev`: run client and server together in development
- `npm run install:all`: install client and server dependencies (run `npm install` first for root dependencies)
- `npm run build`: build the client
- `npm run server:build`: build the server TypeScript output
- `npm run client:build`: build the client
- `npm run prod:build`: build server and client
- `npm run prod`: build everything and run the production version
- `npm start`: alias for the production flow from the root

Server `server/package.json`:
- `npm run dev`: run backend in development with watch mode
- `npm run build`: compile backend TypeScript to `dist/`
- `npm run start`: run compiled backend in production mode
- `npm run seed`: run incremental seed data
- `npm run seed:fresh`: seed with clear mode
- `npm run seed:force`: seed with force mode
- `npm run seed:full`: run full sample seed script
- `npm run db:reset`: clear and reseed in development

Client `client/package.json`:
- `npm start`: run the frontend in development
- `npm run build`: build the production bundle
- `npm test`: run client tests

## Seed Data

When the backend starts in development, `server/seed.js` runs an incremental seed flow.

It creates default users if they do not exist and does not wipe the database.

Default development users from `server/seed.js`:
- Admin: `admin@admin.com` / `Admin123!`
- Main Branch: `main@branch.com` / `Business123!`
- Child Branch: `north@branch.com` / `User123!`

Manual seed example:

```powershell
cd server
$env:NODE_ENV="development"
node seed.js
```

## Roles And Permissions

### Admin

Admin users can:
- Open the Admin Users panel
- Create admin, main branch, and child branch users
- Edit any user
- Change user roles
- Delete users, except deleting themselves is blocked by the backend
- Open dashboard context for any user
- Open branch context for any main branch network
- Create, edit, delete, and update quantity for products in selected context
- View all mailbox conversations
- Add mailbox comments, close messages, and reopen messages
- View logs/history
- Access all log types: product changes, auth events, API traffic, and error logs

### Main Branch

Main branch users can:
- Open their own dashboard and products pages
- Open the Branches page
- Create child branches under their own main branch
- Edit or delete child branches they manage
- Edit their own profile and password
- Edit child branch profiles and passwords they manage
- Create, edit, delete, and update quantity for their own products
- Create, edit, delete, and update quantity for products owned by their child branches
- Use the mailbox for their own messages only
- View logs/history for their own branch network only

Main branch users cannot:
- Open the Admin Users panel
- Change roles
- View API or error logs from the client UI
- Manage users outside their own branch network

### Child Branch

Child branch users can:
- Open their own dashboard and products pages
- Create products for their own branch
- Edit, delete, and update quantity only for their own products
- View and update their own profile details depending on allowed profile flow
- Use the mailbox for their own messages only

Child branch users cannot:
- Open the Branches page
- Open the Admin Users panel
- Open the logs/history page
- Manage other branches or other users

## Branch Logic

The application models three business roles:
- `admin`
- `main_branch`
- `user` for child branch

Business logic summary:
- A main branch can see its own products and the products of its child branches
- A main branch can create child branches under itself
- A main branch can edit and delete only the child branches it manages
- A main branch can manage products for itself and for its child branches
- An admin can create, edit, and delete all branches and all users except self-delete
- An admin can switch into a selected user or branch context from the dashboard and admin panel
- A child branch is restricted to its own branch data for product actions

## Pages And Access

| Page | Route | Access | Purpose |
| --- | --- | --- | --- |
| Login | `/login` | Public | Authenticate existing users |
| Sign Up | `/register` | Public | Register a new account |
| Session Expired | `/session-expired` | Public | Shown when auth/session is no longer valid |
| About Us | `/about` | Public | Marketing and project background page |
| Contact Us | `/contact` | Public to view, authenticated users to submit | Support/contact form |
| Dashboard | `/dashboard` | Authenticated | Main landing page after login with role-specific context |
| Products | `/products` | Authenticated | List products visible in current role/context |
| Product Details | `/products/:id` | Authenticated | View one product in detail |
| New Product | `/products/new` | Authenticated | Create a product in the current branch context |
| Edit Product | `/products/:id/edit` | Authenticated with product ownership rules | Update product details and image |
| Profile | `/profile` | Authenticated | View and update own profile, or selected user profile in admin/main-branch flows |
| Branches | `/branches` | Main branch and admin branch-context flow | View, create, and manage child branches |
| Admin Users | `/admin/users` | Admin | Search, filter, create, edit, and delete users |
| Mailbox | `/mailbox` | Authenticated | View and manage your own contact messages |
| Admin Mailbox | `/admin/mailbox` | Admin | View and manage all messages |
| Logs / History | `/logs` | Admin and main branch | Review product changes and selected system logs |

## Logs And History

The history/logs page is implemented by `LogViewer` and backend log routes.

Current behavior:
- Admin can open logs and view all supported log types
- Main branch can open logs only for its own branch network
- Child branch cannot open the logs page

Available log types in the UI:
- Product Changes: admin and main branch
- Auth Events: admin and main branch
- API Traffic: admin only
- Error Logs: admin only

Important access note:
- Admin can inspect branch context and branch-related history through selected-user flows
- Main branch can review product history and related branch-network history only within its own scope
- Child branches do not have direct access to the history page

## Products And Images

Product image behavior:
- A product can use either an uploaded image or an external image URL
- Uploaded images are handled by Multer and optimized by Sharp
- Source upload limit is `10MB`
- Uploaded images are converted and stored as optimized WebP files
- An image description (`imageAlt`) is required when an image is provided

Product permission logic:
- Admin can manage products in the selected branch context
- Main branch can manage its own products and the products of its child branches
- Child branch can manage only its own products
- Product quantity updates are tracked and used in product history/log reporting

## Mailbox Logic

Mailbox behavior is role-aware:
- Any authenticated user can submit a contact message from the Contact Us page
- Non-admin users only see their own messages in the mailbox
- Admin sees all messages
- Messages support comments, close, and reopen actions

## Common Issues

### Ports already in use

If port `3000` or `5000` is already in use:
- Stop old terminals/processes
- Start the app again

### MongoDB connection error

Check:
- MongoDB is running
- `MONGODB_URI` in `server/.env.development` is valid

### Missing script error

Use the root commands exactly as documented:
- `npm run dev` for development
- `npm install` and then `npm run install:all` for installation
- `npm start` only for the root production flow

### Product image upload fails

Check:
- File type is `jpg`, `jpeg`, `png`, or `webp`
- File size is below `10MB`
- The form includes an image description

## README Files In This Repo

This repository includes:
- `README.md`: the main project guide
- `client/README.md`: frontend-specific notes
- `server/src/seeds/README.md`: seed-system notes

Use the root `README.md` as the main entry point for running the project.

