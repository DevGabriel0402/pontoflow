// scripts/fix-uid-mismatch.mjs
// Corrige o UID incorreto do documento Firestore da Gizele.
// O Auth criou o usuário com UID diferente do que foi salvo no Firestore.

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlU1cEwABHE64VNiBikssy46F464-LRE4",
    authDomain: "ponto-flow.firebaseapp.com",
    projectId: "ponto-flow",
    storageBucket: "ponto-flow.firebasestorage.app",
    messagingSenderId: "41810335122",
    appId: "1:41810335122:web:ba9ef328373f98669cdd4b",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// UID real do Firebase Auth (Gizele)
const CORRECT_UID = "9UC00XfyZhUjA0ClpzyDU0WsBAl2";
// UID incorreto onde o documento foi salvo
const WRONG_UID = "ne7K0wxxCdX2Vl9aDbT5aDRQINX2";

async function fixUidMismatch() {
    console.log(`🔑 Autenticando como ${ADMIN_EMAIL}...\n`);
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✅ Autenticado!\n");

    // 1. Lê o documento existente com o UID errado
    console.log(`📖 Lendo documento existente em users/${WRONG_UID}...`);
    const wrongRef = doc(db, "users", WRONG_UID);
    const wrongSnap = await getDoc(wrongRef);

    if (!wrongSnap.exists()) {
        console.error(`❌ Documento não encontrado em users/${WRONG_UID}`);
        return;
    }

    const perfilData = wrongSnap.data();
    console.log("✅ Dados encontrados:", perfilData);
    console.log();

    // 2. Cria o documento com o UID correto
    console.log(`✏️  Criando documento em users/${CORRECT_UID}...`);
    const correctRef = doc(db, "users", CORRECT_UID);
    await setDoc(correctRef, {
        ...perfilData,
        // Garante que companyId está definido
        companyId: perfilData.companyId || "pao-imperial-professor-morais",
        isAdmin: true,
        role: "admin",
    });
    console.log(`✅ Documento criado no UID correto!\n`);

    // 3. Remove o documento com UID errado
    console.log(`🗑️  Removendo documento incorreto em users/${WRONG_UID}...`);
    await deleteDoc(wrongRef);
    console.log(`✅ Documento incorreto removido!\n`);

    // 4. Verifica o resultado
    const verify = await getDoc(correctRef);
    console.log(`🔍 Verificação - users/${CORRECT_UID} exists: ${verify.exists()}`);
    console.log("   Dados:", verify.data());
    console.log("\n🎉 PRONTO! A Gizele pode agora fazer login corretamente.\n");
}

fixUidMismatch().catch((e) => {
    console.error("❌ Erro:", e.code, e.message);
}).finally(() => setTimeout(() => process.exit(0), 1000));
