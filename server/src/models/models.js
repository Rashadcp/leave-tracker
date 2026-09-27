import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  employeeCode: { type: String, required: true, unique: true },
  role: { type: String, enum: ['staff', 'approver', 'admin'], default: 'staff' },
  department: { type: String, default: 'Engineering' },
  designation: { type: String, default: 'Software Engineer' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  phone: { type: String, default: '+91 98765 43210' },
  avatar: { type: String, default: '' },
  policyName: { type: String, default: 'Standard' },
  password: { type: String, default: 'password123' },
  status: { type: String, enum: ['active', 'pending', 'rejected'], default: 'active' }
}, { timestamps: true });

const LeaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  defaultMonthlyDays: { type: Number, default: 2 },
  color: { type: String, default: '#4F46E5' },
  description: { type: String, default: '' },
  requiresAttachment: { type: Boolean, default: false }
}, { timestamps: true });

const AllocationPolicySchema = new mongoose.Schema({
  policyName: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  monthlyLeaveDays: { type: Number, default: 2.0 },
  monthlyLateHours: { type: Number, default: 3.0 },
  monthlyLateCount: { type: Number, default: 3 }
}, { timestamps: true });

const MonthlyAllocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1 - 12
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  allottedDays: { type: Number, default: 2.0 },
  takenDays: { type: Number, default: 0 },
  remainingDays: { type: Number, default: 2.0 },
  allocatedBy: { type: String, default: 'System Policy' }
}, { timestamps: true });

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ department: 1 });

MonthlyAllocationSchema.index({ userId: 1, year: 1, month: 1, leaveTypeId: 1 }, { unique: true });
MonthlyAllocationSchema.index({ year: 1, month: 1 });

const MonthlyLateAllocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  allottedHours: { type: Number, default: 3.0 },
  allottedCount: { type: Number, default: 3 },
  usedHours: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  remainingHours: { type: Number, default: 3.0 },
  remainingCount: { type: Number, default: 3 },
  allocatedBy: { type: String, default: 'System Policy' }
}, { timestamps: true });

MonthlyLateAllocationSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
MonthlyLateAllocationSchema.index({ year: 1, month: 1 });

const LeaveRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },   // YYYY-MM-DD
  isHalfDay: { type: Boolean, default: false },
  halfDayPeriod: { type: String, enum: ['first_half', 'second_half', 'none'], default: 'none' },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  attachmentName: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvalDate: { type: Date, default: null },
  approverComment: { type: String, default: '' },
  balanceAtApproval: { type: Number, default: null }
}, { timestamps: true });

LeaveRequestSchema.index({ userId: 1, createdAt: -1 });
LeaveRequestSchema.index({ status: 1, createdAt: -1 });
LeaveRequestSchema.index({ leaveTypeId: 1 });

const LateRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  expectedTime: { type: String, required: true }, // HH:mm
  lateMinutes: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvalDate: { type: Date, default: null },
  approverComment: { type: String, default: '' }
}, { timestamps: true });

LateRequestSchema.index({ userId: 1, createdAt: -1 });
LateRequestSchema.index({ status: 1, createdAt: -1 });

const ApprovalLogSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestType: { type: String, enum: ['leave', 'late'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['submitted', 'approved', 'rejected', 'cancelled'], required: true },
  comment: { type: String, default: '' },
  balanceBefore: { type: Number, default: null },
  balanceAfter: { type: Number, default: null }
}, { timestamps: true });

ApprovalLogSchema.index({ requestId: 1, createdAt: -1 });

const HolidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  name: { type: String, required: true },
  type: { type: String, default: 'Public Holiday' }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const LeaveType = mongoose.model('LeaveType', LeaveTypeSchema);
export const AllocationPolicy = mongoose.model('AllocationPolicy', AllocationPolicySchema);
export const MonthlyAllocation = mongoose.model('MonthlyAllocation', MonthlyAllocationSchema);
export const MonthlyLateAllocation = mongoose.model('MonthlyLateAllocation', MonthlyLateAllocationSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
export const LateRequest = mongoose.model('LateRequest', LateRequestSchema);
export const ApprovalLog = mongoose.model('ApprovalLog', ApprovalLogSchema);
export const Holiday = mongoose.model('Holiday', HolidaySchema);
