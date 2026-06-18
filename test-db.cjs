const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const db = getFirestore(app, 'ai-studio-5abbb9a1-402b-4daa-9c61-84c9b0aa495f');

async function run() {
  try {
    console.log("Fetching...");
    // Replace with a realistic personalId or just try reading a non-existent one
    const ref = collection(db, 'personais', 'test-id', 'alunos');
    await getDocs(ref);
    console.log("SUCCESS! Rules allow read.");
    process.exit(0);
  } catch (err) {
    console.log("ERROR:", err.message);
    process.exit(1);
  }
}
run();
