const fetch = require("node-fetch");
const cron = require("node-cron");
const { logger } = require("./src/controllers/logger.controller");
const config = require("./src/config");

// Schedule run
cron.schedule('*/1 * * * *', async () => {
  await run();
});

async function run() {
  logger.info(`[Worker] Calling internal API at ${new Date().toISOString()}`);

  try {
    const res = await fetch(`${config.baseUrl}/api/internal/runJobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-key": process.env.WORKER_KEY,
      },
    });

    const data = await res.json();
    logger.info("[Worker] Response:", data);
  } catch (err) {
    logger.error("[Worker] Job failed:", err);
  }
}

//run();
