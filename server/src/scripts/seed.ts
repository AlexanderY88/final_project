#!/usr/bin/env node

/**
 * Quick Development Seeder
 * 
 * This script provides a simple way to seed your development database
 * with test data. It only runs in development environment.
 * 
 * Usage:
 *   npm run seed              - Adds seed data (keeps existing)
 *   npm run seed:fresh        - Clears and adds fresh seed data
 *   npm run seed:force        - Forces overwrite of existing data
 */

import '../seeds/index';