const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'greenbyte_super_secret_jwt_key_2026';

/**
 * Middleware to verify JWT token
 * Extracted token from Authorization header: "Bearer <token>"
 */
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided. Please login first.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired. Please login again.' 
      });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token. Please login again.' 
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

module.exports = {
  verifyToken,
  generateToken
};
