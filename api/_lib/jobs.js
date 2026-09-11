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

export async function runDailyNotifications() {
  const db = getAdminDb();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayKey = dateKey(yesterday);
  const companies = await db.collection("companies").get();
  let created = 0;

  for (const companyDoc of companies.docs) {
    const companyId = companyDoc.id;
    const activeTypes = companyDoc.data().config?.regras?.pontosAtivos || ["entrada", "saida"];
    const users = await db.collection("users")
      .where("companyId", "==", companyId)
      .where("ativo", "==", true)
      .get();

    for (const userDoc of users.docs) {
      if (["admin", "master"].includes(userDoc.data().role)) continue;
      const existing = await db.collection("notificacoes")
        .where("userId", "==", userDoc.id)
        .where("diaReferencia", "==", yesterdayKey)
        .limit(1)
        .get();
      if (!existing.empty) continue;

      const points = await db.collection("pontos")
        .where("userId", "==", userDoc.id)
        .where("companyId", "==", companyId)
        .get();
      const yesterdayPoints = points.docs.filter((point) => {
        const value = point.data();
        if (value.dataKey) return value.dataKey === yesterdayKey;
        const createdAt = firestoreDate(value.criadoEm);
        return createdAt && dateKey(createdAt) === yesterdayKey;
      });
      const completed = new Set(yesterdayPoints.map((point) => point.data().type));
      const typeMap = {
        entrada: ["ENTRADA", "Entrada"],
        saida: ["SAIDA", "Saida"],
      };
      const missing = activeTypes
        .map((type) => typeMap[type])
        .filter((type) => type && !completed.has(type[0]))
        .map((type) => type[1]);

      if (missing.length) {
        await db.collection("notificacoes").add({
          userId: userDoc.id,
          companyId,
          mensagem: `Voce esqueceu de registrar ${missing.join(", ")} em ${formatBr(yesterday)}. Envie uma justificativa ao administrador.`,
          data: FieldValue.serverTimestamp(),
          lida: false,
          tipo: "ponto_faltante_auto",
          diaReferencia: yesterdayKey,
        });
        created += 1;
      }
    }
  }

  return { success: true, diaReferencia: yesterdayKey, notificacoesCriadas: created };
}

export async function runDelayNotifications({ companyId = null, userId = null } = {}) {
  try {
    const db = getAdminDb();
    const now = new Date();
    const parts = zonedParts(now);
    const todayKey = dateKey(now);
    const weekdays = { Sun: "domingo", Mon: "segunda", Tue: "terca", Wed: "quarta", Thu: "quinta", Fri: "sexta", Sat: "sabado" };
    const weekday = weekdays[parts.weekday] || "segunda";
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);

    let usersDocs = [];
    if (userId) {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) usersDocs = [userSnap];
    } else {
      let usersQuery = db.collection("users").where("ativo", "==", true);
      if (companyId) usersQuery = usersQuery.where("companyId", "==", companyId);
      const snap = await usersQuery.get();
      usersDocs = snap.docs;
    }

    let created = 0;

    for (const userDoc of usersDocs) {
      try {
        const user = userDoc.data();
        if (!user || ["admin", "master"].includes(user.role)) continue;
        if (companyId && user.companyId !== companyId) continue;
        const schedules = user.jornadas || user.jornada;
        if (!schedules) continue;
        const schedule = schedules.segunda || schedules.domingo ? schedules[weekday] : schedules;
        if (!schedule || schedule.ativo === false) continue;

        const points = await db.collection("pontos")
          .where("userId", "==", userDoc.id)
          .where("dataKey", "==", todayKey)
          .get();
        const completed = new Set(points.docs.map((point) => point.data().type));
        const checks = [
          ["ENTRADA", schedule.entrada, "entrada"],
          ["SAIDA", schedule.saida, "saida"],
        ];

        // Buscar notificações existentes deste usuário no dia de hoje em memória (evita necessidade de índice composto)
        const existingNotifs = await db.collection("notificacoes")
          .where("userId", "==", userDoc.id)
          .where("diaReferencia", "==", todayKey)
          .get();
        const tiposExistentes = new Set(existingNotifs.docs.map(doc => doc.data().tipoAlerta));

        for (const [type, time, label] of checks) {
          if (!time || typeof time !== "string" || !time.includes(":") || completed.has(type)) continue;
          if (tiposExistentes.has(type)) continue;

          const [hours, minutes] = time.split(":").map(Number);
          if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;
          if (currentMinutes <= hours * 60 + minutes + 15) continue;

          await db.collection("notificacoes").add({
            userId: userDoc.id,
            companyId: user.companyId || "",
            mensagem: `Atenção: sua ${label} prevista para ${time} ainda não foi registrada.`,
            data: FieldValue.serverTimestamp(),
            lida: false,
            tipo: "ponto_atrasado_realtime",
            tipoAlerta: type,
            diaReferencia: todayKey,
          });
          created += 1;
        }
      } catch (errUser) {
        console.error("Erro ao verificar atraso do usuário", userDoc.id, errUser);
      }
    }

    return { success: true, diaReferencia: todayKey, notificacoesCriadas: created };
  } catch (err) {
    console.error("Erro em runDelayNotifications:", err);
    return { success: false, error: err.message };
  }
}
