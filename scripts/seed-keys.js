require('dotenv').config();
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const websites = [
  { name: 'Frutas del Campo', domain: 'frutasdelcampo.com' },
  { name: 'Little Anime Shop', domain: 'littleanimeshop.com' },
  { name: 'Frutales del Carmelo', domain: 'frutalesdelcarmelo.com' }
];

async function seedKeys() {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('🍃 Connected to MongoDB');

    const db = client.db('analyticsDb');
    const collection = db.collection('apiKeys');

    console.log('\n📋 Creating API keys...\n');

    for (const site of websites) {
      const keyPrefix = site.name.toLowerCase().replace(/\s+/g, '');
      const key = `ak_${keyPrefix}_${crypto.randomUUID()}`;

      // Check if key already exists for this domain
      const existing = await collection.findOne({ domain: site.domain });
      if (existing) {
        console.log(`⚠️  ${site.name}`);
        console.log(`   Domain: ${site.domain}`);
        console.log(`   API Key: ${existing.key} (already exists)`);
        console.log('');
        continue;
      }

      await collection.insertOne({
        key,
        name: site.name,
        domain: site.domain,
        active: true,
        createdAt: new Date(),
        requestCount: 0
      });

      console.log(`✅ ${site.name}`);
      console.log(`   Domain: ${site.domain}`);
      console.log(`   API Key: ${key}`);
      console.log('');
    }

    console.log('✨ Done! Save these keys in a safe place.');
    console.log('💡 Tip: Use these keys in your website HTML with:');
    console.log('   window.ANALYTICS_API_KEY = "ak_your_key_here";');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedKeys();
