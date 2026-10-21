
-- FINORA: estructura para movimientos recurrentes
-- Ejecutar sobre la base de datos expense_tracker.
-- Requiere las tablas users y transactions.
-- Para una instalación que todavía no tenga estas modificaciones.

CREATE TABLE recurring_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    next_execution_date DATE NOT NULL,
    status ENUM('active', 'paused') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anchor_day TINYINT UNSIGNED NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_recurring_due (status, next_execution_date)
);

ALTER TABLE transactions
    ADD COLUMN recurring_id INT NULL,
    ADD COLUMN recurring_date DATE NULL,
    ADD CONSTRAINT fk_transaction_recurring
        FOREIGN KEY (recurring_id)
        REFERENCES recurring_transactions(id)
        ON DELETE SET NULL,
    ADD UNIQUE KEY uq_recurring_execution
        (recurring_id, recurring_date);
