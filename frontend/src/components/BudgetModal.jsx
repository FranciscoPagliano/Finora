import { useEffect, useState } from "react";
import api from "../services/api";

function BudgetModal({
  selectedMonth,
  onClose,
  onBudgetSaved,
  editingBudget = null,
  existingBudgets = [],
}) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(
    editingBudget ? String(editingBudget.categoryId) : ""
  );
  const [amount, setAmount] = useState(
    editingBudget ? String(editingBudget.amount) : ""
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(editingBudget);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get("/categories");

        const availableCategories = isEditing
          ? response.data
          : response.data.filter(
              (category) =>
                !existingBudgets.some(
                  (budget) => Number(budget.categoryId) === Number(category.id)
                )
            );

        setCategories(availableCategories);

        if (!isEditing && availableCategories.length > 0) {
          setCategoryId(String(availableCategories[0].id));
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        setError("Could not load categories.");
      }
    };

    loadCategories();
  }, [isEditing, existingBudgets]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!categoryId || !amount) {
      setError("Category and amount are required.");
      return;
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      await api.post("/budgets", {
        categoryId: Number(categoryId),
        amount: numericAmount,
        month: selectedMonth,
      });

      await onBudgetSaved();
      onClose();
    } catch (error) {
      console.error("Error saving budget:", error);

      setError(
        error.response?.data?.message ||
          "Could not save budget."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="transaction-modal">
        <div className="modal-header">
          <div>
            <h2>{isEditing ? "Edit budget" : "Set budget"}</h2>
            <p>
              {isEditing
                ? "Update the monthly spending limit."
                : "Set a monthly spending limit for a category."}
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

        <form
          className="transaction-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>Category</label>

            <select
              value={categoryId}
              disabled={isEditing}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
            >
              {categories.length === 0 && !isEditing ? (
                <option value="">
                  All categories already have a budget
                </option>
              ) : (
                categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Monthly budget</label>

            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="150000"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
            />
          </div>

          {error && (
            <p className="form-error">{error}</p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={
                isSaving ||
                (!isEditing && categories.length === 0)
              }
            >
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Save budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetModal;
