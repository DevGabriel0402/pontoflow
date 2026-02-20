const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

function gerarSenhaTemporaria() {
    return "PF@" + Math.random().toString(36).slice(2, 10) + "9!";
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

    const { nome, email } = request.data || {};
    if (!nome || !email) {
        throw new HttpsError("invalid-argument", "Nome e email são obrigatórios.");
    }

    const senhaTemp = gerarSenhaTemporaria();

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
                role: "employee",
                ativo: true,
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