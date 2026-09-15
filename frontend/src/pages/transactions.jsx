import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import TransactionModal from "../components/TransactionModal";
import MonthNavigator from "../components/MonthNavigator";

function Transactions() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
  return (
    localStorage.getItem("selectedMonth") ||
    new Date().toISOString().slice(0, 7)
  );
});

useEffect(() => {
  localStorage.setItem("selectedMonth", selectedMonth);
}, [selectedMonth]);

  // CARGAR TRANSACCIONES
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

  // FILTRAR TRANSACCIONES POR MES
  const monthTransactions = transactions.filter((transaction) => {
    const transactionMonth =
      transaction.transactionDate.slice(0, 7);

    return transactionMonth === selectedMonth;
  });

  // CALCULAR INGRESOS
  const totalIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  // CALCULAR GASTOS
  const totalExpenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  // BALANCE DEL MES
  const currentBalance = totalIncome - totalExpenses;

  // PORCENTAJE DE AHORRO
  const savingsRate =
    totalIncome > 0
      ? ((currentBalance / totalIncome) * 100).toFixed(1)
      : 0;

  // BUSCADOR
  const filteredTransactions = monthTransactions.filter(
    (transaction) => {
      const search = searchTerm.toLowerCase();

      return (
        transaction.description
          .toLowerCase()
          .includes(search) ||
        transaction.category
          .toLowerCase()
          .includes(search) ||
        transaction.type
          .toLowerCase()
          .includes(search)
      );
    }
  );

  // CREAR TRANSACCIÓN
  const handleCreateTransaction = async (transactionData) => {
    const response = await api.post(
      "/transactions",
      transactionData
    );

    setTransactions((currentTransactions) => [
      response.data.transaction,
      ...currentTransactions,
    ]);
  };

  // ACTUALIZAR TRANSACCIÓN
  const handleUpdateTransaction = async (
    transactionId,
    transactionData
  ) => {
    const response = await api.put(
      `/transactions/${transactionId}`,
      transactionData
    );

    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === transactionId
          ? response.data.transaction
          : transaction
      )
    );

    setEditingTransaction(null);
  };

  // BORRAR TRANSACCIÓN
  const handleDeleteTransaction = async (transactionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/transactions/${transactionId}`);

      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (transaction) =>
            transaction.id !== transactionId
        )
      );
    } catch (error) {
      console.error(
        "Error deleting transaction:",
        error
      );
    }
  };

  // CERRAR SESIÓN
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="dashboard-logo">
          <div className="logo-mark">F</div>
          FINORA
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
          >
            Overview
          </button>

          <button className="nav-item active">
            Transactions
          </button>

        <button
        className="nav-item"
        onClick={() => navigate("/categories")}
        >
        Categories
        </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email}</span>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="dashboard-main">
        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              Transactions
            </p>

            <h1>All transactions</h1>
          </div>

          <div className="dashboard-actions">
          <MonthNavigator
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          />

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

        {/* RESUMEN */}
        <section className="summary-grid">
          <div className="summary-item">
            <span>Current balance</span>

            <strong>
              $
              {currentBalance.toLocaleString(
                "es-AR"
              )}
            </strong>

            <small>ARS</small>
          </div>

          <div className="summary-item">
            <span>Income</span>

            <strong className="positive">
              $
              {totalIncome.toLocaleString(
                "es-AR"
              )}
            </strong>

            <small>This month</small>
          </div>

          <div className="summary-item">
            <span>Expenses</span>

            <strong className="negative">
              $
              {totalExpenses.toLocaleString(
                "es-AR"
              )}
            </strong>

            <small>This month</small>
          </div>

          <div className="summary-item">
            <span>Savings rate</span>

            <strong>{savingsRate}%</strong>

            <small>This month</small>
          </div>
        </section>

        {/* TRANSACCIONES */}
        <section className="transactions-section">
          <div className="table-toolbar">
            <div>
              <h2>Transactions</h2>

              <p>
                Manage your income and expenses.
              </p>
            </div>

            <input
              className="table-search"
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />
          </div>

          {/* TABLA */}
          <div className="finance-table">
            <div className="finance-row finance-head">
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Actions</span>
            </div>

            {filteredTransactions.map(
              (transaction) => {
                const isIncome =
                  transaction.type === "income";

                return (
                  <div
                    className="finance-row"
                    key={transaction.id}
                  >
                    <span>
                      {new Date(
                        transaction.transactionDate
                      ).toLocaleDateString(
                        "es-AR"
                      )}
                    </span>

                    <span className="description-cell">
                      {transaction.description}
                    </span>

                    <span>
                      {transaction.category}
                    </span>

                    <span>
                      {isIncome
                        ? "Income"
                        : "Expense"}
                    </span>

                    <span
                      className={
                        isIncome
                          ? "amount-cell positive"
                          : "amount-cell negative"
                      }
                    >
                      {isIncome ? "+" : "-"}$
                      {Number(
                        transaction.amount
                      ).toLocaleString("es-AR")}
                    </span>

                    <span className="actions-cell">
                      <button
                        className="edit-button"
                        onClick={() => {
                          setEditingTransaction(
                            transaction
                          );

                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteTransaction(
                            transaction.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </main>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <TransactionModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onTransactionCreated={
            handleCreateTransaction
          }
          onTransactionUpdated={
            handleUpdateTransaction
          }
          editingTransaction={
            editingTransaction
          }
        />
      )}
    </div>
  );
}

export default Transactions;