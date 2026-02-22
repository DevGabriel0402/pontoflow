const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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

exports.criarFuncionario = onCall({ region: "southamerica-east1" }, async (request) => {
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
    const companyId = adminData.companyId || "default";

    const { nome, email, dataNascimento, role } = request.data || {};
    if (!nome || !email || !dataNascimento) {
        throw new HttpsError("invalid-argument", "Nome, email e data de nascimento são obrigatórios.");
    }

    const senhaTemp = gerarSenhaPadrao(nome.trim(), dataNascimento);

    try {
        // 2) Cria usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password: senhaTemp,
            displayName: nome,
        });

        // 3) Cria doc do usuário vincuado à empresa do admin
        await admin.firestore().doc(`users/${userRecord.uid}`).set(
            {
                nome,
                email,
                dataNascimento,
                role: role || "employee",
                companyId: companyId, // Vínculo automático com a empresa do admin
                ativo: true,
                primeiroAcesso: true,
                criadoEm: admin.firestore.FieldValue.serverTimestamp(),
                criadoPor: adminUid,
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
        console.error("Erro ao criar funcionário:", error);
        throw new HttpsError("internal", error.message || "Erro interno.");
    }
});

exports.deletarFuncionario = onCall({ region: "southamerica-east1" }, async (request) => {
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

exports.criarAdminEmpresa = onCall({ region: "southamerica-east1" }, async (request) => {
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