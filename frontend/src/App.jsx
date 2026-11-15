
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

import {
  AuthProvider,
  useAuth
} from "./context/AuthContext";

import ProtectedLayout from "./components/ProtectedLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import SavingsGoals from "./pages/SavingsGoals";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import FinancialAdvisor from "./pages/FinancialAdvisor";

// Authentication Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Protect private routes
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace />;
}

// Redirect authenticated users away from login/register
function PublicRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated
    ? <Navigate to="/" replace />
    : <Outlet />;
}

// Application Routes
function AppRoutes() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>

          {/* Dashboard */}
          <Route
            path="/"
            element={<Dashboard />}
          />

          {/* Transactions */}
          <Route
            path="/transactions"
            element={<Transactions />}
          />

          {/* Budgets */}
          <Route
            path="/budgets"
            element={<Budgets />}
          />

          {/* Savings Goals */}
          <Route
            path="/savings-goals"
            element={<SavingsGoals />}
          />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={<Analytics />}
          />

          {/* Financial Advisor - Gemini AI */}
          <Route
            path="/advisor"
            element={<FinancialAdvisor />}
          />

          {/* User Profile */}
          <Route
            path="/profile"
            element={<Profile />}
          />

        </Route>
      </Route>

      {/* Unknown Routes */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

// Main Application
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
