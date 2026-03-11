const fs = require('fs');

const filePath = 'c:\\Users\\gabri\\Desktop\\MVP\\ponto-flow\\functions\\index.js';
const codeToAppend = `
/**
 * Função Agendada: Dispara as 03:00 AM (Horário de Brasília)
 * Verifica pontos do dia anterior e notifica usuários com pendências.
 */
exports.dispararNotificacoesAutomaticas = onSchedule({
    schedule: "0 3 * * *",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    memory: "256MiB"
}, async (event) => {
    console.log("Iniciando processamento de notificações automáticas...");

    const ontem = subDays(new Date(), 1);
    const ontemKey = format(ontem, "yyyy-MM-dd");
    const db = admin.firestore();

    try {
        // 1. Busca todas as empresas
        const companiesSnap = await db.collection("companies").get();

        for (const companyDoc of companiesSnap.docs) {
            const companyId = companyDoc.id;
            const config = companyDoc.data().config || {};
            const pontosAtivos = config.regras?.pontosAtivos || ["entrada", "saida"];

            // 2. Busca funcionários ativos desta empresa
            const usersSnap = await db.collection("users")
                .where("companyId", "==", companyId)
                .where("ativo", "==", true)
                .where("role", "==", "employee")
                .get();

            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const userName = userDoc.data().nome;

                // 3. Verifica se já existe notificação para este dia
                const notifExistente = await db.collection("notificacoes")
                    .where("userId", "==", userId)
                    .where("diaReferencia", "==", ontemKey)
                    .limit(1)
                    .get();

                if (!notifExistente.empty) continue;

                // 4. Busca pontos do dia anterior
                const pontosSnap = await db.collection("pontos")
                    .where("userId", "==", userId)
                    .where("companyId", "==", companyId)
                    .get();

                // Filtra pontos de ontem (lida com Legado sem dataKey e Novos com dataKey)
                const pontosOntem = pontosSnap.docs.filter(d => {
                    const data = d.data();
                    if (data.dataKey) return data.dataKey === ontemKey;
                    
                    const dObj = data.criadoEm?.toDate ? data.criadoEm.toDate() : (data.criadoEm ? new Date(data.criadoEm) : null);
                    return dObj && format(dObj, "yyyy-MM-dd") === ontemKey;
                });

                const tiposBatidos = new Set(pontosOntem.map(d => d.data().type));
                
                // Mapeamento de tiposConfig -> TIPOS_SISTEMA
                const mapa = {
                    'entrada': 'ENTRADA',
                    'intervalo_saida': 'INICIO_INTERVALO',
                    'intervalo_entrada': 'FIM_INTERVALO',
                    'saida': 'SAIDA'
                };

                const pendencias = [];
                pontosAtivos.forEach(tipoConfig => {
                    const tipoSistema = mapa[tipoConfig];
                    if (tipoSistema && !tiposBatidos.has(tipoSistema)) {
                        const label = tipoConfig === 'entrada' ? 'Entrada' : 
                                      tipoConfig === 'saida' ? 'Saída' : 
                                      tipoConfig === 'intervalo_saida' ? 'Início do Intervalo' : 'Fim do Intervalo';
                        pendencias.push(label);
                    }
                });

                if (pendencias.length > 0) {
                    const msg = \`Você esqueceu de bater seu \${pendencias.join(', ')} do dia \${format(ontem, "dd/MM/yyyy")}, justifique e aguarde um admnistrador confirmar sua justificativa\`;
                    
                    await db.collection("notificacoes").add({
                        userId,
                        mensagem: msg,
                        data: admin.firestore.FieldValue.serverTimestamp(),
                        lida: false,
                        tipo: "ponto_faltante_auto",
                        diaReferencia: ontemKey
                    });
                    
                    console.log(\`Notificação automática enviada para \${userName} (\${userId})\`);
                }
            }
        }

        console.log("Processamento de notificações automáticas finalizado.");
    } catch (error) {
        console.error("Erro ao processar notificações automáticas:", error);
    }
});
`;

fs.appendFileSync(filePath, codeToAppend);
console.log('Successfully appended the code.');
