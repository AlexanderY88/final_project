import bcrypt from 'bcryptjs';
const User = require('../models/User');

export const seedUsers = async (): Promise<any[]> => {
  // Hash passwords for seed data
  const hashedPassword1 = await bcrypt.hash('password123', 12);
  const hashedPassword2 = await bcrypt.hash('admin123', 12);
  const hashedPassword3 = await bcrypt.hash('branch123', 12);

// to update at the end!!!! NOT forget!!! 


  return [
    {
      email: 'john.doe@example.com',
      password: hashedPassword1,
      firstName: 'John',
      lastName: 'Doe',
      role: 'user'
    },
    {
      email: 'jane.smith@example.com',
      password: hashedPassword1,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user'
    },
    {
      email: 'admin@company.com',
      password: hashedPassword2,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    },
    {
      email: 'branch.manager@company.com',
      password: hashedPassword3,
      firstName: 'Branch',
      lastName: 'Manager',
      role: 'main_branch'
    },
    {
      email: 'alice.johnson@example.com',
      password: hashedPassword1,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'user'
    },
    {
      email: 'bob.wilson@example.com',
      password: hashedPassword1,
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'user'
    }
  ];
};