/**
 * RBAC Rollback Script v1.0
 *
 * Reverts the RBAC migration by removing all new fields
 *
 * WARNING: This will remove:
 * - role, type, isOwner, permissions, allowedDemos, expiresAt fields
 * - schemaVersion, grantedBy, grantedAt fields
 * - auditLog collection
 * - emergencyAccess collection
 *
 * Author: Pablo Huamani
 * Date: 2026-09-28
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://192.168.12.179:27017';
const DB_NAME = 'kiwichitoDb';

async function rollback() {
  console.log('⚠️  Starting RBAC Rollback v1.0...\n');
  console.log('This will remove all RBAC fields and collections.');
  console.log('Make sure you have a backup before proceeding!\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const userAccess = db.collection('userAccess');

    // ==========================================
    // STEP 1: Remove RBAC Fields from Users
    // ==========================================
    console.log('📋 Step 1: Removing RBAC fields from userAccess...');

    const result = await userAccess.updateMany(
      {},
      {
        $unset: {
          role: '',
          type: '',
          isOwner: '',
          permissions: '',
          allowedDemos: '',
          expiresAt: '',
          grantedBy: '',
          grantedAt: '',
          revokedBy: '',
          revokedAt: '',
          schemaVersion: '',
        },
      }
    );

    console.log(`✅ Removed RBAC fields from ${result.modifiedCount} users\n`);

    // ==========================================
    // STEP 2: Drop Audit Log Collection
    // ==========================================
    console.log('📋 Step 2: Dropping auditLog collection...');

    try {
      await db.collection('auditLog').drop();
      console.log('✅ Dropped auditLog collection\n');
    } catch (error) {
      if (error.code === 26) {
        console.log('ℹ️  auditLog collection does not exist\n');
      } else {
        throw error;
      }
    }

    // ==========================================
    // STEP 3: Drop Emergency Access Collection
    // ==========================================
    console.log('📋 Step 3: Dropping emergencyAccess collection...');

    try {
      await db.collection('emergencyAccess').drop();
      console.log('✅ Dropped emergencyAccess collection\n');
    } catch (error) {
      if (error.code === 26) {
        console.log('ℹ️  emergencyAccess collection does not exist\n');
      } else {
        throw error;
      }
    }

    // ==========================================
    // STEP 4: Validation
    // ==========================================
    console.log('📋 Step 4: Validating rollback...\n');

    const usersWithRole = await userAccess.countDocuments({ role: { $exists: true } });
    console.assert(usersWithRole === 0, '❌ No users should have role field');
    console.log(`✅ Users with role field: ${usersWithRole}`);

    const usersWithPermissions = await userAccess.countDocuments({ permissions: { $exists: true } });
    console.assert(usersWithPermissions === 0, '❌ No users should have permissions field');
    console.log(`✅ Users with permissions field: ${usersWithPermissions}`);

    console.log('\n✅ Rollback completed successfully!\n');
    console.log('📝 Database reverted to pre-RBAC state.\n');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run rollback
rollback().catch(console.error);
