import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

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

const teachersToSeed = [
  {
    name: "Ustadh Luqman Abu Rifqoh",
    title: "Senior Instructor",
    specialties: ["Hifz", "Tajweed", "Qira'at"],
    rating: 5.0,
    students: 0,
    image: "/assets/ustadh-placeholder.jpg",
    bio: "Full details will be added later."
  }
];

async function run() {
  console.log("Seeding public_teachers...");
  const teachersRef = collection(db, "public_teachers");
  
  // Optional: clear existing teachers if you want, but for now we just add
  // Or check if they exist
  
  let added = 0;
  for (const teacher of teachersToSeed) {
    try {
      await addDoc(teachersRef, teacher);
      console.log(`Added ${teacher.name}`);
      added++;
    } catch(e) {
      console.error(`Failed to add ${teacher.name}`, e);
    }
  }
  
  console.log(`Successfully added ${added} teachers.`);
  process.exit(0);
}

run();
