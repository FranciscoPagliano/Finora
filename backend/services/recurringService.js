
const db = require("../config/db");

const MAX_OCCURRENCES = 120;
const TIME_ZONE = "America/Argentina/Buenos_Aires";

// Obtiene la fecha actual en Argentina.
function getToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

// Calcula la próxima fecha respetando el día original.
function nextDate(dateString, frequency, anchorDay) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (frequency === "daily" || frequency === "weekly") {
    const date = new Date(Date.UTC(year, month - 1, day));

    date.setUTCDate(
      date.getUTCDate() + (frequency === "daily" ? 1 : 7)
    );

    return date.toISOString().slice(0, 10);
  }

  if (frequency === "monthly" || frequency === "yearly") {
    const months = frequency === "monthly" ? 1 : 12;

    const target = new Date(
      Date.UTC(year, month - 1 + months, 1)
    );

    const lastDay = new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();

    const originalDay = Number(anchorDay) || day;

    target.setUTCDate(Math.min(originalDay, lastDay));

    return target.toISOString().slice(0, 10);
  }

  throw new Error(`Frecuencia inválida: ${frequency}`);
}

// Procesa una recurrencia dentro de su propia transacción.
async function processOneRecurring(id, today) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT *
       FROM recurring_transactions
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const recurrence = rows[0];

    if (
      !recurrence ||
      recurrence.status !== "active" ||
      recurrence.next_execution_date > today
    ) {
      await connection.commit();
      return 0;
    }

    let dueDate = recurrence.next_execution_date;
    let processed = 0;
    let generated = 0;

    while (dueDate <= today) {
      if (processed >= MAX_OCCURRENCES) {
        throw new Error(
          `La recurrencia ${id} supera el límite de ${MAX_OCCURRENCES} movimientos pendientes.`
        );
      }

      const [result] = await connection.query(
        `INSERT INTO transactions
         (user_id, description, category, type, amount,
          transaction_date, recurring_id, recurring_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [
          recurrence.user_id,
          recurrence.description,
          recurrence.category,
          recurrence.type,
          recurrence.amount,
          dueDate,
          recurrence.id,
          dueDate,
        ]
      );

      if (result.affectedRows === 1) {
        generated++;
      }

      processed++;

      dueDate = nextDate(
        dueDate,
        recurrence.frequency,
        recurrence.anchor_day
      );
    }

    await connection.query(
      `UPDATE recurring_transactions
       SET next_execution_date = ?
       WHERE id = ?`,
      [dueDate, id]
    );

    await connection.commit();

    return generated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Busca y procesa las recurrencias pendientes.
async function processRecurringTransactions() {
  const today = getToday();

  const [recurrences] = await db.query(
    `SELECT id
     FROM recurring_transactions
     WHERE status = 'active'
       AND next_execution_date <= ?
     ORDER BY next_execution_date ASC, id ASC
     LIMIT 100`,
    [today]
  );

  let generated = 0;
  let failed = 0;

  for (const recurrence of recurrences) {
    try {
      generated += await processOneRecurring(
        recurrence.id,
        today
      );
    } catch (error) {
      failed++;

      console.error(
        `[FINORA] Error en recurrencia ${recurrence.id}:`,
        error
      );
    }
  }

  return {
    generated,
    failed,
    checked: recurrences.length,
  };
}

module.exports = { processRecurringTransactions };
