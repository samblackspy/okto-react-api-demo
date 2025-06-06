import { useState } from "react";
import { Wallet as EthersWallet } from "ethers";
import {
  authenticateWithOkto,
  sendEmailOtp,
  verifyEmailOtp,
  OktoErrorResponse,
} from "../services/oktoApi";
import { Loader2, Mail, LogIn } from "lucide-react";

type EmailLoginProps = {
  onLoginSuccess: (token: string) => void;
};

export function EmailLogin({ onLoginSuccess }: EmailLoginProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

   const createClientSignatureForOtp = async (data: Record<string, any>) => {
    const clientSigner = new EthersWallet(
      import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY as string
    );
    const message = JSON.stringify(data);
    return await clientSigner.signMessage(message);
  };

  const handleSendOtp = async () => {
    setIsLoading(true);
    setStatus("Sending OTP...");
    const timestamp = Date.now();
    const payload = {
      email,
      client_swa: import.meta.env.VITE_OKTO_CLIENT_SWA as string,
      timestamp,
    };
    const signature = await createClientSignatureForOtp(payload);
    const res = await sendEmailOtp(email, signature, timestamp);

    if (res.status === "success" && "data" in res && res.data?.token) {
      setTempToken(res.data.token);
      setStatus("OTP Sent. Please check your email.");
    } else {
      const errorMessage =
        (res as OktoErrorResponse).message || "Failed to send OTP.";
      setStatus(`Error: ${errorMessage}`);
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!tempToken) return;
    setIsLoading(true);
    setStatus("Verifying OTP...");
    const timestamp = Date.now();
    const payload = {
      email,
      token: tempToken,
      otp,
      client_swa: import.meta.env.VITE_OKTO_CLIENT_SWA as string,
      timestamp,
    };
    const signature = await createClientSignatureForOtp(payload);
    const res = await verifyEmailOtp(
      email,
      otp,
      tempToken,
      signature,
      timestamp
    );

    if (res.status === "success" && "data" in res && res.data?.auth_token) {
      setStatus("OTP Verified! Authenticating with Okto...");
      console.log("OTP Verified! Authenticating with Okto...");
      console.log("res.data.auth_token", res.data.auth_token);
      const finalAuthToken = await authenticateWithOkto(
        res.data.auth_token,
        "okto"
      );
      console.log("finalAuthToken:", finalAuthToken);
      if (typeof finalAuthToken === "string") {
        setStatus("Login Successful!");
        onLoginSuccess(finalAuthToken);
      } else {
        setStatus(
          `Error: ${
            (finalAuthToken as OktoErrorResponse).message ||
            "Authentication failed"
          }`
        );
      }
    } else {
      const errorMessage =
        (res as OktoErrorResponse).message || "Failed to verify OTP.";
      setStatus(`Error: ${errorMessage}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-center font-semibold text-white">Login with Email</h3>
      {!tempToken ? (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-grow px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendOtp}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-all"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="flex-grow px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleVerifyOtp}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 transition-all"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
      {status && (
        <p
          className={`text-center text-sm ${
            status.startsWith("Error:") ? "text-red-400" : "text-gray-400"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
