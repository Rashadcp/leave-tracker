import express from 'express';
import {
  User,
  LeaveType,
  AllocationPolicy,
  MonthlyAllocation,
  MonthlyLateAllocation,
  LeaveRequest,
  LateRequest,
  ApprovalLog,
  Holiday
} from '../models/models.js';
import {
  notifyHRNewLeaveRequest,
  notifyHRNewLateRequest,
  notifyEmployeeDecision
} from '../utils/mailer.js';

const router = express.Router();

// Helper: current Year & Month dynamically calculated
const getPeriod = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthName: now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  };
};

// Auth: Employee Registration (Immediate access - no approvals needed)
router.post('/auth/register', async (req, res) => {
  try {
    const { name, department, email, password } = req.body;
    if (!name || !department || !email || !password) {
      return res.status(400).json({ error: 'Please fill all fields: name, department, email, password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const count = await User.countDocuments();
    const employeeCode = `EMP-${100 + count + 1}`;

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      department: department.trim(),
      designation: 'Staff Member',
      role: 'staff',
      status: 'active', // Direct active status without approval
      employeeCode,
      policyName: 'Standard'
    });

    // Automatically initialize leave & late allocations for current period
    const { year, month } = getPeriod();
    const [types, policy] = await Promise.all([
      LeaveType.find(),
      AllocationPolicy.findOne()
    ]);

    for (const t of types) {
      await MonthlyAllocation.create({
        userId: newUser._id,
        year,
        month,
        leaveTypeId: t._id,
        allottedDays: t.defaultMonthlyDays,
        takenDays: 0,
        remainingDays: t.defaultMonthlyDays,
        allocatedBy: 'Registration Default'
      });
    }

    const defaultLateHours = policy?.monthlyLateHours ?? 3.0;
    const defaultLateCount = policy?.monthlyLateCount ?? 3;

    await MonthlyLateAllocation.create({
      userId: newUser._id,
      year,
      month,
      allottedHours: defaultLateHours,
      allottedCount: defaultLateCount,
      usedHours: 0,
      usedCount: 0,
      remainingHours: defaultLateHours,
      remainingCount: defaultLateCount,
      allocatedBy: 'Registration Default'
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! You can now sign in.',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        department: newUser.department,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: Single Unified Login for Employees & HR
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Auto-activate any legacy pending accounts
    if (user.status === 'pending') {
      user.status = 'active';
      await user.save();
      const { year, month } = getPeriod();
      const types = await LeaveType.find();
      for (const t of types) {
        const existingAlloc = await MonthlyAllocation.findOne({ userId: user._id, year, month, leaveTypeId: t._id });
        if (!existingAlloc) {
          await MonthlyAllocation.create({
            userId: user._id,
            year,
            month,
            leaveTypeId: t._id,
            allottedDays: t.defaultMonthlyDays,
            takenDays: 0,
            remainingDays: t.defaultMonthlyDays,
            allocatedBy: 'System Auto-Activation'
          });
        }
      }
      const existingLate = await MonthlyLateAllocation.findOne({ userId: user._id, year, month });
      if (!existingLate) {
        await MonthlyLateAllocation.create({
          userId: user._id,
          year,
          month,
          allottedHours: 3.0,
          allottedCount: 3,
          usedHours: 0,
          usedCount: 0,
          remainingHours: 3.0,
          remainingCount: 3,
          allocatedBy: 'System Auto-Activation'
        });
      }
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your account was declined. Please contact administration.' });
    }

    // Check password (default password123 if not set)
    const validPassword = (user.password || 'password123') === password;
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        role: user.role, // 'staff' | 'approver' | 'admin'
        department: user.department,
        designation: user.designation,
        policyName: user.policyName
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HR: Get pending registrations (Legacy endpoint - registration approvals removed)
router.get('/admin/pending-users', async (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HR: Approve or reject user registration
router.post('/admin/approve-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approved' | 'rejected'
    const { year, month } = getPeriod();

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'approved') {
      user.status = 'active';
      await user.save();

      // Automatically initialize their monthly allocations for this month
      const types = await LeaveType.find();
      for (const t of types) {
        const existingAlloc = await MonthlyAllocation.findOne({ userId: user._id, year, month, leaveTypeId: t._id });
        if (!existingAlloc) {
          await MonthlyAllocation.create({
            userId: user._id,
            year,
            month,
            leaveTypeId: t._id,
            allottedDays: t.defaultMonthlyDays,
            takenDays: 0,
            remainingDays: t.defaultMonthlyDays,
            allocatedBy: 'HR Approval Default'
          });
        }
      }

      const existingLate = await MonthlyLateAllocation.findOne({ userId: user._id, year, month });
      if (!existingLate) {
        await MonthlyLateAllocation.create({
          userId: user._id,
          year,
          month,
          allottedHours: 3.0,
          allottedCount: 3,
          usedHours: 0,
          usedCount: 0,
          remainingHours: 3.0,
          remainingCount: 3,
          allocatedBy: 'HR Approval Default'
        });
      }

      return res.json({ success: true, message: `Employee ${user.name} approved successfully!` });
    } else {
      user.status = 'rejected';
      await user.save();
      return res.json({ success: true, message: `Registration for ${user.name} declined.` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: Forgot Password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide your registered email' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

    if (!user) {
      return res.status(404).json({ error: 'No user account found with this email address' });
    }

    user.password = newPassword || 'password123';
    await user.save();

    res.json({
      success: true,
      message: 'Password has been updated. You can now login with your new password.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Users list (for switching roles / demo testing)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Leave types
router.get('/leave-types', async (req, res) => {
  try {
    const types = await LeaveType.find().sort({ name: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add or create a new Leave Quota Type manually
router.post('/leave-types', async (req, res) => {
  try {
    const { name, code, defaultMonthlyDays, color, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Quota category name is required' });
    }

    const cleanCode = (code || name.replace(/[^A-Za-z]/g, '').slice(0, 4)).toUpperCase();
    const cleanDays = Math.max(0, Number(defaultMonthlyDays) || 1.0);

    const existing = await LeaveType.findOne({
      $or: [{ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }, { code: cleanCode }]
    });

    if (existing) {
      return res.status(400).json({ error: 'A leave quota with this name or code already exists' });
    }

    const newType = await LeaveType.create({
      name: name.trim(),
      code: cleanCode,
      defaultMonthlyDays: cleanDays,
      color: color || '#4F46E5',
      description: description || ''
    });

    // Automatically initialize this new quota for all active staff employees
    const { year, month } = getPeriod();
    const staffUsers = await User.find({ role: 'staff' });
    for (const u of staffUsers) {
      await MonthlyAllocation.create({
        userId: u._id,
        year,
        month,
        leaveTypeId: newType._id,
        allottedDays: cleanDays,
        takenDays: 0,
        remainingDays: cleanDays,
        allocatedBy: 'HR Admin Created Quota'
      });
    }

    res.status(201).json({
      success: true,
      message: `New quota '${newType.name}' created and added to all employees!`,
      leaveType: newType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit / Update an existing Leave Quota Type
router.put('/leave-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, defaultMonthlyDays, color } = req.body;

    const leaveType = await LeaveType.findById(id);
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave quota type not found' });
    }

    if (name) leaveType.name = name.trim();
    if (code) leaveType.code = code.trim().toUpperCase();
    if (color) leaveType.color = color;

    const newDays = defaultMonthlyDays !== undefined ? Math.max(0, Number(defaultMonthlyDays) || 0) : leaveType.defaultMonthlyDays;
    const daysChanged = defaultMonthlyDays !== undefined && newDays !== leaveType.defaultMonthlyDays;
    leaveType.defaultMonthlyDays = newDays;

    await leaveType.save();

    // If days changed, sync all staff employees' monthly allocations for this quota
    if (daysChanged) {
      const { year, month } = getPeriod();
      const staffUsers = await User.find({ role: 'staff' });
      for (const u of staffUsers) {
        let alloc = await MonthlyAllocation.findOne({ userId: u._id, year, month, leaveTypeId: leaveType._id });
        if (alloc) {
          alloc.allottedDays = newDays;
          alloc.remainingDays = Math.max(0, newDays - alloc.takenDays);
          await alloc.save();
        } else {
          await MonthlyAllocation.create({
            userId: u._id,
            year,
            month,
            leaveTypeId: leaveType._id,
            allottedDays: newDays,
            takenDays: 0,
            remainingDays: newDays,
            allocatedBy: 'HR Admin Updated Quota'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Quota '${leaveType.name}' updated successfully!`,
      leaveType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an existing Leave Quota Type
router.delete('/leave-types/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const leaveType = await LeaveType.findById(id);
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave quota type not found' });
    }

    const quotaName = leaveType.name;

    // 1. Delete leave type
    await LeaveType.findByIdAndDelete(id);

    // 2. Delete all allocations for this quota across all employees
    await MonthlyAllocation.deleteMany({ leaveTypeId: id });

    // 3. Mark any pending requests for this quota as cancelled
    await LeaveRequest.updateMany({ leaveTypeId: id, status: 'pending' }, { status: 'cancelled', approverComment: 'Quota category removed by HR' });

    res.json({
      success: true,
      message: `Quota '${quotaName}' deleted and removed from all employees.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Holidays
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Staff Dashboard Overview
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, monthName } = getPeriod();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure all active LeaveTypes are allocated for this user for current month
    const [types, policy] = await Promise.all([
      LeaveType.find(),
      AllocationPolicy.findOne()
    ]);

    for (const t of types) {
      const existingAlloc = await MonthlyAllocation.findOne({ userId, year, month, leaveTypeId: t._id });
      if (!existingAlloc) {
        await MonthlyAllocation.create({
          userId,
          year,
          month,
          leaveTypeId: t._id,
          allottedDays: t.defaultMonthlyDays,
          takenDays: 0,
          remainingDays: t.defaultMonthlyDays,
          allocatedBy: 'Policy Sync'
        });
      } else if (existingAlloc.takenDays === 0 && existingAlloc.allottedDays !== t.defaultMonthlyDays) {
        existingAlloc.allottedDays = t.defaultMonthlyDays;
        existingAlloc.remainingDays = t.defaultMonthlyDays;
        await existingAlloc.save();
      }
    }

    // Leave allocations for current month (excluding any deleted leave types)
    let leaveAllocations = await MonthlyAllocation.find({ userId, year, month }).populate('leaveTypeId');
    leaveAllocations = leaveAllocations.filter(a => a.leaveTypeId);

    // Late allocation for current month
    const defaultLateHours = policy?.monthlyLateHours ?? 3.0;
    const defaultLateCount = policy?.monthlyLateCount ?? 3;

    let lateAllocation = await MonthlyLateAllocation.findOne({ userId, year, month });
    if (!lateAllocation) {
      lateAllocation = await MonthlyLateAllocation.create({
        userId,
        year,
        month,
        allottedHours: defaultLateHours,
        allottedCount: defaultLateCount,
        usedHours: 0,
        usedCount: 0,
        remainingHours: defaultLateHours,
        remainingCount: defaultLateCount,
        allocatedBy: 'Policy Sync'
      });
    } else if (lateAllocation.usedHours === 0 && lateAllocation.usedCount === 0) {
      if (lateAllocation.allottedHours !== defaultLateHours || lateAllocation.allottedCount !== defaultLateCount) {
        lateAllocation.allottedHours = defaultLateHours;
        lateAllocation.allottedCount = defaultLateCount;
        lateAllocation.remainingHours = defaultLateHours;
        lateAllocation.remainingCount = defaultLateCount;
        await lateAllocation.save();
      }
    }

    // Parallel batch fetch for recent requests, holidays & pending counts
    const [leaveRequests, lateRequests, holidays, pendingLeaves, pendingLates] = await Promise.all([
      LeaveRequest.find({ userId }).populate('leaveTypeId').sort({ createdAt: -1 }).limit(5).lean(),
      LateRequest.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Holiday.find().sort({ date: 1 }).limit(3).lean(),
      LeaveRequest.countDocuments({ userId, status: 'pending' }),
      LateRequest.countDocuments({ userId, status: 'pending' })
    ]);

    // Aggregates for summary card
    const totalAllottedDays = leaveAllocations.reduce((acc, curr) => acc + (curr.allottedDays || 0), 0);
    const totalTakenDays = leaveAllocations.reduce((acc, curr) => acc + (curr.takenDays || 0), 0);
    const totalRemainingDays = leaveAllocations.reduce((acc, curr) => acc + (curr.remainingDays || 0), 0);
    const pendingCount = pendingLeaves + pendingLates;

    res.json({
      user,
      period: { year, month, monthName },
      summary: {
        totalAllottedDays,
        totalTakenDays,
        totalRemainingDays,
        lateAllottedHours: lateAllocation.allottedHours,
        lateUsedHours: lateAllocation.usedHours,
        lateRemainingHours: lateAllocation.remainingHours,
        lateRemainingCount: lateAllocation.remainingCount,
        pendingCount
      },
      leaveAllocations,
      lateAllocation,
      recentRequests: {
        leaves: leaveRequests,
        lates: lateRequests
      },
      holidays
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Submit Leave Request
router.post('/requests/leave', async (req, res) => {
  try {
    const { userId, leaveTypeId, startDate, endDate, isHalfDay, halfDayPeriod, reason, attachmentName } = req.body;
    const { year, month } = getPeriod();

    if (!userId || !leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Calculate days requested
    let totalDays = 1.0;
    if (isHalfDay) {
      totalDays = 0.5;
    } else {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalDays = diffDays > 0 ? diffDays : 1.0;
    }

    // Check monthly balance
    const allocation = await MonthlyAllocation.findOne({ userId, year, month, leaveTypeId });
    const remaining = allocation ? allocation.remainingDays : 0;

    const newRequest = await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay: !!isHalfDay,
      halfDayPeriod: halfDayPeriod || 'none',
      totalDays,
      reason,
      attachmentName: attachmentName || '',
      status: 'pending'
    });

    await ApprovalLog.create({
      requestId: newRequest._id,
      requestType: 'leave',
      actorId: userId,
      action: 'submitted',
      comment: 'Leave request submitted by staff',
      balanceBefore: remaining,
      balanceAfter: remaining
    });

    // Notify HR / Approver via Gmail
    (async () => {
      try {
        const employee = await User.findById(userId);
        const leaveType = await LeaveType.findById(leaveTypeId);
        const approver = employee?.managerId 
          ? await User.findById(employee.managerId) 
          : await User.findOne({ role: 'admin' });
        await notifyHRNewLeaveRequest({ employee, approver, leaveRequest: newRequest, leaveType });
      } catch (mErr) {
        console.error('[Mail Error] Failed to send leave notification:', mErr.message);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully!',
      request: newRequest,
      warning: remaining < totalDays ? 'Note: Requested days exceed remaining monthly allocation.' : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Submit Late Request
router.post('/requests/late', async (req, res) => {
  try {
    const { userId, date, expectedTime, lateMinutes, reason } = req.body;
    if (!userId || !date || !expectedTime || !reason) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const newRequest = await LateRequest.create({
      userId,
      date,
      expectedTime,
      lateMinutes: Number(lateMinutes) || 30,
      reason,
      status: 'pending'
    });

    await ApprovalLog.create({
      requestId: newRequest._id,
      requestType: 'late',
      actorId: userId,
      action: 'submitted',
      comment: 'Late-arrival request submitted by staff'
    });

    // Notify HR / Approver via Gmail
    (async () => {
      try {
        const employee = await User.findById(userId);
        const approver = employee?.managerId 
          ? await User.findById(employee.managerId) 
          : await User.findOne({ role: 'admin' });
        await notifyHRNewLateRequest({ employee, approver, lateRequest: newRequest });
      } catch (mErr) {
        console.error('[Mail Error] Failed to send late arrival notification:', mErr.message);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Late arrival report submitted successfully!',
      request: newRequest
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. User Requests History
router.get('/requests/my/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // 'all', 'leave', 'late'

    let leaves = [];
    let lates = [];

    if (type !== 'late') {
      leaves = await LeaveRequest.find({ userId }).populate('leaveTypeId').populate('approverId', 'name designation').sort({ createdAt: -1 });
    }
    if (type !== 'leave') {
      lates = await LateRequest.find({ userId }).populate('approverId', 'name designation').sort({ createdAt: -1 });
    }

    res.json({
      leaves,
      lates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Cancel pending request
router.post('/requests/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { requestType, userId } = req.body;

    if (requestType === 'leave') {
      const reqDoc = await LeaveRequest.findById(id);
      if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
      if (reqDoc.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      reqDoc.status = 'cancelled';
      await reqDoc.save();
    } else {
      const reqDoc = await LateRequest.findById(id);
      if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
      if (reqDoc.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      reqDoc.status = 'cancelled';
      await reqDoc.save();
    }

    res.json({ success: true, message: 'Request successfully cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. HR / Approver: List pending requests
router.get('/approvals/pending', async (req, res) => {
  try {
    const pendingLeaves = await LeaveRequest.find({ status: 'pending' })
      .populate('userId', 'name email employeeCode department designation avatar')
      .populate('leaveTypeId')
      .sort({ createdAt: -1 });

    const pendingLates = await LateRequest.find({ status: 'pending' })
      .populate('userId', 'name email employeeCode department designation avatar')
      .sort({ createdAt: -1 });

    res.json({
      leaves: pendingLeaves,
      lates: pendingLates,
      totalCount: pendingLeaves.length + pendingLates.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Approver Decision (Approve / Reject)
router.post('/approvals/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { requestType, action, approverId, comment } = req.body;
    const { year, month } = getPeriod();

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approved or rejected.' });
    }

    if (requestType === 'leave') {
      const leave = await LeaveRequest.findById(id);
      if (!leave) return res.status(404).json({ error: 'Leave request not found' });
      if (leave.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

      let currentAlloc = await MonthlyAllocation.findOne({
        userId: leave.userId,
        year,
        month,
        leaveTypeId: leave.leaveTypeId
      });

      const balanceBefore = currentAlloc ? currentAlloc.remainingDays : 0;
      let balanceAfter = balanceBefore;

      if (action === 'approved' && currentAlloc) {
        currentAlloc.takenDays += leave.totalDays;
        currentAlloc.remainingDays = Math.max(0, currentAlloc.allottedDays - currentAlloc.takenDays);
        await currentAlloc.save();
        balanceAfter = currentAlloc.remainingDays;
      }

      leave.status = action;
      leave.approverId = approverId;
      leave.approvalDate = new Date();
      leave.approverComment = comment || (action === 'approved' ? 'Approved by manager.' : 'Declined.');
      leave.balanceAtApproval = balanceAfter;
      await leave.save();

      await ApprovalLog.create({
        requestId: leave._id,
        requestType: 'leave',
        actorId: approverId,
        action,
        comment: leave.approverComment,
        balanceBefore,
        balanceAfter
      });

      // Send Gmail notification to Employee
      (async () => {
        try {
          const employee = await User.findById(leave.userId);
          const approver = await User.findById(approverId);
          await notifyEmployeeDecision({
            employee,
            approver,
            request: leave,
            requestType: 'leave',
            action,
            comment: leave.approverComment,
            balanceAfter
          });
        } catch (mErr) {
          console.error('[Mail Error] Failed to notify employee on leave decision:', mErr.message);
        }
      })();

      return res.json({ success: true, message: `Leave request ${action} successfully!`, request: leave });
    } else {
      const late = await LateRequest.findById(id);
      if (!late) return res.status(404).json({ error: 'Late request not found' });
      if (late.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

      if (action === 'approved') {
        const lateAlloc = await MonthlyLateAllocation.findOne({ userId: late.userId, year, month });
        if (lateAlloc) {
          const hours = (late.lateMinutes || 30) / 60;
          lateAlloc.usedHours += hours;
          lateAlloc.usedCount += 1;
          lateAlloc.remainingHours = Math.max(0, lateAlloc.allottedHours - lateAlloc.usedHours);
          lateAlloc.remainingCount = Math.max(0, lateAlloc.allottedCount - lateAlloc.usedCount);
          await lateAlloc.save();
        }
      }

      late.status = action;
      late.approverId = approverId;
      late.approvalDate = new Date();
      late.approverComment = comment || (action === 'approved' ? 'Late arrival acknowledged.' : 'Disallowed.');
      await late.save();

      await ApprovalLog.create({
        requestId: late._id,
        requestType: 'late',
        actorId: approverId,
        action,
        comment: late.approverComment
      });

      // Send Gmail notification to Employee
      (async () => {
        try {
          const employee = await User.findById(late.userId);
          const approver = await User.findById(approverId);
          await notifyEmployeeDecision({
            employee,
            approver,
            request: late,
            requestType: 'late',
            action,
            comment: late.approverComment
          });
        } catch (mErr) {
          console.error('[Mail Error] Failed to notify employee on late decision:', mErr.message);
        }
      })();

      return res.json({ success: true, message: `Late request ${action} successfully!`, request: late });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. HR Admin: Monthly Consumption & Allocation Matrix
router.get('/admin/consumption', async (req, res) => {
  try {
    const { year, month, monthName } = getPeriod();
    const { search, department } = req.query;

    let userQuery = {};
    if (department && department !== 'All') {
      userQuery.department = department;
    }
    if (search && search.trim()) {
      const q = search.trim();
      userQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { employeeCode: { $regex: q, $options: 'i' } }
      ];
    }

    const [users, leaveTypes, policy] = await Promise.all([
      User.find(userQuery).sort({ role: 1, name: 1 }).lean(),
      LeaveType.find().lean(),
      AllocationPolicy.findOne().lean()
    ]);

    const userIds = users.map(u => u._id);

    // Parallel bulk queries for all users in one round-trip
    const [allAllocs, allLateAllocs, pendingLeavesGroup, pendingLatesGroup] = await Promise.all([
      MonthlyAllocation.find({ userId: { $in: userIds }, year, month }).populate('leaveTypeId').lean(),
      MonthlyLateAllocation.find({ userId: { $in: userIds }, year, month }).lean(),
      LeaveRequest.aggregate([
        { $match: { userId: { $in: userIds }, status: 'pending' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      LateRequest.aggregate([
        { $match: { userId: { $in: userIds }, status: 'pending' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ])
    ]);

    // O(1) hash maps for lightning-fast lookups
    const allocMap = new Map();
    for (const a of allAllocs) {
      const uid = String(a.userId);
      if (!allocMap.has(uid)) allocMap.set(uid, []);
      allocMap.get(uid).push(a);
    }

    const lateMap = new Map();
    for (const l of allLateAllocs) {
      lateMap.set(String(l.userId), l);
    }

    const pendingLeaveMap = new Map(pendingLeavesGroup.map(g => [String(g._id), g.count]));
    const pendingLateMap = new Map(pendingLatesGroup.map(g => [String(g._id), g.count]));

    const report = users.map(u => {
      const uid = String(u._id);
      const allocs = allocMap.get(uid) || [];
      const lateAlloc = lateMap.get(uid) || { allottedHours: 3, usedHours: 0, remainingHours: 3, usedCount: 0, remainingCount: 3 };

      const totalAllotted = allocs.reduce((a, b) => a + (b.allottedDays || 0), 0);
      const totalTaken = allocs.reduce((a, b) => a + (b.takenDays || 0), 0);
      const totalRemaining = allocs.reduce((a, b) => a + (b.remainingDays || 0), 0);

      const pendingLeaves = pendingLeaveMap.get(uid) || 0;
      const pendingLates = pendingLateMap.get(uid) || 0;
      const extraDays = Math.max(0, totalTaken - totalAllotted);
      const isOverQuota = totalTaken > totalAllotted;

      return {
        user: u,
        leaveAllocations: allocs,
        totalAllotted,
        totalTaken,
        totalRemaining,
        extraDays,
        isOverQuota,
        utilizationPct: totalAllotted > 0 ? Math.round((totalTaken / totalAllotted) * 100) : 0,
        lateAlloc,
        pendingLeaves,
        pendingLates,
        pendingCount: pendingLeaves + pendingLates,
        isOverUtilized: totalRemaining === 0 && totalTaken > 0
      };
    });

    res.json({
      period: { year, month, monthName },
      report,
      leaveTypes,
      policy: policy || { monthlyLateHours: 3.0, monthlyLateCount: 3 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. HR Admin: Allot or update monthly leave quotas and late grace allowances
router.post('/admin/allocate', async (req, res) => {
  try {
    const { userId, applyToAll, leaveTypeId, allottedDays, allocations, lateHours, lateCount, allocatedBy } = req.body;
    const { year, month } = getPeriod();

    const isGlobal = applyToAll === true || userId === 'all' || !userId;

    if (isGlobal) {
      // Apply to ALL staff employees across the organization
      const staffUsers = await User.find({ role: 'staff' });

      // 1. Process leave allocations for all staff
      if (Array.isArray(allocations)) {
        for (const item of allocations) {
          if (item.leaveTypeId && item.allottedDays !== undefined) {
            const daysNum = Math.max(0, Number(item.allottedDays) || 0);

            for (const u of staffUsers) {
              let alloc = await MonthlyAllocation.findOne({ userId: u._id, year, month, leaveTypeId: item.leaveTypeId });
              if (alloc) {
                alloc.allottedDays = daysNum;
                alloc.remainingDays = Math.max(0, daysNum - alloc.takenDays);
                alloc.allocatedBy = allocatedBy || 'HR Company-wide Quota Policy';
                await alloc.save();
              } else {
                await MonthlyAllocation.create({
                  userId: u._id,
                  year,
                  month,
                  leaveTypeId: item.leaveTypeId,
                  allottedDays: daysNum,
                  takenDays: 0,
                  remainingDays: daysNum,
                  allocatedBy: allocatedBy || 'HR Company-wide Quota Policy'
                });
              }
            }

            // Update default in LeaveType for future registrations
            await LeaveType.findByIdAndUpdate(item.leaveTypeId, { defaultMonthlyDays: daysNum });
          }
        }
      }

      // 2. Process late grace allocation for all staff
      if (lateHours !== undefined || lateCount !== undefined) {
        const targetHours = lateHours !== undefined ? Math.max(0, Number(lateHours) || 0) : 3.0;
        const targetCount = lateCount !== undefined ? Math.max(0, Number(lateCount) || 0) : 3;

        for (const u of staffUsers) {
          let lateAlloc = await MonthlyLateAllocation.findOne({ userId: u._id, year, month });
          if (lateAlloc) {
            lateAlloc.allottedHours = targetHours;
            lateAlloc.allottedCount = targetCount;
            lateAlloc.remainingHours = Math.max(0, targetHours - lateAlloc.usedHours);
            lateAlloc.remainingCount = Math.max(0, targetCount - lateAlloc.usedCount);
            lateAlloc.allocatedBy = allocatedBy || 'HR Company-wide Quota Policy';
            await lateAlloc.save();
          } else {
            await MonthlyLateAllocation.create({
              userId: u._id,
              year,
              month,
              allottedHours: targetHours,
              allottedCount: targetCount,
              usedHours: 0,
              usedCount: 0,
              remainingHours: targetHours,
              remainingCount: targetCount,
              allocatedBy: allocatedBy || 'HR Company-wide Quota Policy'
            });
          }
        }

        // Update default allocation policy
        await AllocationPolicy.updateMany({}, {
          monthlyLateHours: targetHours,
          monthlyLateCount: targetCount
        });
      }

      return res.json({
        success: true,
        message: `Quotas successfully applied to all ${staffUsers.length} employees!`
      });
    }

    // Individual employee allocation
    if (Array.isArray(allocations)) {
      for (const item of allocations) {
        if (item.leaveTypeId && item.allottedDays !== undefined) {
          const daysNum = Math.max(0, Number(item.allottedDays) || 0);
          let alloc = await MonthlyAllocation.findOne({ userId, year, month, leaveTypeId: item.leaveTypeId });
          if (alloc) {
            alloc.allottedDays = daysNum;
            alloc.remainingDays = Math.max(0, daysNum - alloc.takenDays);
            alloc.allocatedBy = allocatedBy || 'HR Admin Manual Adjustment';
            await alloc.save();
          } else {
            await MonthlyAllocation.create({
              userId,
              year,
              month,
              leaveTypeId: item.leaveTypeId,
              allottedDays: daysNum,
              takenDays: 0,
              remainingDays: daysNum,
              allocatedBy: allocatedBy || 'HR Admin Manual Adjustment'
            });
          }
        }
      }
    } else if (leaveTypeId && allottedDays !== undefined) {
      const daysNum = Math.max(0, Number(allottedDays) || 0);
      let alloc = await MonthlyAllocation.findOne({ userId, year, month, leaveTypeId });
      if (alloc) {
        alloc.allottedDays = daysNum;
        alloc.remainingDays = Math.max(0, daysNum - alloc.takenDays);
        alloc.allocatedBy = allocatedBy || 'HR Admin Manual Adjustment';
        await alloc.save();
      } else {
        await MonthlyAllocation.create({
          userId,
          year,
          month,
          leaveTypeId,
          allottedDays: daysNum,
          takenDays: 0,
          remainingDays: daysNum,
          allocatedBy: allocatedBy || 'HR Admin Manual Adjustment'
        });
      }
    }

    if (lateHours !== undefined || lateCount !== undefined) {
      let lateAlloc = await MonthlyLateAllocation.findOne({ userId, year, month });
      const targetHours = lateHours !== undefined ? Math.max(0, Number(lateHours) || 0) : (lateAlloc?.allottedHours ?? 3.0);
      const targetCount = lateCount !== undefined ? Math.max(0, Number(lateCount) || 0) : (lateAlloc?.allottedCount ?? 3);

      if (lateAlloc) {
        lateAlloc.allottedHours = targetHours;
        lateAlloc.allottedCount = targetCount;
        lateAlloc.remainingHours = Math.max(0, targetHours - lateAlloc.usedHours);
        lateAlloc.remainingCount = Math.max(0, targetCount - lateAlloc.usedCount);
        lateAlloc.allocatedBy = allocatedBy || 'HR Admin Manual Adjustment';
        await lateAlloc.save();
      } else {
        await MonthlyLateAllocation.create({
          userId,
          year,
          month,
          allottedHours: targetHours,
          allottedCount: targetCount,
          usedHours: 0,
          usedCount: 0,
          remainingHours: targetHours,
          remainingCount: targetCount,
          allocatedBy: allocatedBy || 'HR Admin Manual Adjustment'
        });
      }
    }

    res.json({ success: true, message: 'Employee quotas successfully allotted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. HR Admin: Comprehensive Late & Leave Tracking Logs
router.get('/admin/tracking', async (req, res) => {
  try {
    const { year, month } = getPeriod();
    const { search, department } = req.query;

    let userFilter = {};
    if (department && department !== 'All') {
      userFilter.department = department;
    }
    if (search && search.trim()) {
      const q = search.trim();
      userFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { employeeCode: { $regex: q, $options: 'i' } }
      ];
    }

    let leaveQuery = {};
    let lateQuery = {};

    if (Object.keys(userFilter).length > 0) {
      const matchingUsers = await User.find(userFilter).select('_id');
      const matchingUserIds = matchingUsers.map(u => u._id);

      if (search && search.trim()) {
        const reasonRegex = { $regex: search.trim(), $options: 'i' };
        leaveQuery.$or = [
          { userId: { $in: matchingUserIds } },
          { reason: reasonRegex }
        ];
        lateQuery.$or = [
          { userId: { $in: matchingUserIds } },
          { reason: reasonRegex }
        ];
      } else {
        leaveQuery.userId = { $in: matchingUserIds };
        lateQuery.userId = { $in: matchingUserIds };
      }
    } else if (search && search.trim()) {
      const reasonRegex = { $regex: search.trim(), $options: 'i' };
      leaveQuery.reason = reasonRegex;
      lateQuery.reason = reasonRegex;
    }

    const [leaves, lates, activeStaffCount, policy] = await Promise.all([
      LeaveRequest.find(leaveQuery)
        .populate('userId', 'name email employeeCode department designation')
        .populate('leaveTypeId', 'name code color')
        .populate('approverId', 'name')
        .sort({ createdAt: -1 }),
      LateRequest.find(lateQuery)
        .populate('userId', 'name email employeeCode department designation')
        .populate('approverId', 'name')
        .sort({ createdAt: -1 }),
      User.countDocuments({ role: 'staff', status: 'active' }),
      AllocationPolicy.findOne()
    ]);

    // Calculate summary statistics
    const approvedLeaves = leaves.filter(l => l.status === 'approved');
    const approvedLates = lates.filter(l => l.status === 'approved');

    const totalDaysTaken = approvedLeaves.reduce((acc, l) => acc + (l.totalDays || 0), 0);
    const totalLateMinutes = approvedLates.reduce((acc, l) => acc + (l.lateMinutes || 0), 0);
    const totalLateHours = (totalLateMinutes / 60).toFixed(1);

    res.json({
      leaves,
      lates,
      policy: policy || { lateHours: 3.0, lateCount: 3 },
      summary: {
        activeStaffCount,
        totalLeavesTaken: totalDaysTaken,
        totalLateIncidents: approvedLates.length,
        totalLateHours
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
