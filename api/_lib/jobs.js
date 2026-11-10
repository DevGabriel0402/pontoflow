import { FieldValue, getAdminDb } from "./firebase-admin.js";

const TIME_ZONE = "America/Sao_Paulo";

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function dateKey(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatBr(date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE }).format(date);
}

function firestoreDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function runDailyNotifications({ companyId = null, userId = null } = {}) {
  try {
    const db = getAdminDb();
    let usersDocs = [];

    if (userId) {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) usersDocs = [userSnap];
    } else if (companyId) {
      const snap = await db.collection("users")
        .where("companyId", "==", companyId)
        .where("ativo", "==", true)
        .get();
      usersDocs = snap.docs;
    } else {
      const snap = await db.collection("users")
        .where("ativo", "==", true)
        .get();
      usersDocs = snap.docs;
    }

    let created = 0;

    // Verificar os últimos 3 dias anteriores (ontem até 3 dias atrás para cobrir finais de semana)
    const daysToCheck = [];
    for (let i = 1; i <= 3; i++) {
      const pastDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      daysToCheck.push({
        date: pastDate,
        key: dateKey(pastDate),
      });
    }

    for (const userDoc of usersDocs) {
      try {
        const user = userDoc.data();
        if (!user || ["admin", "master"].includes(user.role)) continue;
        const userCompanyId = user.companyId || companyId || "";

        // Buscar pontos do usuário
        const pointsSnap = await db.collection("pontos")
          .where("userId", "==", userDoc.id)
          .get();

        for (const pastDay of daysToCheck) {
          const dayPoints = pointsSnap.docs.filter((p) => {
            const val = p.data();
            if (val.dataKey) return val.dataKey === pastDay.key;
            const createdAt = firestoreDate(val.criadoEm);
            return createdAt && dateKey(createdAt) === pastDay.key;
          });

          const completed = new Set(dayPoints.map((p) => (p.data().type || "").toUpperCase()));
          const temEntrada = completed.has("ENTRADA");
          const temSaida = completed.has("SAIDA");

          // Notificar SOMENTE se bateu entrada e NÃO bateu a saída
          if (temEntrada && !temSaida) {
            // Verifica se já notificou este dia
            const existingNotifs = await db.collection("notificacoes")
              .where("userId", "==", userDoc.id)
              .where("diaReferencia", "==", pastDay.key)
              .get();

            const jaNotificado = existingNotifs.docs.some((doc) => {
              const d = doc.data();
              return d.tipoAlerta === "SAIDA" || d.tipo === "ponto_faltante_saida";
            });

            if (!jaNotificado) {
              await db.collection("notificacoes").add({
                userId: userDoc.id,
                companyId: userCompanyId,
                mensagem: `Atenção: Você registrou a entrada mas esqueceu de registrar a saída do dia ${formatBr(pastDay.date)}. Envie uma justificativa ao administrador.`,
                data: FieldValue.serverTimestamp(),
                lida: false,
                tipo: "ponto_faltante_saida",
                tipoAlerta: "SAIDA",
                diaReferencia: pastDay.key,
              });
              created += 1;
            }
          }
        }
      } catch (errUser) {
        console.error("Erro ao verificar pendência de saída do usuário", userDoc.id, errUser);
      }
    }

    return { success: true, notificacoesCriadas: created };
  } catch (err) {
    console.error("Erro em runDailyNotifications:", err);
    return { success: false, error: err.message };
  }
}

export async function runDelayNotifications({ companyId = null, userId = null } = {}) {
  // Conforme regra de negócio: não disparar notificações de atraso no mesmo dia durante o expediente.
  // Notificações só devem aparecer no dia seguinte caso a saída não tenha sido registrada.
  return runDailyNotifications({ companyId, userId });
}
