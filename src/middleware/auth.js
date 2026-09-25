const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Authentication token is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_token_key_student_ticket_system_2026');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User account no longer exists',
      });
    }

    // Access control check: Revoked accounts cannot execute requests
    if (user.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Your institutional account access has been revoked by administration.',
        accountStatus: 'REVOKED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or expired token',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role [${req.user ? req.user.role : 'GUEST'}] is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
