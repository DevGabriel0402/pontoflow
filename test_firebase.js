import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBlU1cEwABHE64VNiBikssy46F464-LRE4",
    authDomain: "ponto-flow.firebaseapp.com",
    projectId: "ponto-flow",
    storageBucket: "ponto-flow.firebasestorage.app",
    messagingSenderId: "41810335122",
    appId: "1:41810335122:web:ba9ef328373f98669cdd4b",
    measurementId: "G-TMRYWPHM1L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("Fetching companies...");
    const companies = await getDocs(collection(db, "companies"));
    companies.forEach(c => {
        console.log("Company", c.id, JSON.stringify(c.data().config));
    });

    console.log("Fetching pontos...");
    const pontos = await getDocs(collection(db, "pontos"));
    let count = 0;
    pontos.forEach(p => {
        if (count < 10 && p.data().distanciaRelativa) {
            console.log("Ponto check:", p.data().distanciaRelativa, JSON.stringify(p.data().geolocation), p.data().type, p.data().userName);
            count++;
        }
    });

    console.log("Done");
    process.exit(0);
}

check().catch(e => console.error(e));
