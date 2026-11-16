const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error("Please set FIREBASE_SERVICE_ACCOUNT_PATH");
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function generateSchema() {
  const collections = ['users', 'public_teachers', 'testimonials', 'community_posts'];
  let sql = '';

  for (const collName of collections) {
    const snapshot = await db.collection(collName).get();
    const fields = new Set(['id']); // Always include id
    
    // Scan all docs to find all possible fields
    snapshot.docs.forEach(doc => {
      Object.keys(doc.data()).forEach(key => fields.add(key));
    });

    if (fields.size === 1 && snapshot.empty) {
      console.log(`-- Collection ${collName} is empty, skipping schema generation.`);
      continue;
    }

    sql += `CREATE TABLE IF NOT EXISTS public.${collName} (\n`;
    
    const fieldDefs = Array.from(fields).map(field => {
      if (field === 'id') return `  id text PRIMARY KEY`;
      return `  "${field}" jsonb`; // Use jsonb for everything to avoid type mismatch, since Firebase is schemaless
    });
    
    sql += fieldDefs.join(',\n');
    sql += `\n);\n\n`;
  }

  console.log("=========================================");
  console.log("COPY AND PASTE THIS INTO SUPABASE SQL EDITOR:");
  console.log("=========================================\n");
  console.log(sql);
  
  process.exit(0);
}

generateSchema().catch(console.error);
