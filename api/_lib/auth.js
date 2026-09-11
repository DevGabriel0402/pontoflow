import { ApiError } from "./http.js";
import { getAdminAuth, getAdminDb } from "./firebase-admin.js";

function bearerToken(req) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim();
}

export async function requireUser(req, { checkRevoked = true } = {}) {
  const token = bearerToken(req);
  if (!token) throw new ApiError(401, "unauthenticated", "Usuario nao autenticado.");

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token, checkRevoked);
  } catch {
    throw new ApiError(401, "unauthenticated", "Sessao expirada ou invalida.");
  }

  const profileSnapshot = await getAdminDb().doc(`users/${decoded.uid}`).get();
  if (!profileSnapshot.exists) {
    throw new ApiError(403, "profile-not-found", "Perfil do usuario nao encontrado.");
  }

  const profile = profileSnapshot.data();
  if (profile.ativo === false) {
    throw new ApiError(403, "user-disabled", "Este perfil esta inativo.");
  }

  return { uid: decoded.uid, token: decoded, profile, profileSnapshot };
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.profile.role !== "admin" && user.profile.isSuperAdmin !== true) {
    throw new ApiError(403, "permission-denied", "Apenas administradores podem executar esta operacao.");
  }
  return user;
}

export async function requireSuperAdmin(req) {
  const user = await requireUser(req);
  if (user.profile.isSuperAdmin !== true && user.profile.role !== "master") {
    throw new ApiError(403, "permission-denied", "Apenas o administrador master pode executar esta operacao.");
  }
  return user;
}
