
const cron = require("node-cron");
const {
  processRecurringTransactions,
} = require("./recurringService");

async function runRecurringProcess() {
  try {
    const result = await processRecurringTransactions();

    console.log(
      `[FINORA] Recurrencias procesadas. Movimientos generados: ${result.generated}`
    );
  } catch (error) {
    console.error("[FINORA] Error procesando recurrencias:", error);
  }
}

function startRecurringScheduler() {
  // Procesar movimientos pendientes al iniciar el backend
  runRecurringProcess();

  // Revisar todos los días a las 00:00 de Argentina
  cron.schedule("0 0 * * *", runRecurringProcess, {
    timezone: "America/Argentina/Buenos_Aires",
    noOverlap: true,
  });

  console.log("[FINORA] Programador de recurrencias iniciado.");
}

module.exports = { startRecurringScheduler };
