import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const emptyRecurring = {
  description: "",
  category: "",
  type: "expense",
  amount: "",
  frequency: "monthly",
  next_execution_date: "",
};

const frequencyLabels = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function Recurring() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [recurrences, setRecurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newRecurring, setNewRecurring] = useState({ ...emptyRecurring });

  useEffect(() => {
    async function loadRecurring() {
      try {
        const response = await api.get("/recurring");
        setRecurrences(response.data);
      } catch (err) {
        console.error(err);
        setError("Could not load recurring transactions.");
      } finally {
        setLoading(false);
      }
    }

    loadRecurring();
  }, []);

  const toggleStatus = async (item) => {
    if (updatingId !== null) return;

    const newStatus = item.status === "active" ? "paused" : "active";
    setUpdatingId(item.id);
    setError("");

    try {
      await api.patch(`/recurring/${item.id}/status`, { status: newStatus });
      setRecurrences((current) =>
        current.map((recurrence) =>
          recurrence.id === item.id
            ? { ...recurrence, status: newStatus }
            : recurrence
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update recurring transaction."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateRecurring = async (e) => {
    e.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setCreateError("");

    try {
      await api.post("/recurring", {
        ...newRecurring,
        description: newRecurring.description.trim(),
        category: newRecurring.category.trim(),
        amount: Number(newRecurring.amount),
      });

      const response = await api.get("/recurring");
      setRecurrences(response.data);
      setIsCreateModalOpen(false);
      setNewRecurring({ ...emptyRecurring });
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          "Could not create recurring transaction."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const updateField = (field, value) => {
    setNewRecurring((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateModalOpen(false);
    setCreateError("");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatDate = (date) => {
    if (!date) return "—";
    const [year, month, day] = String(date).slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
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
          <button className="nav-item" onClick={() => navigate("/transactions")}>
            Transactions
          </button>
          <button className="nav-item" onClick={() => navigate("/categories")}>
            Categories
          </button>
          <button className="nav-item active">Recurring</button>
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
            <p className="dashboard-eyebrow">Recurring</p>
            <h1>Recurring transactions</h1>
            <p className="dashboard-subtitle">
              Manage your scheduled income and expenses.
            </p>
          </div>
          <div className="dashboard-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setCreateError("");
                setIsCreateModalOpen(true);
              }}
            >
              + Add recurring
            </button>
          </div>
        </header>

        <section className="transactions-section">
          <div className="table-toolbar">
            <div>
              <h2>Scheduled transactions</h2>
              <p>Your recurring payments and income.</p>
            </div>
          </div>

          {error && (
            <p role="alert" style={{ padding: 24, color: "#dc2626" }}>
              {error}
            </p>
          )}

          {loading ? (
            <p className="empty-message" style={{ padding: 24 }}>
              Loading recurring transactions...
            </p>
          ) : recurrences.length === 0 ? (
            <p className="empty-message" style={{ padding: 24 }}>
              No recurring transactions yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    {[
                      "Description",
                      "Category",
                      "Frequency",
                      "Next date",
                      "Amount",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "15px 18px",
                          borderBottom: "1px solid #e5eaf1",
                          color: "#475569",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recurrences.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: "16px 18px", fontWeight: 600 }}>
                        {item.description}
                      </td>
                      <td style={{ padding: "16px 18px" }}>{item.category}</td>
                      <td style={{ padding: "16px 18px" }}>
                        {frequencyLabels[item.frequency] || item.frequency}
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        {formatDate(item.next_execution_date)}
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          fontWeight: 600,
                          color: item.type === "income" ? "#15803d" : "#dc2626",
                        }}
                      >
                        {item.type === "income" ? "+" : "-"}${Number(
                          item.amount
                        ).toLocaleString("es-AR")}
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        {item.status === "active" ? "Active" : "Paused"}
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ marginLeft: 12 }}
                          disabled={updatingId !== null}
                          onClick={() => toggleStatus(item)}
                        >
                          {updatingId === item.id
                            ? "Saving..."
                            : item.status === "active"
                              ? "Pause"
                              : "Resume"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isCreateModalOpen && (
          <div className="modal-overlay">
            <div className="transaction-modal">
              <button
                type="button"
                className="modal-close"
                onClick={closeCreateModal}
                disabled={isCreating}
                aria-label="Close"
              >
                ×
              </button>

              <h2>New recurring transaction</h2>
              <p style={{ marginTop: 12, color: "#64748b" }}>
                Configure a scheduled income or expense.
              </p>

              <form
                className="auth-form"
                style={{ marginTop: 24 }}
                onSubmit={handleCreateRecurring}
              >
                <div className="form-group">
                  <label htmlFor="recurring-description">Description</label>
                  <input
                    id="recurring-description"
                    type="text"
                    placeholder="e.g. Gym membership"
                    value={newRecurring.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="recurring-type">Type</label>
                    <select
                      id="recurring-type"
                      value={newRecurring.type}
                      onChange={(e) => updateField("type", e.target.value)}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="recurring-amount">Amount</label>
                    <input
                      id="recurring-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={newRecurring.amount}
                      onChange={(e) => updateField("amount", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="recurring-category">Category</label>
                  <input
                    id="recurring-category"
                    type="text"
                    placeholder="e.g. Food"
                    value={newRecurring.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="recurring-frequency">Frequency</label>
                    <select
                      id="recurring-frequency"
                      value={newRecurring.frequency}
                      onChange={(e) => updateField("frequency", e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="recurring-date">First execution</label>
                    <input
                      id="recurring-date"
                      type="date"
                      value={newRecurring.next_execution_date}
                      onChange={(e) =>
                        updateField("next_execution_date", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                {createError && (
                  <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>
                    {createError}
                  </p>
                )}

                <div className="modal-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating..." : "Create recurring"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Recurring;
