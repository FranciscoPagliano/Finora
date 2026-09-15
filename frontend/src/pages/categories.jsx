import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Categories() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError("");

    if (!newCategory.trim()) {
      return;
    }

    try {
      const response = await api.post("/categories", {
        name: newCategory,
      });

      setCategories((currentCategories) => [
        ...currentCategories,
        response.data.category,
      ]);

      setNewCategory("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to create category."
      );
    }
  };

  const handleStartEdit = (category) => {
    setEditingCategory(category.id);
    setEditingName(category.name);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingName("");
  };

  const handleUpdateCategory = async (categoryId) => {
    setError("");

    if (!editingName.trim()) {
      return;
    }

    try {
      const response = await api.put(
        `/categories/${categoryId}`,
        {
          name: editingName,
        }
      );

      setCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === categoryId
            ? response.data.category
            : category
        )
      );

      setEditingCategory(null);
      setEditingName("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to update category."
      );
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);

      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.id !== categoryId
        )
      );
    } catch (error) {
      console.error("Error deleting category:", error);
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
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
          >
            Overview
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/transactions")}
          >
            Transactions
          </button>

          <button className="nav-item active">
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
              Categories
            </p>

            <h1>Manage categories</h1>
          </div>
        </header>

        <section className="transactions-section">
          <div className="table-toolbar">
            <div>
              <h2>Your categories</h2>

              <p>
                Create and manage categories for your
                transactions.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateCategory}
            className="category-create-form"
          >
            <input
              type="text"
              placeholder="New category..."
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value)
              }
            />

            <button
              type="submit"
              className="primary-button"
            >
              + Add category
            </button>
          </form>

          {error && (
            <p className="modal-error">
              {error}
            </p>
          )}

          <div className="category-list">
            {categories.map((category) => (
              <div
                className="category-row"
                key={category.id}
              >
                {editingCategory === category.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) =>
                        setEditingName(e.target.value)
                      }
                    />

                    <div className="category-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          handleUpdateCategory(
                            category.id
                          )
                        }
                      >
                        Save
                      </button>

                      <button
                        className="delete-button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{category.name}</span>

                    <div className="category-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          handleStartEdit(category)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteCategory(
                            category.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Categories;