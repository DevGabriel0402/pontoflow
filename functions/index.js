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

    // 1) Precisa estar logado
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const adminUid = request.auth.uid;

    // 2) Verifica se quem chamou é admin
    const adminDoc = await admin.firestore().doc(`users/${adminUid}`).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "Apenas admin pode cadastrar.");
    }

    const { nome, email, dataNascimento, role } = request.data || {};
    if (!nome || !email || !dataNascimento) {
        throw new HttpsError("invalid-argument", "Nome, email e data de nascimento são obrigatórios.");
    }

    const senhaTemp = gerarSenhaPadrao(nome.trim(), dataNascimento);

    try {
        // 3) Cria usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password: senhaTemp,
            displayName: nome,
        });

        // 4) Cria/atualiza doc do usuário no Firestore
        await admin.firestore().doc(`users/${userRecord.uid}`).set(
            {
                nome,
                email,
                dataNascimento,
                role: role || "employee",
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
        throw new HttpsError("internal", error.message || "Erro interno ao criar funcionário.");
    }
});

exports.deletarFuncionario = onCall({ region: "southamerica-east1" }, async (request) => {
    console.log("Iniciando deletarFuncionario...", request.data);

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Não autenticado.");
    }

    const { uid } = request.data || {};
    if (!uid) {
        throw new HttpsError("invalid-argument", "UID do usuário é obrigatório.");
    }

    // Verifica permissão (apenas admin pode deletar)
    const callerDoc = await admin.firestore().doc(`users/${request.auth.uid}`).get();
    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "Acesso negado.");
    }

    try {
        // 1) Deleta do Firebase Auth
        await admin.auth().deleteUser(uid);

        // 2) Deleta do Firestore
        await admin.firestore().doc(`users/${uid}`).delete();

        // 3) (Opcional) Poderia deletar também o histórico de pontos dele aqui
        // Mas por segurança e auditoria, muitos preferem manter ou apenas marcar como inativo. 
        // Como o pedido foi "excluir", vamos remover o usuário.

        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar funcionário:", error);
        throw new HttpsError("internal", error.message || "Erro ao excluir funcionário.");
    }
});