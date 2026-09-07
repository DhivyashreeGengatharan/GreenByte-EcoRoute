const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { MongoClient, ObjectId } = require('mongodb');

const localDbPath = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join('/tmp', 'localDb.json')
  : path.join(__dirname, 'localDb.json');
let db;
let client;
let isLocalFallback = false;
let localCache = null;

const defaultLocalDb = {
  users: [],
  carbonCredits: []
};

const readLocalDb = () => {
  if (localCache) return localCache;
  try {
    if (!fs.existsSync(localDbPath)) {
      fs.writeFileSync(localDbPath, JSON.stringify(defaultLocalDb, null, 2));
    }
    const content = fs.readFileSync(localDbPath, 'utf-8');
    localCache = JSON.parse(content || '{}');
  } catch (error) {
    console.warn('⚠️ Failed to read local DB file, initializing fresh store:', error.message);
    localCache = { ...defaultLocalDb };
  }

  localCache.users = Array.isArray(localCache.users) ? localCache.users : [];
  localCache.carbonCredits = Array.isArray(localCache.carbonCredits) ? localCache.carbonCredits : [];

  return localCache;
};

const writeLocalDb = async () => {
  try {
    if (!localCache) localCache = { ...defaultLocalDb };
    await fs.promises.writeFile(localDbPath, JSON.stringify(localCache, null, 2));
  } catch (error) {
    console.error('❌ Failed to persist local DB file:', error.message);
  }
};

const getValueByPath = (obj, path) => {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
};

const matchesQuery = (doc, query) => {
  if (!query) return true;
  return Object.keys(query).every(key => {
    const queryValue = query[key];
    const actualValue = getValueByPath(doc, key);

    if (queryValue instanceof ObjectId) {
      return actualValue?.toString() === queryValue.toString();
    }

    if (typeof queryValue === 'object' && queryValue !== null && !Array.isArray(queryValue)) {
      return matchesQuery({ [key]: actualValue }, queryValue);
    }

    return actualValue === queryValue;
  });
};

const createLocalCollection = (name) => ({
  findOne: async (query) => {
    const db = readLocalDb();
    return db[name].find(item => matchesQuery(item, query)) || null;
  },
  insertOne: async (doc) => {
    const db = readLocalDb();
    const _id = new ObjectId().toString();
    const record = { ...doc, _id };
    db[name].push(record);
    await writeLocalDb();
    return { insertedId: _id };
  },
  updateOne: async (filter, update) => {
    const db = readLocalDb();
    const item = db[name].find(entry => matchesQuery(entry, filter));
    if (!item) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    if (update.$set) {
      Object.assign(item, update.$set);
    }
    if (update.$inc) {
      Object.keys(update.$inc).forEach(key => {
        item[key] = (item[key] || 0) + update.$inc[key];
      });
    }
    await writeLocalDb();
    return { matchedCount: 1, modifiedCount: 1 };
  },
  find: (query) => {
    const db = readLocalDb();
    const results = db[name].filter(item => matchesQuery(item, query));
    return {
      sort: function(sortObj) {
        const entries = Object.entries(sortObj || {});
        if (entries.length) {
          results.sort((a, b) => {
            for (const [key, direction] of entries) {
              const aValue = getValueByPath(a, key);
              const bValue = getValueByPath(b, key);
              if (aValue > bValue) return direction > 0 ? 1 : -1;
              if (aValue < bValue) return direction > 0 ? -1 : 1;
            }
            return 0;
          });
        }
        return this;
      },
      toArray: async () => results
    };
  }
});

const connectDB = async () => {
  if (db) {
    return db;
  }

  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ No MongoDB URI configured, falling back to local file storage');
    isLocalFallback = true;
    db = {
      collection: createLocalCollection
    };
    return db;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('🌐 DNS servers set to Google and Cloudflare for SRV lookups');
    client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB successfully');
    const collections = await db.listCollections().toArray();
    console.log('📦 Available collections:', collections.map(c => c.name));
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️ Falling back to local file storage for users and credits');
    isLocalFallback = true;
    db = {
      collection: createLocalCollection
    };
    return db;
  }
};

const getUsersCollection = async () => {
  const database = await connectDB();
  const collection = database.collection('users');
  console.log(`✅ Users collection ready (${isLocalFallback ? 'local fallback' : 'mongo'})`);
  return collection;
};

const getCarbonCreditsCollection = async () => {
  const database = await connectDB();
  const collection = database.collection('carbonCredits');
  console.log(`✅ Carbon Credits collection ready (${isLocalFallback ? 'local fallback' : 'mongo'})`);
  return collection;
};

module.exports = {
  connectDB,
  getUsersCollection,
  getCarbonCreditsCollection,
  ObjectId
};
