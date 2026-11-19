import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmXGxkXGGyfH4Ui6ljbwUU8yR1nu0ih9Y",
  authDomain: "almuqri.firebaseapp.com",
  projectId: "almuqri",
  storageBucket: "almuqri.firebasestorage.app",
  messagingSenderId: "296203744310",
  appId: "1:296203744310:web:609333e06ac19f0610d497"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Looking for user...");
  const q = query(collection(db, "users"), where("email", "==", "Mustaphaluqman254@gmail.com"));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("User not found in 'users' collection!");
    return;
  }

  const userDoc = snap.docs[0];
  console.log(`Found user: ${userDoc.id}, current role: ${userDoc.data().role}`);
  
  try {
    await updateDoc(doc(db, "users", userDoc.id), { role: 'admin' });
    console.log("Successfully updated 'users' collection.");
    
    // Also try updating admins collection just in case
    try {
      const { setDoc } = require('firebase/firestore');
      await setDoc(doc(db, "admins", userDoc.id), { ...userDoc.data(), role: 'admin' }, { merge: true });
      console.log("Successfully added to 'admins' collection.");
    } catch(e) {
      console.log("Could not write to admins collection (maybe rules).");
    }

  } catch(e) {
    console.error("Failed to update user:", e);
  }
  
  process.exit(0);
}

run();
