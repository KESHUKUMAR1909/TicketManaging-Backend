const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { generateUsersExcelFile } = require('../utils/excelHelper');

// @desc    Get all users with search, role, status filtering and pagination
// @route   GET /api/users
// @access  Private (Admin, Management)
const getUsers = async (req, res, next) => {
  try {
    const { role, status, department, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (role && role !== 'ALL') {
      query.role = role;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (department && department !== 'ALL') {
      query.department = department;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user (Student or Staff/Admin)
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, rollNumber, program, phone, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'STUDENT',
      status: 'ACTIVE',
      department: department || 'General Support',
      rollNumber: rollNumber || '',
      program: program || '',
      phone: phone || '',
      avatar: avatar || '',
    });

    res.status(201).json({
      success: true,
      message: `${newUser.role} user created successfully`,
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle grant / revoke user access
// @route   PATCH /api/users/:id/access
// @access  Private (Admin only)
const toggleUserAccess = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Safety rule: Admin cannot revoke their own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot revoke your own administrative access',
      });
    }

    const newStatus = status ? status.toUpperCase() : user.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    user.status = newStatus;
    await user.save();

    res.json({
      success: true,
      message: `User access has been ${newStatus === 'ACTIVE' ? 'GRANTED' : 'REVOKED'} for ${user.name}`,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active staff directory for ticket assignments
// @route   GET /api/users/staff
// @access  Private (Staff, Admin, Management)
const getStaffList = async (req, res, next) => {
  try {
    const staff = await User.find({
      role: { $in: ['STAFF', 'ADMIN', 'MANAGEMENT'] },
      status: 'ACTIVE',
    })
      .select('name email role department avatar')
      .lean();

    res.json({
      success: true,
      staff,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export or Download Excel File containing 20 students and 5 admin records
// @route   GET /api/users/export-excel
// @access  Private (Admin, Management)
const exportUsersExcel = async (req, res, next) => {
  try {
    const recordsPath = path.join(__dirname, '../../../records/users_records.xlsx');
    // Ensure file exists
    if (!fs.existsSync(recordsPath)) {
      generateUsersExcelFile(recordsPath);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Campus_Support_20_Students_5_Admins_Records.xlsx"'
    );

    const fileStream = fs.createReadStream(recordsPath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  toggleUserAccess,
  getStaffList,
  exportUsersExcel,
};
