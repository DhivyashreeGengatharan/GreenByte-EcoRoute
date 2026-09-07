const express = require('express');
const bcrypt = require('bcryptjs');
const { getUsersCollection } = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

const router = express.Router();

/**
 * POST /auth/signup
 * Register a new user
 * Body: { name, email, password }
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Signup attempt for:', { name, email });

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    if (password.length < 4) {
      console.log('❌ Password too short (req: 4)');
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 4 characters long'
      });
    }

    const usersCollection = await getUsersCollection();

    // Check if user already exists
    console.log('🔍 Checking if email exists:', email);
    const existingUser = await usersCollection.findOne({ email });
    
    if (existingUser) {
      console.log('❌ Email already registered:', email);
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please login instead.'
      });
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user document
    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Inserting new user...');
    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    console.log('✅ User created with ID:', userId);

    // Generate JWT token
    const token = generateToken(userId, email);
    
    console.log('✅ Token generated for new user');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        name,
        email
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Signup failed. Please try again.'
    });
  }
});

/**
 * POST /auth/login
 * Login user
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for email:', email);

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const usersCollection = await getUsersCollection();

    // Find user
    console.log('🔍 Searching for user in database:', email);
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found in database:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ User found with ID:', user._id);

    // Check password
    console.log('🔒 Verifying password for:', email);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification FAILED for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ Password verified successfully');

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.email);
    
    console.log('✅ Token generated for user:', user._id);

    console.log('🚀 Login SUCCESS for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('💥 CRITICAL LOGIN ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /auth/verify
 * Verify if token is valid and get user info
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        authenticated: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Token verification failed'
    });
  }
});

module.exports = router;
