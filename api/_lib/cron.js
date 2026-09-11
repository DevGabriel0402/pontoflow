import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./http.js";

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new ApiError(500, "cron-config-missing", "CRON_SECRET nao configurado.");

  const authorization = req.headers.authorization || "";
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    throw new ApiError(401, "unauthenticated", "Chamada de agendamento nao autorizada.");
  }
}
