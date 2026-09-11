import { requireCron } from "../_lib/cron.js";
import { handleApi } from "../_lib/http.js";
import { runDailyNotifications } from "../_lib/jobs.js";

export default async function handler(req, res) {
  return handleApi(req, res, { methods: ["GET"] }, async () => {
    requireCron(req);
    return runDailyNotifications();
  });
}
