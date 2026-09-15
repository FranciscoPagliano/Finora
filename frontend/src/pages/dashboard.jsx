import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import TransactionModal from "../components/TransactionModal";
import MonthNavigator from "../components/MonthNavigator";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";


function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
  return (
    localStorage.getItem("selectedMonth") ||
    new Date().toISOString().slice(0, 7)
  );
});

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

  // TRANSACCIONES DEL MES SELECCIONADO
  const monthTransactions = transactions.filter((transaction) => {
    const transactionMonth = transaction.transactionDate.slice(0, 7);

    return transactionMonth === selectedMonth;
  });

  // INGRESOS
  const totalIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  // GASTOS
  const totalExpenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  // BALANCE DEL MES
  const currentBalance = totalIncome - totalExpenses;

  // SAVINGS RATE
  const savingsRate =
    totalIncome > 0
      ? ((currentBalance / totalIncome) * 100).toFixed(1)
      : 0;

  // =========================
  // MES ANTERIOR
  // =========================

  const [year, month] = selectedMonth.split("-").map(Number);

  const previousMonthDate = new Date(year, month - 2, 1);

  const previousMonth = `${previousMonthDate.getFullYear()}-${String(
    previousMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const previousMonthTransactions = transactions.filter((transaction) => {
    const transactionMonth = transaction.transactionDate.slice(0, 7);

    return transactionMonth === previousMonth;
  });

  const previousIncome = previousMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const previousExpenses = previousMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const previousBalance =
    previousIncome - previousExpenses;

  const previousSavingsRate =
    previousIncome > 0
      ? (previousBalance / previousIncome) * 100
      : 0;

  const getComparison = (current, previous) => {
    if (previous === 0) {
      return {
        value: 0,
        direction: "neutral",
      };
    }

    const change =
      ((current - previous) / Math.abs(previous)) * 100;

    return {
      value: Math.abs(change).toFixed(1),
      direction:
        change > 0
          ? "up"
          : change < 0
            ? "down"
            : "neutral",
    };
  };

  const balanceComparison = getComparison(
    currentBalance,
    previousBalance
  );

  const incomeComparison = getComparison(
    totalIncome,
    previousIncome
  );

  const expensesComparison = getComparison(
    totalExpenses,
    previousExpenses
  );

  const savingsComparison = getComparison(
    Number(savingsRate),
    previousSavingsRate
  );

  // GASTOS AGRUPADOS POR CATEGORÍA
  const expensesByCategory = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((categories, transaction) => {
      const category = transaction.category;
      const amount = Number(transaction.amount);

      if (!categories[category]) {
        categories[category] = 0;
      }

      categories[category] += amount;

      return categories;
    }, {});

  const categoryExpenses = Object.entries(expensesByCategory)
    .map(([name, amount]) => ({
      name,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const chartData = categoryExpenses.map((category) => ({
  name: category.name,
  value: category.amount,
}));

const chartColors = [
  "#2563eb", // azul
  "#16a34a", // verde
  "#f59e0b", // amarillo/naranja
  "#dc2626", // rojo
  "#7c3aed", // violeta
  "#0891b2", // celeste
  "#db2777", // rosa
  "#65a30d", // lima
  "#ea580c", // naranja
  "#4f46e5", // índigo
];


  // ÚLTIMAS 5 TRANSACCIONES DEL MES
  const recentTransactions = [...monthTransactions]
    .sort(
      (a, b) =>
        new Date(b.transactionDate) -
        new Date(a.transactionDate)
    )
    .slice(0, 5);

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
          <button className="nav-item active">
            Overview
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/transactions")}
          >
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              Overview
            </p>

            <h1>Your finances</h1>

            <p className="dashboard-subtitle">
              Here's a summary of your finances.
            </p>
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

            <small
              className={`metric-change ${balanceComparison.direction}`}
            >
              {balanceComparison.direction === "up" && "↑ "}
              {balanceComparison.direction === "down" && "↓ "}
              {balanceComparison.direction === "neutral" && "— "}
              {balanceComparison.value}% from last month
            </small>
          </div>

          <div className="summary-item">
            <span>Income</span>

            <strong className="positive">
              $
              {totalIncome.toLocaleString(
                "es-AR"
              )}
            </strong>

            <small
              className={`metric-change ${incomeComparison.direction}`}
            >
              {incomeComparison.direction === "up" && "↑ "}
              {incomeComparison.direction === "down" && "↓ "}
              {incomeComparison.direction === "neutral" && "— "}
              {incomeComparison.value}% from last month
            </small>
          </div>

          <div className="summary-item">
            <span>Expenses</span>

            <strong className="negative">
              $
              {totalExpenses.toLocaleString(
                "es-AR"
              )}
            </strong>

            <small
              className={`metric-change ${
                expensesComparison.direction === "up"
                  ? "bad"
                  : expensesComparison.direction === "down"
                    ? "good"
                    : "neutral"
              }`}
            >
              {expensesComparison.direction === "up" && "↑ "}
              {expensesComparison.direction === "down" && "↓ "}
              {expensesComparison.direction === "neutral" && "— "}
              {expensesComparison.value}% from last month
            </small>
          </div>

          <div className="summary-item">
            <span>Savings rate</span>

            <strong>
              {savingsRate}%
            </strong>

            <small
              className={`metric-change ${savingsComparison.direction}`}
            >
              {savingsComparison.direction === "up" && "↑ "}
              {savingsComparison.direction === "down" && "↓ "}
              {savingsComparison.direction === "neutral" && "— "}
              {savingsComparison.value}% from last month
            </small>
          </div>
        </section>

        {/* BLOQUES PRINCIPALES */}
        <section className="overview-grid">
          {/* GASTOS POR CATEGORÍA */}
          <div className="overview-panel">
            <div className="overview-panel-header">
              <div>
                <h2>Spending by category</h2>

                <p>
                  Your expenses this month.
                </p>
              </div>
            </div>

            <div className="spending-content">
              <div className="spending-chart">
                {chartData.length === 0 ? (
                  <p className="empty-message">
                    No expenses this month.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={
                              chartColors[
                                index % chartColors.length
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <text
                      x="50%"
                      y="47%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="donut-total"
                    >
                      ${totalExpenses.toLocaleString("es-AR")}
                    </text>

                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="donut-label"
                    >
                      Expenses
                    </text>

                      <Tooltip
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("es-AR")}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="category-spending-list">
                {categoryExpenses.map((category, index) => {
                  const percentage =
                    totalExpenses > 0
                      ? (
                          (category.amount / totalExpenses) *
                          100
                        ).toFixed(1)
                      : 0;

                  return (
                    <div
                      className="category-spending-row"
                      key={category.name}
                    >
                      <div className="category-spending-info">
                        <span
                          className="category-color-dot"
                          style={{
                            backgroundColor:
                              chartColors[
                                index % chartColors.length
                              ],
                          }}
                        />

                        <div>
                          <strong>{category.name}</strong>

                          <span>
                            {percentage}% of expenses
                          </span>
                        </div>
                      </div>

                      <strong>
                        $
                        {category.amount.toLocaleString(
                          "es-AR"
                        )}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RESUMEN SIMPLE */}
          <div className="overview-panel">
            <div className="overview-panel-header">
              <div>
                <h2>Monthly summary</h2>

                <p>
                  A quick look at this month.
                </p>
              </div>
            </div>

            <div className="monthly-summary-list">
              <div className="monthly-summary-row">
                <span>Total income</span>

                <strong className="positive">
                  $
                  {totalIncome.toLocaleString(
                    "es-AR"
                  )}
                </strong>
              </div>

              <div className="monthly-summary-row">
                <span>Total expenses</span>

                <strong className="negative">
                  $
                  {totalExpenses.toLocaleString(
                    "es-AR"
                  )}
                </strong>
              </div>

              <div className="monthly-summary-row">
                <span>Net result</span>

                <strong>
                  $
                  {currentBalance.toLocaleString(
                    "es-AR"
                  )}
                </strong>
              </div>

              <div className="monthly-summary-row">
                <span>Transactions</span>

                <strong>
                  {monthTransactions.length}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ÚLTIMAS TRANSACCIONES */}
        <section className="transactions-section">
          <div className="table-toolbar">
            <div>
              <h2>Recent transactions</h2>

              <p>
                Your 5 most recent movements.
              </p>
            </div>

            <button
              className="overview-view-all"
              onClick={() =>
                navigate("/transactions")
              }
            >
              View all transactions →
            </button>
          </div>

          <div className="finance-table">
            <div className="finance-row overview-finance-row finance-head">
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span>Type</span>
              <span>Amount</span>
            </div>

            {recentTransactions.map(
              (transaction) => {
                const isIncome =
                  transaction.type === "income";

                return (
                  <div
                    className="finance-row overview-finance-row"
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
                  </div>
                );
              }
            )}
          </div>
        </section>
      </main>

      {isModalOpen && (
        <TransactionModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onTransactionCreated={
            handleCreateTransaction
          }
          editingTransaction={
            editingTransaction
          }
        />
      )}
    </div>
  );
}

export default Dashboard;