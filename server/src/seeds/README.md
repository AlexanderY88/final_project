# Database Seeding Guide

This README is only for the seed system inside `server/src/seeds`.

For normal project setup and run instructions, use the root README:

- `../../../README.md`

## What this is for

Database seeding populates development data for testing.

## 📁 File Structure

```
src/
├── seeds/
│   ├── index.ts          # Main seeder orchestrator  
│   ├── userSeeds.ts      # User seed data
│   └── README.md         # This file
├── scripts/
│   └── seed.ts           # Seeding script entry point
└── config/
    └── database.ts       # Database connection (updated for seeding)
```

## 🚀 Usage

### Basic Commands

```bash
# Add seed data (keeps existing data)
npm run seed

# Clear database and add fresh seed data  
npm run seed:fresh

# Force overwrite existing seed data
npm run seed:force

# Complete database reset (clear + force)
npm run db:reset
```

### Command Options

- **`npm run seed`** - Adds seed data, skips if data already exists
- **`npm run seed:fresh`** - Clears ALL data first, then adds seed data
- **`npm run seed:force`** - Overwrites existing seed data
- **`npm run db:reset`** - Nuclear option: clears everything and adds fresh data

## Test User Credentials

Current default seed users in this repo are:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@admin.com | Admin123! |
| Main Branch | main@branch.com | Business123! |
| Child Branch | north@branch.com | User123! |

## Seed Data Included

- 1 Admin user
- 1 Main branch user
- 1 Child branch user
- Sample products linked to the main branch

## 🔧 Configuration

### Environment Requirements
- Only runs in `NODE_ENV=development`
- Uses `.env.development` configuration
- Connects to your local MongoDB

### Safety Features
- ✅ Environment check (development only)
- ✅ Duplicate prevention  
- ✅ Clear confirmation prompts
- ✅ Detailed logging with colors
- ✅ Database connection cleanup

## 🛠️ Extending the Seeder

### Adding New Model Seeds

1. **Create seed data file:**
```typescript
// src/seeds/productSeeds.ts
export const seedProducts = async () => {
  return [
    { name: 'Product 1', price: 100 },
    { name: 'Product 2', price: 200 }
  ];
};
```

2. **Update main seeder:**
```typescript
// src/seeds/index.ts
import { seedProducts } from './productSeeds';

// In the run() method:
await this.seedProducts();

// Add the seeder method:
private async seedProducts(): Promise<void> {
  // Implementation similar to seedUsers
}
```

### Custom Seed Scripts

Create custom scripts for specific scenarios:
```typescript
// src/scripts/seedSpecialData.ts
import DatabaseSeeder from '../seeds/index';

const seeder = new DatabaseSeeder();
seeder.run();
```

## 🐛 Troubleshooting

### Common Issues

**"Seeding is only allowed in development environment"**
- Make sure `NODE_ENV=development` is set
- Check your `.env.development` file exists

**"MongoDB URI is not defined"**  
- Verify `MONGODB_URI` in `.env.development`
- Ensure MongoDB is running locally

**"Users already exist"**
- Use `npm run seed:force` to override
- Or use `npm run seed:fresh` to clear first

### Debugging

Enable verbose logging:
```bash
DEBUG=* npm run seed
```

Check what's in your database:
```bash
# MongoDB shell
mongosh mongodb://localhost:27017/final_project_dev
db.users.find().pretty()
```

## ⚠️ Important Notes

- **Never run seeding in production!** Environment checks prevent this.
- Seed data includes **test passwords** - not for production use
- The `db:reset` command **destroys all data** - use carefully
- Always backup important data before seeding

## Development Workflow

1. **Fresh start:** `npm run db:reset`
2. **Add more data:** `npm run seed`  
3. **Update seeds:** `npm run seed:force`
4. **Clean slate:** `npm run seed:fresh`

Use this file only when you are changing seed logic. For normal development flow, use the root README.