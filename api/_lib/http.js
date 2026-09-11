export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function requireFields(data, fields) {
  const missing = fields.filter((field) => {
    const value = data?.[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length) {
    throw new ApiError(400, "invalid-argument", `Campos obrigatorios: ${missing.join(", ")}.`);
  }
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new ApiError(400, "invalid-json", "O corpo da requisicao nao e um JSON valido.");
    }
  }
  return req.body;
}

function firebaseErrorToApi(error) {
  const code = error?.code || "";

  if (code === "auth/email-already-exists") {
    return new ApiError(409, code, "Ja existe um usuario com este email.");
  }
  if (code === "auth/user-not-found") {
    return new ApiError(404, code, "Usuario nao encontrado.");
  }
  if (code === "auth/invalid-password") {
    return new ApiError(400, code, "A senha informada e invalida.");
  }
  if (code === "auth/id-token-expired" || code === "auth/argument-error") {
    return new ApiError(401, code, "Sessao expirada ou invalida.");
  }

  return null;
}

export async function handleApi(req, res, options, callback) {
  const methods = options?.methods || ["POST"];

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", methods.join(", "));
    return res.status(204).end();
  }

  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    return res.status(405).json({ error: { code: "method-not-allowed", message: "Metodo nao permitido." } });
  }

  try {
    const result = await callback();
    return res.status(200).json({ data: result ?? null });
  } catch (error) {
    const firebaseError = firebaseErrorToApi(error);
    const apiError = error instanceof ApiError ? error : firebaseError;

    if (!apiError) {
      console.error("[api] Erro nao tratado:", error);
      return res.status(500).json({
        error: {
          code: "internal",
          message: error?.message ? `Erro interno: ${error.message}` : "Erro interno. Tente novamente em instantes.",
        },
      });
    }

    return res.status(apiError.status).json({
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details ? { details: apiError.details } : {}),
      },
    });
  }
}
