import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", form);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to sign in"
      );
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-logo">
          <div className="logo-mark">F</div>
          FINORA
        </div>

        <button className="language-button">EN</button>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <div className="auth-intro">
            <h1>Welcome back</h1>
            <p>
              Sign in to manage your transactions and keep track
              of your finances.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit">
              Sign in
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </div>

          <div className="auth-preview">
            <div className="preview-header">
              Recent transactions
            </div>

            <div className="preview-row">
              <span>Sep 09</span>
              <span>Salary</span>
              <span className="preview-positive">+$2,400</span>
            </div>

            <div className="preview-row">
              <span>Sep 08</span>
              <span>Groceries</span>
              <span className="preview-negative">-$84.20</span>
            </div>

            <div className="preview-row">
              <span>Sep 07</span>
              <span>Transport</span>
              <span className="preview-negative">-$32.50</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;