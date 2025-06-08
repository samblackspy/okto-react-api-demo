import {
  GoogleLogin as GoogleLoginButton,
  CredentialResponse,
} from "@react-oauth/google";
import { useState } from "react";
import { authenticateWithOkto, AuthResponseData } from "../services/oktoApi";

type GoogleLoginProps = {
  onLoginSuccess: (authData: AuthResponseData) => void;
};

export function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  const [status, setStatus] = useState("");

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    console.log("Received Google credential response:", credentialResponse);
    const idToken = credentialResponse.credential;

    if (!idToken) {
      setStatus("Google login succeeded but did not return an ID token.");
      return;
    }
    setStatus("Got Google ID token, authenticating with Okto...");
    try {
      const finalAuthResponse = await authenticateWithOkto(idToken, "google");
      if (finalAuthResponse.status === "success") {
        setStatus("Okto Login Successful!");
        onLoginSuccess(finalAuthResponse.data);
      } else {
        const errorMessage =
          finalAuthResponse.message || "Final authentication with Okto failed.";
        setStatus(`Error: ${errorMessage}`);
        console.error("Okto Auth Error:", finalAuthResponse);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setStatus(`Error: ${errorMessage}`);
      console.error(error);
    }
  };

  const handleGoogleError = () => {
    setStatus("Google Login Failed");
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      <div className="flex justify-center w-full">
        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="filled_black"
          size="large"
          width="280px"
        />
      </div>
      {status && (
        <p
          className={`text-center text-sm ${status.startsWith("Error:") ? "text-red-400" : "text-gray-400"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
