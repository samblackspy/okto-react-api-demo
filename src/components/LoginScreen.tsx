import { Wallet, Shield, TrendingUp, Zap } from "lucide-react";
import { GoogleLogin } from "./GoogleLogin";
import { AuthResponseData } from "../services/oktoApi";

type LoginScreenProps = {
  onLogin: (authData: AuthResponseData) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const handleLoginSuccess = (authData: AuthResponseData) => {
    if (authData && authData.auth_token) {
      onLogin(authData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Okto API Dashboard
          </h1>
          <p className="text-gray-400">
            Your gateway to Web3 portfolio management
          </p>
        </div>

         <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Secure</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Analytics</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
            <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Fast</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
            <Wallet className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Multi-Chain</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-6">
          <div className="login-container space-y-4">
            <GoogleLogin onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Powered by Okto API • Secure Web3 Integration
        </p>
      </div>
    </div>
  );
}
