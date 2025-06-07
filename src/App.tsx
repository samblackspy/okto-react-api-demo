import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { LoginScreen } from "./components/LoginScreen";
import { TransferToken } from "./components/TransferToken";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const handleLogin = (authToken: string) => {
    localStorage.setItem("token", authToken);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Routes>
          <Route
            path="/"
            element={
              token ? (
                <Dashboard token={token} handleLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              token ? (
                <Navigate to="/" replace />
              ) : (
                <LoginScreen onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/transfertoken"
            element={
              token ? (
                <TransferTokenWithParams token={token} />
              ) : (
                <Navigate
                  to="/login"
                  replace
                  state={{ from: "/transfertoken" }}
                />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

// Wrapper component to handle URL params
function TransferTokenWithParams({ token }: { token: string }) {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return (
    <TransferToken
      token={token}
      defaultTab={type === "raw" ? "RAW_TRANSACTION" : "TOKEN_TRANSFER"}
      onBack={handleBack}
    />
  );
}

export default App;
