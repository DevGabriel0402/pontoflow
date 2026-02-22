// scripts/fix-admin-profile.mjs
// Corrige o perfil da Gizele adicionando o companyId da empresa PAO IMPERIAL
// Autentica com email/senha do superadmin para ter permissão de leitura

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

// 🔑 Credenciais do SuperAdmin para autenticar o script
const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function fixAdmin() {
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
        console.error("❌ Informe ADMIN_EMAIL e ADMIN_PASSWORD como variáveis de ambiente.");
        console.error("   Exemplo: ADMIN_EMAIL=admin@email.com ADMIN_PASSWORD=senha node scripts/fix-admin-profile.mjs");
        process.exit(1);
    }

    console.log(`🔑 Autenticando como ${SUPER_ADMIN_EMAIL}...\n`);
    await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    console.log("✅ Autenticado com sucesso!\n");

    console.log("🔍 Procurando empresa PAO IMPERIAL nas companies...\n");

    const companiesSnap = await getDocs(collection(db, "companies"));
    let companyId = null;
    let companyData = null;

    companiesSnap.forEach((d) => {
        const data = d.data();
        const nome = (data.nome || "").toLowerCase();
        if (nome.includes("pao imperial") || nome.includes("pão imperial") || nome.includes("imperial")) {
            companyId = d.id;
            companyData = data;
            console.log(`✅ Empresa encontrada!`);
            console.log(`   ID: ${d.id}`);
            console.log(`   Nome: ${data.nome}`);
            console.log(`   Status: ${data.status}\n`);
        }
    });

    if (!companyId) {
        console.log("❌ Empresa PAO IMPERIAL não encontrada. Listando todas:\n");
        companiesSnap.forEach((d) => {
            const data = d.data();
            console.log(`  - [${d.id}] ${data.nome}`);
        });
        process.exit(1);
    }

    console.log("🔍 Procurando usuário Gizele na coleção users...\n");

    const usersSnap = await getDocs(collection(db, "users"));
    let gizeleUid = null;

    usersSnap.forEach((d) => {
        const data = d.data();
        const email = (data.email || "").toLowerCase();
        const nome = (data.nome || "").toLowerCase();
        if (email.includes("gizele") || nome.includes("gizele")) {
            gizeleUid = d.id;
            console.log(`✅ Usuária Gizele encontrada!`);
            console.log(`   UID: ${d.id}`);
            console.log(`   Email: ${data.email}`);
            console.log(`   Role: ${data.role}`);
            console.log(`   CompanyId atual: ${data.companyId || "(nenhum)"}\n`);
        }
    });

    if (!gizeleUid) {
        console.log("❌ Usuária Gizele não encontrada.");
        process.exit(1);
    }

    console.log(`⚙️  Atualizando perfil da Gizele com companyId: ${companyId}...\n`);

    await updateDoc(doc(db, "users", gizeleUid), {
        companyId: companyId,
        isAdmin: true,
    });

    console.log(`✅ Perfil atualizado com sucesso!`);
    console.log(`   Gizele → empresa: ${companyData.nome} (${companyId})`);
    console.log(`\n🎉 Pronto! A Gizele pode agora fazer login normalmente.\n`);
}

fixAdmin().catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
}).finally(() => setTimeout(() => process.exit(0), 1000));
