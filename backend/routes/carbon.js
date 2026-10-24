const express = require('express');
const { getCarbonCreditsCollection, getUsersCollection } = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

const router = express.Router();

/**
 * POST /carbon/store
 * Store carbon credits for authenticated user
 * Protected route - requires JWT token
 * Body: { route, carbonSaved, distance }
 */
router.post('/store', verifyToken, async (req, res) => {
  try {
    const { route, carbonSaved, distance } = req.body;
    const userId = req.user.userId;

    console.log('🔶 Store Carbon Request:', {
      userId,
      carbonSaved,
      distance,
      hasRoute: !!route
    });

    // Validation
    if (!route) {
      console.log('❌ Missing route data');
      return res.status(400).json({
        success: false,
        error: 'Route data is required'
      });
    }

    if (carbonSaved === undefined || carbonSaved === null) {
      console.log('❌ Missing carbonSaved value');
      return res.status(400).json({
        success: false,
        error: 'carbonSaved value is required'
      });
    }

    const carbonValue = parseFloat(carbonSaved);
    
    // We now allow 0 carbon savings if the route is valid and has credits
    if (isNaN(carbonValue) || carbonValue < 0) {
      console.log('❌ Invalid carbonSaved value:', carbonValue);
      return res.status(400).json({
        success: false,
        error: 'carbonSaved must be a non-negative number'
      });
    }

    if (!userId) {
      console.log('❌ Missing userId from token');
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      });
    }

    console.log('📊 Getting collections for storage...');
    const carbonCreditsCollection = await getCarbonCreditsCollection();
    const usersCollection = await getUsersCollection();
    console.log('✅ Collections retrieved successfully');

    // Duplicate Check: See if this exact route ID was already saved by this user
    console.log('🔍 Checking for duplicate route storage:', route.id);
    const existingEntry = await carbonCreditsCollection.findOne({ 
      userId: new ObjectId(userId), 
      'route.id': route.id 
    });

    if (existingEntry) {
      console.log('⚠️ Duplicate store attempt blocked for route:', route.id);
      return res.status(409).json({
        success: false,
        error: 'This route has already been saved to your account.'
      });
    }

    // Safe ObjectId conversion
    let userObjectId;
    try {
      console.log('🔍 Converting userId to ObjectId:', userId);
      userObjectId = new ObjectId(userId);
      console.log('✅ ObjectId conversion successful');
    } catch (oidError) {
      console.error('❌ Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        error: 'Invalid user session. Please logout and login again.'
      });
    }

    // Create carbon credit record
    const carbonRecord = {
      userId: userObjectId,
      route: {
        id: route.id,
        type: route.type,
        optimizationTriggered: route.optimizationTriggered,
        summary: route.summary
      },
      carbonSaved: carbonValue,
      distance: distance ? parseFloat(distance) : 0,
      storedAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Attempting to insert record into database...');

    const result = await carbonCreditsCollection.insertOne(carbonRecord);

    console.log('✅ Record inserted with ID:', result.insertedId);

    // Aggregate credits into User document
    console.log('🏢 Syncing total credits to User profile...');
    await usersCollection.updateOne(
      { _id: userObjectId },
      { 
        $inc: { 
          totalCarbonSaved: carbonValue, 
          totalCreditsSaved: 1 
        },
        $set: { updatedAt: new Date() }
      }
    );
    console.log('✅ User profile updated with new totals');

    res.status(201).json({
      success: true,
      message: 'Carbon credits stored successfully!',
      carbonCredit: {
        id: result.insertedId.toString(),
        userId: userId,
        carbonSaved: carbonValue,
        distance: distance ? parseFloat(distance) : 0,
        storedAt: carbonRecord.storedAt
      }
    });
    console.log('✅ Carbon credit saved successfully with ID:', result.insertedId);
  } catch (error) {
    console.error('💥 CRITICAL CARBON STORAGE ERROR:', error);
    res.status(500).json({
      success: false,
      error: `Server failed to save credits: ${error.message}`
    });
  }
});

/**
 * GET /carbon/user
 * Get all carbon credits for authenticated user
 * Protected route - requires JWT token
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📂 Fetching carbon credits for user:', userId);

    const carbonCreditsCollection = await getCarbonCreditsCollection();

    const credits = await carbonCreditsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ storedAt: -1 })
      .toArray();

    console.log(`✅ Found ${credits.length} carbon credits`);

    const totalCarbonSaved = credits.reduce((sum, credit) => sum + credit.carbonSaved, 0);

    res.json({
      success: true,
      totalCarbonSaved,
      count: credits.length,
      credits: credits.map(credit => ({
        id: credit._id.toString(),
        route: credit.route,
        carbonSaved: credit.carbonSaved,
        distance: credit.distance,
        storedAt: credit.storedAt
      }))
    });
  } catch (error) {
    console.error('❌ Get carbon credits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch carbon credits'
    });
  }
});

/**
 * GET /carbon/stats
 * Get user statistics
 * Protected route - requires JWT token
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📊 Fetching stats from User profile:', userId);
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stats = {
      totalCredits: user.totalCreditsSaved || 0,
      totalCarbonSaved: user.totalCarbonSaved || 0,
      // Fallback calculation for safety
      totalDistance: 0 
    };

    console.log('✅ Stats calculated:', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    });
  }
});

/**
 * Predefined Toll Plazas with standard rates
 */
const TOLL_PLAZAS = [
  {
    id: 'toll-navalur',
    name: 'Navalur Toll Plaza (OMR IT Corridor, Chennai)',
    highway: 'SH-49A (Rajiv Gandhi Salai)',
    standardFee: 85,
    city: 'Chennai, TN',
    coordinates: { lat: 12.8458, lon: 80.2267 },
    concessionaire: 'Tamil Nadu Road Development Company (TNRDC)'
  },
  {
    id: 'toll-paranur',
    name: 'Paranur Toll Plaza (Chengalpattu, GST Road)',
    highway: 'NH-45 (Grand Southern Trunk Rd)',
    standardFee: 75,
    city: 'Chengalpattu / Chennai, TN',
    coordinates: { lat: 12.7142, lon: 79.9982 },
    concessionaire: 'National Highways Authority of India (NHAI)'
  },
  {
    id: 'toll-nemili',
    name: 'Nemili Toll Plaza (Sriperumbudur Expressway)',
    highway: 'NH-48 (Chennai - Bengaluru Highway)',
    standardFee: 90,
    city: 'Sriperumbudur, TN',
    coordinates: { lat: 12.9841, lon: 79.9213 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-pallikonda',
    name: 'Pallikonda Toll Plaza (Vellore Corridor)',
    highway: 'NH-48 (Vellore - Ambur Section)',
    standardFee: 105,
    city: 'Vellore, TN',
    coordinates: { lat: 12.8722, lon: 78.9614 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kaniyur',
    name: 'Kaniyur Toll Plaza (Coimbatore Bypass)',
    highway: 'NH-544 (Salem - Kochi Corridor)',
    standardFee: 110,
    city: 'Coimbatore, TN',
    coordinates: { lat: 11.0825, lon: 77.1422 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kherki',
    name: 'Kherki Daula Toll Plaza (Delhi - Gurgaon Expressway)',
    highway: 'NH-48 (Delhi - NCR)',
    standardFee: 80,
    city: 'Gurgaon, Haryana',
    coordinates: { lat: 28.3982, lon: 76.9842 },
    concessionaire: 'Millennium City Expressway'
  }
];

/**
 * GET /carbon/toll-plazas
 * Fetch supported highway toll gates for carbon redemption
 */
router.get('/toll-plazas', (req, res) => {
  res.json({
    success: true,
    tollPlazas: TOLL_PLAZAS
  });
});

/**
 * POST /carbon/redeem-fastag
 * Burn user carbon credits for instantaneous FASTag toll fee waiver
 * Protected route - requires JWT token
 * Body: { tollPlazaId, vehicleNumber, creditsToRedeem }
 */
router.post('/redeem-fastag', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tollPlazaId, vehicleNumber, creditsToRedeem } = req.body;

    if (!tollPlazaId) {
      return res.status(400).json({ success: false, error: 'Toll Plaza ID is required' });
    }

    if (!vehicleNumber || vehicleNumber.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'A valid vehicle registration number is required (e.g. TN 09 AB 1234)' });
    }

    const burnAmount = Math.max(1, parseInt(creditsToRedeem, 10) || 0);

    const tollPlaza = TOLL_PLAZAS.find(p => p.id === tollPlazaId) || TOLL_PLAZAS[0];

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    const availableCredits = user.totalCreditsSaved || 0;
    if (availableCredits < burnAmount) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient credits. You have ${availableCredits} credits, but requested to redeem ${burnAmount}.` 
      });
    }

    // 1 Credit = INR 1.00 Toll Discount
    const maxDiscount = tollPlaza.standardFee;
    const actualDiscount = Math.min(burnAmount, maxDiscount);
    const netPayable = Math.max(0, tollPlaza.standardFee - actualDiscount);

    // Deduct credits from user
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { totalCreditsSaved: -burnAmount },
        $set: { updatedAt: new Date() }
      }
    );

    const voucherId = 'FT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = new Date().toISOString();
    const qrData = `FASTAG://GREEN-PASS?id=${voucherId}&veh=${encodeURIComponent(vehicleNumber.toUpperCase())}&toll=${encodeURIComponent(tollPlaza.name)}&discount=${actualDiscount}&net=${netPayable}&time=${timestamp}`;

    const voucher = {
      voucherId,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      tollPlazaId: tollPlaza.id,
      tollPlazaName: tollPlaza.name,
      highway: tollPlaza.highway,
      concessionaire: tollPlaza.concessionaire,
      standardTollFee: tollPlaza.standardFee,
      creditsRedeemed: burnAmount,
      discountAmount: actualDiscount,
      netAmountPayable: netPayable,
      status: netPayable === 0 ? '100% TOLL WAIVED (GREEN PASS)' : 'PARTIAL DISCOUNT APPLIED',
      qrData,
      timestamp,
      remainingCredits: availableCredits - burnAmount
    };

    console.log(`✅ FASTag voucher ${voucherId} issued for ${vehicleNumber} at ${tollPlaza.name}`);

    res.status(200).json({
      success: true,
      message: netPayable === 0 
        ? '🎉 100% Toll Waived! Green FASTag Pass Generated.' 
        : `✅ ₹${actualDiscount} discount applied to your FASTag toll.`,
      voucher
    });
  } catch (error) {
    console.error('❌ FASTag redemption error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'FASTag redemption failed'
    });
  }
});

module.exports = router;

