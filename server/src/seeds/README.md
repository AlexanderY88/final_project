# Database Seeding Guide

This guide explains how to use the database seeding system for development.

## 🌱 What is Database Seeding?

Database seeding is the process of populating your database with initial data for development and testing. This includes test users, sample data, etc.

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

## 🔐 Test User Credentials

After seeding, you can log in with these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Branch Manager | branch.manager@company.com | branch123 |
| User | john.doe@example.com | password123 |
| User | jane.smith@example.com | password123 |

## 📊 Seed Data Included

### Users
- 1 Admin user
- 1 Branch Manager  
- 4 Regular users
- All with hashed passwords
- Different roles for testing permissions

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

## 📝 Development Workflow

1. **Fresh start:** `npm run db:reset`
2. **Add more data:** `npm run seed`  
3. **Update seeds:** `npm run seed:force`
4. **Clean slate:** `npm run seed:fresh`

Happy coding! 🎉