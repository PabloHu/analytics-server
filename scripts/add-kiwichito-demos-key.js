#!/usr/bin/env node

/**
 * Add Kiwichito Demos API Key
 *
 * Run this script on the Raspberry Pi to add the kiwichito-demos API key
 * to the analytics database.
 *
 * Usage:
 *   node scripts/add-kiwichito-demos-key.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const API_KEY = {
  key: 'ak_kiwitochitodemos_ac6e1369-bb20-4e40-a422-adfacdbe6c33',
  name: 'Kiwichito Demos',
  domain: 'kiwichito.com',
  active: true,
  createdAt: new Date(),
  lastUsed: null,
  requestCount: 0
};

async function addApiKey() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('analyticsDb');
    const collection = db.collection('apiKeys');

    // Check if key already exists
    const existing = await collection.findOne({ key: API_KEY.key });

    if (existing) {
      console.log('⚠️  API key already exists');
      console.log('Key:', API_KEY.key);
      console.log('Name:', existing.name);
      console.log('Domain:', existing.domain);
      console.log('Active:', existing.active);
      return;
    }

    // Insert new API key
    console.log('➕ Adding new API key...');
    const result = await collection.insertOne(API_KEY);

    console.log('✅ API key added successfully!');
    console.log('');
    console.log('📊 Key Details:');
    console.log('  Key:', API_KEY.key);
    console.log('  Name:', API_KEY.name);
    console.log('  Domain:', API_KEY.domain);
    console.log('  ID:', result.insertedId);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Analytics script is already added to kiwichito-demos/src/index.html');
    console.log('  2. Update analytics server CORS to include kiwichito.com');
    console.log('  3. Deploy kiwichito-demos to see analytics in action');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('');
    console.log('🔌 MongoDB connection closed');
  }
}

addApiKey();
