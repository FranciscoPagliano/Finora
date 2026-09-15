import { useEffect, useState } from "react";
import api from "../services/api";

function TransactionModal({
  onClose,
  onTransactionCreated,
  onTransactionUpdated,
  editingTransaction,
}) {
  const isEditing = Boolean(editingTransaction);

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    description: editingTransaction?.description || "",
    category: editingTransaction?.category || "",
    type: editingTransaction?.type || "expense",
    amount: editingTransaction?.amount || "",
    transactionDate: editingTransaction?.transactionDate
      ? editingTransaction.transactionDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get("/categories");
        setCategories(response.data);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (Number(form.amount) <= 0) {
      setError("The amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      const transactionData = {
        ...form,
        amount: Number(form.amount),
      };

      if (isEditing) {
        await onTransactionUpdated(
          editingTransaction.id,
          transactionData
        );
      } else {
        await onTransactionCreated(transactionData);
      }

      onClose();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to save transaction."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="transaction-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>
              {isEditing ? "Edit transaction" : "Add transaction"}
            </h2>

            <p>
              {isEditing
                ? "Update this movement."
                : "Record a new movement."}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description</label>

            <input
              type="text"
              name="description"
              placeholder="Supermarket"
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">
                Select category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.name}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="expense">
                  Expense
                </option>

                <option value="income">
                  Income
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Amount</label>

              <input
                type="number"
                name="amount"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Date</label>

            <input
              type="date"
              name="transactionDate"
              value={form.transactionDate}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="modal-error">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionModal;