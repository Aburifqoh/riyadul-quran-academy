const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// To run this script:
// 1. Download your Firebase Service Account JSON key
// 2. Set FIREBASE_SERVICE_ACCOUNT_PATH="path/to/key.json"
// 3. Set SUPABASE_URL="your_url" and SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
// 4. Run `npm install firebase-admin @supabase/supabase-js dotenv`
// 5. Run `node scripts/migrate-data.js`

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error("Please set FIREBASE_SERVICE_ACCOUNT_PATH to your service account json file.");
  process.exit(1);
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require(require('path').resolve(serviceAccountPath));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCollection(collectionName, supabaseTableName) {
  console.log(`Migrating collection ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is empty.`);
    return;
  }

  const batchSize = 100;
  let batch = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Include id
    batch.push({ id: doc.id, ...data });

    if (batch.length === batchSize) {
      const { error } = await supabase.from(supabaseTableName).upsert(batch);
      if (error) console.error(`Error inserting batch into ${supabaseTableName}:`, error);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from(supabaseTableName).upsert(batch);
    if (error) console.error(`Error inserting final batch into ${supabaseTableName}:`, error);
  }

  console.log(`Successfully migrated ${snapshot.size} records from ${collectionName}.`);
}

async function runMigration() {
  try {
    // Modify this list based on all collections you need to migrate
    const collectionsToMigrate = [
      { firestore: 'users', supabase: 'users' },
      { firestore: 'public_teachers', supabase: 'public_teachers' },
      { firestore: 'testimonials', supabase: 'testimonials' },
      { firestore: 'community_posts', supabase: 'community_posts' }
      // Add other collections here
    ];

    for (const coll of collectionsToMigrate) {
      await migrateCollection(coll.firestore, coll.supabase);
    }
    
    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
