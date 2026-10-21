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


const transactionKey = (transaction) =>
  JSON.stringify([
    String(transaction.transactionDate).slice(0, 10),
    transaction.description.trim(),
    transaction.category.trim(),
    transaction.type,
    Number(transaction.amount).toFixed(2),
  ]);


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
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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
     
      // Obtener los movimientos actuales de la base de datos.
      const response = await api.get("/transactions");

      const categoriesResponse = await api.get("/categories");

      const validCategories = new Set(
        categoriesResponse.data.map((category) => category.name)
      );

      const existingKeys = new Set(
        response.data.map(transactionKey)
      );

      // Detectar también repetidos dentro del mismo archivo.
      const csvKeys = new Set();
      

      
      const checkedPreview = preview.map((row) => {
        if (
      row.errors.length === 0 &&
      !validCategories.has(row.category.trim())
    ) {
      return {
     ...row,
      errors: [...row.errors, "Category not found"],
  };
      }
        const key = transactionKey({
          transactionDate: row.date,
          description: row.description || "",
          category: row.category || "",
          type: row.type,
          amount: row.amount,
        });

        const duplicate =
          row.errors.length === 0 &&
          (existingKeys.has(key) || csvKeys.has(key));

        if (row.errors.length === 0) {
          csvKeys.add(key);
        }

        return {
          ...row,
          errors: duplicate
            ? [...row.errors, "Duplicate"]
            : row.errors,
        };
      });

      setTransactions(response.data);
      setImportPreview(checkedPreview);

    } catch (error) {
      setImportError(error.message || "No se pudo leer el CSV.");
    }
  };


  
const handleConfirmImport = async () => {
  if (
    isImporting ||
    importPreview.length === 0 ||
    importPreview.some((row) => row.errors.length > 0)
  ) {
    return;
  }

  setIsImporting(true);
  setImportError("");

  try {
    const payload = importPreview.map((row) => ({
      transactionDate: row.date,
      description: row.description.trim(),
      category: row.category.trim(),
      type: row.type,
      amount: Number(row.amount),
    }));

    const response = await api.post("/transactions/import", {
      transactions: payload,
    });

    const updated = await api.get("/transactions");

    setTransactions(updated.data);
    setImportPreview([]);
    setImportFilename("");

   setImportSuccess(response.data.imported ?? payload.length);

  } catch (error) {
    setImportError(
      error.response?.data?.message ||
      "Import failed. Please try again."
    );
  } finally {
    setIsImporting(false);
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


const handleDeleteTransaction = async () => {
  if (!transactionToDelete || isDeleting) return;

  setIsDeleting(true);
  setDeleteError("");

  try {
    await api.delete(`/transactions/${transactionToDelete.id}`);

    setTransactions((currentTransactions) =>
      currentTransactions.filter(
        (transaction) => transaction.id !== transactionToDelete.id
      )
    );

    setTransactionToDelete(null);
  } catch (error) {
    setDeleteError(
      error.response?.data?.message ||
      "Could not delete the transaction. Please try again."
    );
  } finally {
    setIsDeleting(false);
  }
};


const duplicateCount = importPreview.filter((row) =>
  row.errors.includes("Duplicate")
).length;

const errorCount = importPreview.filter((row) =>
  row.errors.some((error) => error !== "Duplicate")
).length;

const newCount = importPreview.length - duplicateCount - errorCount;

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
          <button
        className="nav-item"
        onClick={() => navigate("/recurring")}
      >
        Recurring
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
               <p>{importFilename} — Review transactions before importing.</p>
              </div>
              <button className="secondary-button" onClick={() => {
                setImportPreview([]); setImportError(""); setImportFilename("");
              }}>Close</button>
            </div>
            {importError && <p role="alert" style={{ color: "#b42318" }}>{importError}</p>}
            {importPreview.length > 0 && (
              <>
                <p style={{ margin: "16px 0", fontSize: "14px", color: "#475569" }}>
              {importPreview.length} transactions ·{" "}
              <span style={{ color: "#15803d" }}>{newCount} new</span> ·{" "}
              <span style={{ color: "#b45309" }}>{duplicateCount} duplicates</span> ·{" "}
              <span style={{ color: "#dc2626" }}>{errorCount} errors</span>
                </p>
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

                
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="primary-button"
                onClick={() => setShowImportConfirm(true)}
                disabled={isImporting || newCount === 0 || errorCount > 0 || duplicateCount > 0}
                style={{
                  opacity: newCount === 0 || errorCount > 0 || duplicateCount > 0 ? 0.45 : 1,
                  cursor: newCount === 0 || errorCount > 0 || duplicateCount > 0
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {isImporting ? "Importing..." : `Confirm Import (${newCount})`}
              </button>
            </div>

            {duplicateCount > 0 && (
            <p
              style={{
                color: "#dc2626",
                marginTop: 16,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
              }}
              >
                {newCount === 0 && errorCount === 0
                  ? "All transactions in this file are duplicates. Nothing can be imported."
                  : `${duplicateCount} duplicate transactions detected. Remove duplicates before importing.`}
              </p>
            )}

            {errorCount > 0 && (
              <p style={{ color: "#dc2626", marginTop: 8, fontSize: 13 }}>
                {errorCount} transactions contain errors. Fix them before importing.
              </p>
            )}
          </div>

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
                    onClick={() => {
                      setDeleteError("");
                      setTransactionToDelete(transaction);
                    }}                    >
                      Delete
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

            
{showImportConfirm && (
  <div className="finora-modal-overlay">
    <div
      className="finora-success-modal finora-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-confirm-title"
    >
      <div className="finora-confirm-icon">
        ↑
      </div>

      <h2 id="import-confirm-title">Confirm import</h2>

      <p>
        Are you sure you want to import {importPreview.length}{" "}
        {importPreview.length === 1 ? "transaction" : "transactions"} into FINORA?
      </p>

      <div className="finora-confirm-actions">
        <button
          className="secondary-button"
          onClick={() => setShowImportConfirm(false)}
          disabled={isImporting}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          onClick={async () => {
            await handleConfirmImport();
            setShowImportConfirm(false);
          }}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Import"}
        </button>
      </div>
    </div>
  </div>
)}

       
{importSuccess !== null && (
  <div className="finora-modal-overlay">
    <div
      className="finora-success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-success-title"
    >
      <div className="finora-success-icon">
        ✓
      </div>

      <h2 id="import-success-title">Import successful!</h2>

      <p>
        {importSuccess} {importSuccess === 1 ? "transaction" : "transactions"} imported successfully.
      </p>

      <button
        className="primary-button"
        onClick={() => setImportSuccess(null)}
      >
        Continue
      </button>
    </div>
  </div>
)}

    
{transactionToDelete && (
  <div className="finora-modal-overlay">
    <div
      className="finora-success-modal finora-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
    >
      <div className="finora-delete-icon">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7" />
        </svg>
      </div>

      <h2 id="delete-title">Delete transaction?</h2>

      <p>
        Are you sure you want to delete{" "}
        <strong>{transactionToDelete.description}</strong>?
        This action cannot be undone.
      </p>

      {deleteError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {deleteError}
        </p>
      )}

      <div className="finora-confirm-actions">
        <button
          className="secondary-button"
          disabled={isDeleting}
          onClick={() => setTransactionToDelete(null)}
        >
          Cancel
        </button>

        <button
          className="finora-delete-confirm-button"
          disabled={isDeleting}
          onClick={handleDeleteTransaction}
        >
          {isDeleting ? "Deleting..." : "Delete transaction"}
        </button>
      </div>
    </div>
  </div>
)}



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
