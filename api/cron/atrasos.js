import { requireCron } from "../_lib/cron.js";
import { handleApi } from "../_lib/http.js";
import { runDelayNotifications } from "../_lib/jobs.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["GET"] }, async () => {
    requireCron(req);
    return runDelayNotifications();
  });
}
