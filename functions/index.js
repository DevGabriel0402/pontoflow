const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { format, subDays, isSameDay } = require("date-fns");
const { ptBR } = require("date-fns/locale");

admin.initializeApp();

/**
 * Gera senha no padrão: PrimeiroNome + DDMM
 * @param {string} nome 
 * @param {string} dataNasc (formato YYYY-MM-DD)
 */
function gerarSenhaPadrao(nome, dataNasc) {
    const primeiroNome = (nome || "Ponto").split(" ")[0];

    let ddmm = "0101"; // fallback
    if (dataNasc && dataNasc.includes("-")) {
        const parts = dataNasc.split("-"); // [YYYY, MM, DD]
        if (parts.length === 3) {
            ddmm = parts[2] + parts[1]; // DD + MM
        }
    }

    return primeiroNome + ddmm;
}

exports.criarFuncionario = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    console.log("Iniciando criarFuncionario v2...", request.data);

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const adminUid = request.auth.uid;

    // 1) Busca dados do admin
    const adminDoc = await admin.firestore().doc(`users/${adminUid}`).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "Apenas admin pode cadastrar.");
    }

    const adminData = adminDoc.data();
    const companyId = adminData.companyId;

    if (!companyId || companyId === "default") {
        throw new HttpsError(
            "failed-precondition",
            "Seu perfil não possui um vínculo de empresa válido. Clique em 'Sincronizar Vínculos' no painel."
        );
    }

    const { nome, email, dataNascimento, role, jornadas, jornada, cargaHorariaSemanal, funcao, matricula } = request.data || {};
    if (!nome || !email || !dataNascimento) {
        throw new HttpsError("invalid-argument", "Nome, email e data de nascimento são obrigatórios.");
    }

    const senhaTemp = gerarSenhaPadrao(nome.trim(), dataNascimento);

    // Monta objeto de jornada (legacy) se fornecido
    const jornadaData = jornada ? {
        entrada: jornada.entrada || "08:00",
        inicioIntervalo: jornada.inicioIntervalo || "12:00",
        fimIntervalo: jornada.fimIntervalo || "13:00",
        saida: jornada.saida || "17:00",
    } : null;

    if (jornadaData) {
        const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const trabManha = toMin(jornadaData.inicioIntervalo) - toMin(jornadaData.entrada);
        const trabTarde = toMin(jornadaData.saida) - toMin(jornadaData.fimIntervalo);
        jornadaData.cargaHorariaDiaria = trabManha + trabTarde;
    }

    try {
        // 2) Cria usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password: senhaTemp,
            displayName: nome,
        });

        // 3) Cria doc do usuário vincuado à empresa do admin
        const userData = {
            nome,
            email,
            dataNascimento,
            role: role || "employee",
            companyId: companyId, // Vínculo automático com a empresa do admin
            ativo: true,
            primeiroAcesso: true,
            criadoEm: admin.firestore.FieldValue.serverTimestamp(),
            criadoPor: adminUid,
        };

        if (cargaHorariaSemanal) {
            userData.cargaHorariaSemanal = cargaHorariaSemanal;
        }

        if (funcao) {
            userData.funcao = funcao;
        }

        if (matricula) {
            userData.matricula = String(matricula).trim();
        }

        if (jornadas) {
            userData.jornadas = jornadas;
        } else if (jornadaData) {
            userData.jornada = jornadaData;
        }

        await admin.firestore().doc(`users/${userRecord.uid}`).set(userData, { merge: true });

        return {
            uid: userRecord.uid,
            email: userRecord.email,
            nome,
            senhaTemporaria: senhaTemp,
        };
    } catch (error) {
        console.error("Erro ao criar funcionário:", error);
        throw new HttpsError("internal", error.message || "Erro interno.");
    }
});

exports.deletarFuncionario = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const { uid } = request.data || {};
    if (!uid) {
        throw new HttpsError("invalid-argument", "UID é obrigatório.");
    }

    const adminDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "Acesso negado.");
    }

    const adminCompanyId = adminDoc.data().companyId || "default";

    // Busca usuário a ser deletado para verificar se é da mesma empresa
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) {
        throw new HttpsError("not-found", "Usuário não encontrado.");
    }

    if (userDoc.data().companyId !== adminCompanyId) {
        throw new HttpsError("permission-denied", "Você não tem permissão para excluir usuários de outra empresa.");
    }

    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().doc(`users/${uid}`).delete();
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar:", error);
        throw new HttpsError("internal", "Erro ao excluir funcionário.");
    }
});

exports.criarAdminEmpresa = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    console.log("Iniciando criarAdminEmpresa...", request.data);

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    // 1) Verifica se o usuário é Master (Super Admin)
    const masterDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    if (!masterDoc.exists || masterDoc.data().isSuperAdmin !== true) {
        throw new HttpsError("permission-denied", "Apenas Super Admin (Master) pode criar novas empresas.");
    }

    const { companyId, nome, email, dataNascimento } = request.data || {};
    if (!companyId || !nome || !email || !dataNascimento) {
        throw new HttpsError("invalid-argument", "Dados incompletos (companyId, nome, email, dataNascimento).");
    }

    const senhaTemp = gerarSenhaPadrao(nome.trim(), dataNascimento);

    try {
        // 2) Cria usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password: senhaTemp,
            displayName: nome,
        });

        // 3) Cria doc do usuário na coleção global 'users' com o vínculo da empresa
        await admin.firestore().doc(`users/${userRecord.uid}`).set(
            {
                nome,
                email,
                dataNascimento,
                role: "admin",
                companyId: companyId,
                ativo: true,
                primeiroAcesso: true,
                criadoEm: admin.firestore.FieldValue.serverTimestamp(),
                criadoPor: request.auth.uid,
            },
            { merge: true }
        );

        return {
            uid: userRecord.uid,
            email: userRecord.email,
            nome,
            senhaTemporaria: senhaTemp,
        };
    } catch (error) {
        console.error("Erro ao criar administrador da empresa:", error);
        throw new HttpsError("internal", error.message || "Erro interno ao provisionar administrador.");
    }
});

/**
 * Corrige o companyId de funcionários e pontos que foram criados
 * com companyId incorreto ou "default".
 * Somente admin pode chamar. Atualiza todos os users criados por ele
 * (criadoPor == adminUid) e também os pontos desses users.
 */
exports.corrigirCompanyFuncionarios = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const adminUid = request.auth.uid;
    const adminDoc = await admin.firestore().doc(`users/${adminUid}`).get();

    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "Apenas admin pode executar esta correção.");
    }

    const adminData = adminDoc.data();
    const companyId = adminData.companyId;

    if (!companyId) {
        throw new HttpsError("failed-precondition", "Seu perfil de admin não possui companyId definido.");
    }

    console.log(`[corrigirCompany] Admin ${adminUid} corrigindo para companyId: ${companyId}`);

    // 1) Busca TODOS os users criados por este admin
    const usersSnap = await admin.firestore()
        .collection("users")
        .where("criadoPor", "==", adminUid)
        .get();

    let usersCorrigidos = 0;
    let pontosCorrigidos = 0;
    const batch = admin.firestore().batch();
    const userIds = [];

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.companyId !== companyId) {
            batch.update(userDoc.ref, { companyId });
            usersCorrigidos++;
            console.log(`  -> Corrigindo user ${userDoc.id} (${userData.nome}): ${userData.companyId} -> ${companyId}`);
        }
        userIds.push(userDoc.id);
    }

    // 2) Busca pontos e banco de horas dos funcionários corrigidos
    for (const uid of userIds) {
        // Pontos
        const pontosSnap = await admin.firestore()
            .collection("pontos")
            .where("userId", "==", uid)
            .get();

        for (const pontoDoc of pontosSnap.docs) {
            if (pontoDoc.data().companyId !== companyId) {
                batch.update(pontoDoc.ref, { companyId });
                pontosCorrigidos++;
            }
        }

        // Banco de Horas
        const bancoSnap = await admin.firestore()
            .collection("banco_horas")
            .where("userId", "==", uid)
            .get();

        for (const bancoDoc of bancoSnap.docs) {
            if (bancoDoc.data().companyId !== companyId) {
                batch.update(bancoDoc.ref, { companyId });
                // Não precisa de contador específico para banco_horas no retorno hoje, 
                // mas caso queira monitorar no console
                console.log(`  -> Corrigindo banco de horas ${bancoDoc.id}`);
            }
        }
    }

    // 3) Commit
    if (usersCorrigidos > 0 || pontosCorrigidos > 0 || batch._ops.length > 0) {
        await batch.commit();
    }

    console.log(`[corrigirCompany] Resultado: ${usersCorrigidos} users, ${pontosCorrigidos} pontos corrigidos.`);

    return {
        success: true,
        usersCorrigidos,
        pontosCorrigidos,
        companyId,
    };
});

/**
 * Troca a senha no primeiro acesso usando o Admin SDK.
 * Não requer reauthenticação com a senha temporária.
 * Só funciona se o documento do usuário tem primeiroAcesso === true.
 */
exports.trocarSenhaPrimeiroAcesso = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const uid = request.auth.uid;
    const { novaSenha } = request.data || {};

    if (!novaSenha || novaSenha.length < 6) {
        throw new HttpsError("invalid-argument", "A nova senha deve ter no mínimo 6 caracteres.");
    }

    // Verifica se é realmente primeiro acesso
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) {
        throw new HttpsError("not-found", "Documento do usuário não encontrado.");
    }

    if (userDoc.data().primeiroAcesso !== true) {
        throw new HttpsError("permission-denied", "Esta função só pode ser usada no primeiro acesso.");
    }

    try {
        // Troca a senha via Admin SDK (sem precisar da senha antiga)
        await admin.auth().updateUser(uid, { password: novaSenha });

        // Marca primeiro acesso como false
        await admin.firestore().doc(`users/${uid}`).update({
            primeiroAcesso: false,
            senhaAlteradaEm: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error("Erro ao trocar senha no primeiro acesso:", error);
        throw new HttpsError("internal", error.message || "Erro ao trocar senha.");
    }
});

/**
 * Login por Matrícula (Sem Senha)
 * Gera um Custom Token se a matrícula for válida para a empresa.
 */
exports.loginPorMatricula = onCall({ region: "southamerica-east1", cors: true }, async (request) => {
    const { companyId, matricula } = request.data || {};

    if (!companyId || !matricula) {
        throw new HttpsError("invalid-argument", "CompanyId e Matrícula são obrigatórios.");
    }

    try {
        // 1. Verificar se a empresa permite login por matrícula
        const companyDoc = await admin.firestore().doc(`companies/${companyId}`).get();
        if (!companyDoc.exists) {
            throw new HttpsError("not-found", "Empresa não encontrada.");
        }

        const companyData = companyDoc.data();
        if (!companyData.config?.regras?.loginPorMatricula) {
            throw new HttpsError("permission-denied", "Esta empresa não permite login por matrícula.");
        }

        // 2. Buscar o usuário pela matrícula nesta empresa
        const userSnap = await admin.firestore()
            .collection("users")
            .where("companyId", "==", companyId)
            .where("matricula", "==", String(matricula).trim())
            .limit(1)
            .get();

        if (userSnap.empty) {
            throw new HttpsError("not-found", "Funcionário não encontrado com esta matrícula nesta empresa.");
        }

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        if (userData.ativo === false) {
            throw new HttpsError("permission-denied", "Este perfil está inativo.");
        }

        // 3. Se primeiroAcesso, desmarcar (matrícula não exige troca de senha)
        if (userData.primeiroAcesso === true) {
            await admin.firestore().doc(`users/${userDoc.id}`).update({ primeiroAcesso: false });
        }

        // 4. Gerar Custom Token para o UID do usuário
        const customToken = await admin.auth().createCustomToken(userDoc.id);

        return { token: customToken, nome: userData.nome || "" };
    } catch (error) {
        console.error("Erro no loginPorMatricula:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Erro interno ao processar login.");
    }
});
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
                    const msg = `Você esqueceu de bater seu ${pendencias.join(', ')} do dia ${format(ontem, "dd/MM/yyyy")}, justifique e aguarde um admnistrador confirmar sua justificativa`;
                    
                    await db.collection("notificacoes").add({
                        userId,
                        mensagem: msg,
                        data: admin.firestore.FieldValue.serverTimestamp(),
                        lida: false,
                        tipo: "ponto_faltante_auto",
                        diaReferencia: ontemKey
                    });
                    
                    console.log(`Notificação automática enviada para ${userName} (${userId})`);
                }
            }
        }

        console.log("Processamento de notificações automáticas finalizado.");
    } catch (error) {
        console.error("Erro ao processar notificações automáticas:", error);
    }
});

/**
 * Verifica atrasos de ponto no dia atual e envia notificações em tempo real.
 * Roda a cada 15 minutos.
 */
exports.verificarAtrasosHoje = onSchedule({ 
    schedule: "every 15 minutes",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1"
}, async (event) => {
    const db = admin.firestore();
    const agora = new Date();
    const hojeKey = format(agora, "yyyy-MM-dd");
    const mapDias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const diaSemana = mapDias[agora.getDay()];
    
    const horaAtualMin = agora.getHours() * 60 + agora.getMinutes();

    try {
        const usersSnap = await db.collection("users").where("role", "==", "employee").where("ativo", "==", true).get();
        
        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const companyId = userData.companyId;
            const jornadas = userData.jornadas || userData.jornada;

            if (!jornadas) continue;

            const jDia = (jornadas.segunda || jornadas.domingo) ? jornadas[diaSemana] : jornadas;
            if (!jDia || !jDia.ativo) continue;

            // Tipos para verificar
            const verificacoes = [
                { tipo: "ENTRADA", hora: jDia.entrada, label: "entrada" },
                { tipo: "INICIO_INTERVALO", hora: jDia.inicioIntervalo, label: "início de intervalo" },
                { tipo: "FIM_INTERVALO", hora: jDia.fimIntervalo, label: "fim de intervalo" },
                { tipo: "SAIDA", hora: jDia.saida, label: "saída" }
            ];

            const pontosSnap = await db.collection("pontos")
                .where("userId", "==", userId)
                .where("dataKey", "==", hojeKey)
                .get();
            
            const tiposFeitos = new Set(pontosSnap.docs.map(d => d.data().type));

            for (const v of verificacoes) {
                if (!v.hora || tiposFeitos.has(v.tipo)) continue;

                const [h, m] = v.hora.split(":").map(Number);
                const horaEscalaMin = h * 60 + m;

                // Se passou 15 minutos do horário da escala
                if (horaAtualMin > (horaEscalaMin + 15)) {
                    // Verifica se já notificamos hoje para este tipo
                    const notifAntiga = await db.collection("notificacoes")
                        .where("userId", "==", userId)
                        .where("diaReferencia", "==", hojeKey)
                        .where("tipoAlerta", "==", v.tipo)
                        .get();

                    if (notifAntiga.empty) {
                        await db.collection("notificacoes").add({
                            userId,
                            companyId: companyId || "default",
                            mensagem: `Atenção! Você ainda não registrou sua ${v.label} hoje. Seu horário previsto era ${v.hora}.`,
                            data: admin.firestore.FieldValue.serverTimestamp(),
                            lida: false,
                            tipo: "ponto_atrasado_realtime",
                            tipoAlerta: v.tipo,
                            diaReferencia: hojeKey
                        });
                        console.log(`Alerta de atraso (${v.tipo}) enviado para ${userData.nome}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Erro em verificarAtrasosHoje:", error);
    }
});
