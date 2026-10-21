
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Transactions from "./pages/transactions";
import Categories from "./pages/categories";
import Recurring from "./pages/recurring";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/transactions"
          element={<Transactions />}
        />

        <Route
          path="/categories"
          element={<Categories />}
        />

        <Route
          path="/recurring"
          element={<Recurring />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
