import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  LeaveType,
  AllocationPolicy,
  MonthlyAllocation,
  MonthlyLateAllocation,
  LeaveRequest,
  LateRequest,
  Holiday
} from './models/models.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('[Seed Aborted] Database seeding wipes all data and is blocked in production mode.');
    console.error('If you strictly intend to wipe the production database, run manually: node src/seed.js --force');
    return;
  }
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leave_management';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(connUri);
    }
    console.log('[Seed] Cleaning database and setting up fresh HR Admin...');

    // Wipe all existing records
    await Promise.all([
      User.deleteMany({}),
      LeaveType.deleteMany({}),
      AllocationPolicy.deleteMany({}),
      MonthlyAllocation.deleteMany({}),
      MonthlyLateAllocation.deleteMany({}),
      LeaveRequest.deleteMany({}),
      LateRequest.deleteMany({}),
      Holiday.deleteMany({})
    ]);

    // 1. Leave Types
    await LeaveType.insertMany([
      { name: 'Casual Leave (CL)', code: 'CL', defaultMonthlyDays: 1.0, color: '#2563EB', description: 'Personal time off' },
      { name: 'Sick Leave (SL)', code: 'SL', defaultMonthlyDays: 1.0, color: '#DC2626', description: 'Medical and health leave' },
      { name: 'Earned Leave (EL)', code: 'EL', defaultMonthlyDays: 1.5, color: '#059669', description: 'Annual vacation leave' }
    ]);

    // 2. Default Allocation Policy
    await AllocationPolicy.create({
      policyName: 'Standard',
      description: 'Standard employee allocation: 2.0 leave days + 3 late arrivals',
      monthlyLeaveDays: 2.0,
      monthlyLateCount: 3
    });

    // 3. Clean HR Administrator Account
    const hrAdmin = await User.create({
      name: 'HR Admin',
      email: 'hr@winshine.com',
      password: 'admin123',
      employeeCode: 'HR-001',
      role: 'admin',
      status: 'active',
      department: 'Human Resources',
      designation: 'HR Lead & Administrator',
      policyName: 'Standard'
    });

    console.log('[Seed] Clean database initialized successfully!');
    console.log('--------------------------------------------------');
    console.log('HR ADMIN CREDENTIALS:');
    console.log('Email:    hr@winshine.com');
    console.log('Password: admin123');
    console.log('--------------------------------------------------');
    return hrAdmin;
  } catch (err) {
    console.error('[Seed Error]', err);
  }
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().then(() => {
    console.log('[Seed] Done. Exiting...');
    process.exit(0);
  });
}
