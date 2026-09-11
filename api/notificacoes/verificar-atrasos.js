import { requireUser } from "../_lib/auth.js";
import { handleApi } from "../_lib/http.js";
import { runDelayNotifications } from "../_lib/jobs.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["POST"] }, async () => {
    const caller = await requireUser(req);
    const isAdmin = ["admin", "master"].includes(caller.profile.role);
    return runDelayNotifications(isAdmin
      ? { companyId: caller.profile.companyId }
      : { companyId: caller.profile.companyId, userId: caller.uid });
  });
}
