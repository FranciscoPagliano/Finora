import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import TransactionModal from "../components/TransactionModal";
import MonthNavigator from "../components/MonthNavigator";

// CSV: escapamos comillas, comas y saltos de línea.
// El prefijo de apóstrofe impide que Excel ejecute fórmulas ingresadas como texto.
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};


// Lector CSV: respeta comillas, comas y saltos de línea dentro de celdas.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted) quoted = false;
      else if (cell === "") quoted = true;
      else throw new Error("Comillas incorrectas en el CSV.");
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = []; cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("El CSV tiene comillas sin cerrar.");
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

const isValidCSVDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function Transactions() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState("");
  const [importFilename, setImportFilename] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    localStorage.getItem("selectedMonth") || new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    localStorage.setItem("selectedMonth", selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await api.get("/transactions");
        setTransactions(response.data);
      } catch (error) {
        console.error("Error loading transactions:", error);
      }
    };
    loadTransactions();
  }, []);

  const monthTransactions = transactions.filter(
    (transaction) => String(transaction.transactionDate).slice(0, 7) === selectedMonth
  );

  const totalIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalExpenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const currentBalance = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? ((currentBalance / totalIncome) * 100).toFixed(1) : 0;

  const filteredTransactions = monthTransactions.filter((transaction) => {
    const search = searchTerm.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(search) ||
      transaction.category.toLowerCase().includes(search) ||
      transaction.type.toLowerCase().includes(search)
    );
  });

  // Por ahora solo lee y muestra la vista previa. NO guarda en MySQL.
  const handleCSVSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportPreview([]);
    setImportError("");
    setImportFilename(file.name);
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 1024 * 1024) {
      setImportError("Elegí un archivo .csv de hasta 1 MB.");
      return;
    }
    try {
      const rows = parseCSV(await file.text());
      const expected = ["Date", "Description", "Category", "Type", "Amount"];
      if (!rows.length || rows[0].length !== 5 ||
          rows[0].some((value, i) => value.trim() !== expected[i])) {
        throw new Error("El CSV debe tener estas columnas: Date, Description, Category, Type, Amount.");
      }
      if (rows.length < 2 || rows.length > 501) {
        throw new Error("El archivo debe contener entre 1 y 500 movimientos.");
      }
      const preview = rows.slice(1).map((row, index) => {
        const [date, description, category, type, amount] = row;
        const errors = [];
        if (row.length !== 5) errors.push("Cantidad de columnas incorrecta");
        if (!isValidCSVDate(date || "")) errors.push("Fecha inválida");
        if (!description?.trim() || description.length > 255) errors.push("Descripción inválida");
        if (!category?.trim() || category.length > 100) errors.push("Categoría inválida");
        if (!["income", "expense"].includes(type)) errors.push("Tipo inválido");
        if (!/^\d+(?:\.\d{1,2})?$/.test(amount || "") ||
            Number(amount) <= 0 || Number(amount) > 9999999999.99) errors.push("Monto inválido");
        return { date, description, category, type, amount, errors, rowNumber: index + 2 };
      });
      setImportPreview(preview);
    } catch (error) {
      setImportError(error.message || "No se pudo leer el CSV.");
    }
  };

  // Exporta exactamente los movimientos visibles: mes + búsqueda.
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ["Date", "Description", "Category", "Type", "Amount"];
    const rows = filteredTransactions.map((transaction) => [
      String(transaction.transactionDate).slice(0, 10),
      transaction.description,
      transaction.category,
      transaction.type,
      Number(transaction.amount).toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finora-transactions-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreateTransaction = async (transactionData) => {
    const response = await api.post("/transactions", transactionData);
    setTransactions((currentTransactions) => [
      response.data.transaction,
      ...currentTransactions,
    ]);
  };

  const handleUpdateTransaction = async (transactionId, transactionData) => {
    const response = await api.put(`/transactions/${transactionId}`, transactionData);
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === transactionId
          ? response.data.transaction
          : transaction
      )
    );
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (transactionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );
    if (!confirmed) return;
    try {
      await api.delete(`/transactions/${transactionId}`);
      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (transaction) => transaction.id !== transactionId
        )
      );
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="dashboard-logo">
          <div className="logo-mark">F</div>
          FINORA
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate("/dashboard")}>
            Overview
          </button>
          <button className="nav-item active">Transactions</button>
          <button className="nav-item" onClick={() => navigate("/categories")}>
            Categories
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-info">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Transactions</p>
            <h1>All transactions</h1>
          </div>
          <div className="dashboard-actions">
            <MonthNavigator
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
            <button
              className="secondary-button"
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
            >
              Export CSV
            </button>
            <label className="secondary-button" style={{ cursor: "pointer" }}>
              Import CSV
              <input type="file" accept=".csv,text/csv" onChange={handleCSVSelected} hidden />
            </label>
            <button
              className="primary-button"
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
            >
              + Add transaction
            </button>
          </div>
        </header>

        <section className="summary-grid">
          <div className="summary-item">
            <span>Current balance</span>
            <strong>${currentBalance.toLocaleString("es-AR")}</strong>
            <small>ARS</small>
          </div>
          <div className="summary-item">
            <span>Income</span>
            <strong className="positive">
              ${totalIncome.toLocaleString("es-AR")}
            </strong>
            <small>This month</small>
          </div>
          <div className="summary-item">
            <span>Expenses</span>
            <strong className="negative">
              ${totalExpenses.toLocaleString("es-AR")}
            </strong>
            <small>This month</small>
          </div>
          <div className="summary-item">
            <span>Savings rate</span>
            <strong>{savingsRate}%</strong>
            <small>This month</small>
          </div>
        </section>

        {(importPreview.length > 0 || importError) && (
          <section className="transactions-section" style={{ marginBottom: 20 }}>
            <div className="table-toolbar">
              <div>
                <h2>CSV preview</h2>
                <p>{importFilename} — Solo vista previa, todavía no se guarda nada.</p>
              </div>
              <button className="secondary-button" onClick={() => {
                setImportPreview([]); setImportError(""); setImportFilename("");
              }}>Close</button>
            </div>
            {importError && <p role="alert" style={{ color: "#b42318" }}>{importError}</p>}
            {importPreview.length > 0 && (
              <>
                <p>{importPreview.length} movimientos · {importPreview.filter((r) => r.errors.length).length} filas con errores</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead><tr>{["Row", "Date", "Description", "Category", "Type", "Amount", "Status"].map((h) => <th key={h} style={{ padding: 8, borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead>
                    <tbody>{importPreview.map((r) => <tr key={r.rowNumber}>
                      {[r.rowNumber, r.date, r.description, r.category, r.type, r.amount, r.errors.length ? r.errors.join("; ") : "OK"].map((v, i) =>
                        <td key={i} style={{ padding: 8, borderBottom: "1px solid #eee", color: i === 6 && r.errors.length ? "#b42318" : "inherit" }}>{v}</td>
                      )}
                    </tr>)}</tbody>
                  </table>
                </div>
                <p style={{ marginTop: 12 }}>La confirmación y detección de duplicados las agregamos en el próximo paso.</p>
              </>
            )}
          </section>
        )}
        <section className="transactions-section">
          <div className="table-toolbar">
            <div>
              <h2>Transactions</h2>
              <p>Manage your income and expenses.</p>
            </div>
            <input
              className="table-search"
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="finance-table">
            <div className="finance-row finance-head">
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Actions</span>
            </div>
            {filteredTransactions.map((transaction) => {
              const isIncome = transaction.type === "income";
              return (
                <div className="finance-row" key={transaction.id}>
                  <span>
                    {new Date(transaction.transactionDate).toLocaleDateString("es-AR")}
                  </span>
                  <span className="description-cell">{transaction.description}</span>
                  <span>{transaction.category}</span>
                  <span>{isIncome ? "Income" : "Expense"}</span>
                  <span className={isIncome ? "amount-cell positive" : "amount-cell negative"}>
                    {isIncome ? "+" : "-"}$
                    {Number(transaction.amount).toLocaleString("es-AR")}
                  </span>
                  <span className="actions-cell">
                    <button
                      className="edit-button"
                      onClick={() => {
                        setEditingTransaction(transaction);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {isModalOpen && (
        <TransactionModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onTransactionCreated={handleCreateTransaction}
          onTransactionUpdated={handleUpdateTransaction}
          editingTransaction={editingTransaction}
        />
      )}
    </div>
  );
}

export default Transactions;
