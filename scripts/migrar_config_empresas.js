// Script para migrar empresas existentes para o novo formato de configuração
// Execute este script no console do navegador ou via node se tiver credenciais de admin

import { db } from "./src/services/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

async function migrarConfigEmpresas() {
    console.log("Iniciando migração de configurações de empresas...");
    const snap = await getDocs(collection(db, "companies"));

    const promises = snap.docs.map(async (d) => {
        const data = d.data();
        if (!data.config || !data.config.modulos) {
            console.log(`Atualizando ${d.id}...`);
            await updateDoc(doc(db, "companies", d.id), {
                "config.modulos": {
                    face: true,
                    geo: true,
                    justificativas: true,
                    bancoHoras: true,
                    relatorios: true
                },
                "config.regras": {
                    exigirFace: true,
                    exigirGeo: true
                },
                "config.visual": {
                    corPrimaria: "#2f81f7",
                    logoUrl: ""
                }
            });
        }
    });

    await Promise.all(promises);
    console.log("Migração concluída com sucesso!");
}

// migrarConfigEmpresas();
