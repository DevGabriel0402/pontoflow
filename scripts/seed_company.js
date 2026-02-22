import { db } from "./src/services/firebase.js";
import { doc, setDoc, updateDoc } from "firebase/firestore";

async function seedEmpresa() {
    const companyId = "ponto-flow-escola";

    console.log("Criando empresa inicial...");

    const companyRef = doc(db, "companies", companyId);
    await setDoc(companyRef, {
        nome: "Minha Empresa PontoFlow",
        cnpj: "00.000.000/0001-00",
        status: "ativo",
        criadoEm: new Date(),
        config: {
            nomePainel: "PontoFlow",
            raioM: 500,
            lat: -19.9440459,
            lng: -43.9147834
        }
    });

    console.log("Empresa criada com ID:", companyId);
    console.log("ATENÇÃO: Você precisa vincular seus usuários a este companyId manualmente no console ou via script.");
}

seedEmpresa().catch(console.error);
