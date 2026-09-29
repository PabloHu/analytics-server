/**
 * RBAC Migration Script v1.0
 *
 * Migrates kiwichitoDb.userAccess to simplified RBAC model
 *
 * Changes:
 * - Add role field (owner, admin, viewer, service)
 * - Add type field (human, service)
 * - Add permissions array (flat strings)
 * - Add allowedDemos array (["*"] = all, [] = none)
 * - Add expiresAt field (null = permanent)
 * - Add schemaVersion
 * - Add createdBy/grantedBy tracking
 * - Create auditLog collection with TTL index
 * - Create emergencyAccess collection
 *
 * Author: Pablo Huamani
 * Date: 2026-09-28
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://192.168.12.179:27017';
const DB_NAME = 'kiwichitoDb';

// Role permission templates
const ROLE_PERMISSIONS = {
  owner: ['*:*'], // God mode
  admin: [
    'users:read',
    'demos:read',
    'demos:write',
    'demos:create',
    'demos:delete',
    'analytics:read',
    'analytics:export',
  ],
  viewer: [
    'demos:read:assigned',
    'settings:read:self',
  ],
  service: [
    'api:read',
    'api:write',
  ],
};

// Configuration
const OWNER_EMAIL = 'kiwichito@gmail.com';
const BACKUP_ADMIN_EMAIL = 'phuaman@gmail.com';
const SCHEMA_VERSION = 1;

async function migrate() {
  console.log('🚀 Starting RBAC Migration v1.0...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const userAccess = db.collection('userAccess');
    const auditLog = db.collection('auditLog');
    const emergencyAccess = db.collection('emergencyAccess');

    // ==========================================
    // STEP 1: Set Owner
    // ==========================================
    console.log('📋 Step 1: Setting owner...');

    const ownerResult = await userAccess.updateOne(
      { email: OWNER_EMAIL, status: 'granted' },
      {
        $set: {
          role: 'owner',
          type: 'human',
          isOwner: true,
          permissions: ROLE_PERMISSIONS.owner,
          allowedDemos: ['*'], // Owner sees all
          expiresAt: null,
          grantedBy: 'system-migration',
          grantedAt: new Date(),
          updatedBy: 'system-migration',
          updatedAt: new Date(),
          schemaVersion: SCHEMA_VERSION,
        },
      }
    );

    if (ownerResult.modifiedCount === 1) {
      console.log(`✅ Owner set: ${OWNER_EMAIL}\n`);
    } else {
      throw new Error(`❌ Failed to set owner: ${OWNER_EMAIL}`);
    }

    // ==========================================
    // STEP 2: Set Backup Admin
    // ==========================================
    console.log('📋 Step 2: Setting backup admin...');

    const backupAdminResult = await userAccess.updateOne(
      { email: BACKUP_ADMIN_EMAIL, status: 'granted' },
      {
        $set: {
          role: 'admin',
          type: 'human',
          isOwner: false,
          permissions: ROLE_PERMISSIONS.admin,
          allowedDemos: ['*'], // Backup admin sees all
          expiresAt: null,
          grantedBy: OWNER_EMAIL,
          grantedAt: new Date(),
          updatedBy: 'system-migration',
          updatedAt: new Date(),
          schemaVersion: SCHEMA_VERSION,
        },
      }
    );

    if (backupAdminResult.modifiedCount === 1) {
      console.log(`✅ Backup admin set: ${BACKUP_ADMIN_EMAIL}\n`);
    } else {
      console.log(`⚠️  Backup admin not found or already migrated: ${BACKUP_ADMIN_EMAIL}\n`);
    }

    // ==========================================
    // STEP 3: Identify Service Accounts
    // ==========================================
    console.log('📋 Step 3: Setting service accounts...');

    const serviceAccountResult = await userAccess.updateMany(
      {
        email: {
          $regex: /@.*\.local$|mcp|service|bot/i,
          $nin: [OWNER_EMAIL, BACKUP_ADMIN_EMAIL]
        },
        status: 'granted'
      },
      {
        $set: {
          role: 'service',
          type: 'service',
          isOwner: false,
          permissions: ROLE_PERMISSIONS.service,
          allowedDemos: [], // Service accounts get no demo access by default
          expiresAt: null,
          grantedBy: OWNER_EMAIL,
          grantedAt: new Date(),
          updatedBy: 'system-migration',
          updatedAt: new Date(),
          schemaVersion: SCHEMA_VERSION,
        },
      }
    );

    console.log(`✅ Service accounts set: ${serviceAccountResult.modifiedCount}\n`);

    // ==========================================
    // STEP 4: Set Other Users as Viewers (No Access)
    // ==========================================
    console.log('📋 Step 4: Setting other users as viewers...');

    const viewerResult = await userAccess.updateMany(
      {
        status: 'granted',
        email: {
          $nin: [OWNER_EMAIL, BACKUP_ADMIN_EMAIL],
          $not: { $regex: /@.*\.local$|mcp|service|bot/i }
        },
        role: { $exists: false } // Only update if not already migrated
      },
      {
        $set: {
          role: 'viewer',
          type: 'human',
          isOwner: false,
          permissions: ROLE_PERMISSIONS.viewer,
          allowedDemos: [], // No demo access initially - owner must assign
          expiresAt: null,
          grantedBy: OWNER_EMAIL,
          grantedAt: new Date(),
          updatedBy: 'system-migration',
          updatedAt: new Date(),
          schemaVersion: SCHEMA_VERSION,
        },
      }
    );

    console.log(`✅ Viewers set: ${viewerResult.modifiedCount} users\n`);

    // ==========================================
    // STEP 5: Create Audit Log Collection
    // ==========================================
    console.log('📋 Step 5: Creating audit log collection...');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'auditLog' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('auditLog');
      console.log('✅ Created auditLog collection');
    } else {
      console.log('ℹ️  auditLog collection already exists');
    }

    // Create indexes
    await auditLog.createIndex({ timestamp: -1 });
    await auditLog.createIndex({ 'actor.email': 1 });
    await auditLog.createIndex({ action: 1 });
    await auditLog.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
    console.log('✅ Created audit log indexes\n');

    // Log migration event
    const migrationLog = {
      timestamp: new Date(),
      action: 'system.migration',
      actor: {
        uid: 'system',
        email: 'system-migration',
        role: 'system',
      },
      target: {
        type: 'database',
        id: DB_NAME,
        name: 'kiwichitoDb',
      },
      changes: {
        description: 'Migrated to RBAC v1.0 with owner/admin/viewer/service roles',
        schemaVersion: SCHEMA_VERSION,
        ownerEmail: OWNER_EMAIL,
        backupAdminEmail: BACKUP_ADMIN_EMAIL,
      },
      result: 'success',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year retention
    };

    await auditLog.insertOne(migrationLog);
    console.log('✅ Migration logged to audit log\n');

    // ==========================================
    // STEP 6: Create Emergency Access Collection
    // ==========================================
    console.log('📋 Step 6: Creating emergency access...');

    // Check if collection exists
    const emergencyCollections = await db.listCollections({ name: 'emergencyAccess' }).toArray();
    if (emergencyCollections.length === 0) {
      await db.createCollection('emergencyAccess');
      console.log('✅ Created emergencyAccess collection');
    } else {
      console.log('ℹ️  emergencyAccess collection already exists');
    }

    // Generate recovery code
    const recoveryCode = `kiwi-recovery-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10)}`;

    const emergencyAccessDoc = {
      recoveryCode: recoveryCode, // In production, hash this!
      description: 'Emergency break-glass access for owner recovery',
      allowsAction: 'owner.recovery',
      usableBy: [BACKUP_ADMIN_EMAIL],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      requiresMFA: false, // Set to true in production
      usageLimit: 1,
      usageCount: 0,
      lastUsedAt: null,
      lastUsedBy: null,
    };

    await emergencyAccess.insertOne(emergencyAccessDoc);
    console.log('✅ Emergency access created');
    console.log(`\n⚠️  IMPORTANT: Save this recovery code securely!`);
    console.log(`📝 Recovery Code: ${recoveryCode}`);
    console.log(`👤 Usable by: ${BACKUP_ADMIN_EMAIL}`);
    console.log(`⏰ Expires: ${emergencyAccessDoc.expiresAt.toISOString()}\n`);

    // ==========================================
    // STEP 7: Validation
    // ==========================================
    console.log('📋 Step 7: Validating migration...\n');

    // Check exactly 1 owner
    const ownerCount = await userAccess.countDocuments({ role: 'owner' });
    console.assert(ownerCount === 1, '❌ Must have exactly 1 owner');
    console.log(`✅ Owner count: ${ownerCount}`);

    // Check owner is correct email
    const owner = await userAccess.findOne({ role: 'owner' });
    console.assert(owner.email === OWNER_EMAIL, '❌ Owner must be kiwichito@gmail.com');
    console.log(`✅ Owner email: ${owner.email}`);

    // Check all granted users have roles
    const noRole = await userAccess.countDocuments({
      status: 'granted',
      role: { $exists: false }
    });
    console.assert(noRole === 0, '❌ All granted users must have roles');
    console.log(`✅ Users without roles: ${noRole}`);

    // Check all users have schemaVersion
    const noVersion = await userAccess.countDocuments({
      status: 'granted',
      schemaVersion: { $exists: false }
    });
    console.assert(noVersion === 0, '❌ All users must have schemaVersion');
    console.log(`✅ Users without schemaVersion: ${noVersion}`);

    // Summary
    const roleCounts = await userAccess.aggregate([
      { $match: { status: 'granted' } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📊 Migration Summary:');
    roleCounts.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} user(s)`);
    });

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Save the recovery code above in a secure location');
    console.log('   2. Review migrated users in database');
    console.log('   3. Test authentication with new roles');
    console.log('   4. Build admin dashboard to manage users\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run migration
migrate().catch(console.error);
