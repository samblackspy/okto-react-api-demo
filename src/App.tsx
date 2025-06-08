import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { LoginScreen } from "./components/LoginScreen";
import TransferToken from "./components/TransferToken";
import { AuthResponseData } from "./services/oktoApi";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [sessionKey, setSessionKey] = useState<string | null>(
    localStorage.getItem("sessionKey")
  );

  const handleLogin = (authData: AuthResponseData) => {
    localStorage.setItem("token", authData.auth_token);
    localStorage.setItem("sessionKey", authData.session_priv_key);
    setToken(authData.auth_token);
    setSessionKey(authData.session_priv_key);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionKey");
    setToken(null);
    setSessionKey(null);
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
              token && sessionKey ? (
                <TransferTokenWithParams
                  token={token}
                  sessionKey={sessionKey}
                />
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

function TransferTokenWithParams({
  token,
  sessionKey,
}: {
  token: string;
  sessionKey: string;
}) {
  const navigate = useNavigate();
  const handleBack = () => navigate("/");

  return (
    <TransferToken
      token={token}
      sessionKey={sessionKey}
      onBack={handleBack}
      onSuccess={(jobId) => {
        console.log("Transaction Submitted Successfully. Job ID:", jobId);
      }}
    />
  );
}

export default App;
