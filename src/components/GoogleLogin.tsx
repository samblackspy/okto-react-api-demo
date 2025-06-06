import { GoogleLogin as GoogleLoginButton, CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { authenticateWithOkto, isSuccessAuth } from '../services/oktoApi';

type GoogleLoginProps = {
  onLoginSuccess: (token: string) => void;
};

export function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        console.log("Received Google credential response:", credentialResponse);

        const idToken = credentialResponse.credential;
        
        if (!idToken) {
            setStatus('Google login succeeded but did not return an ID token.');
            setIsLoading(false);
            return;
        }

        setStatus('Got Google ID token, now authenticating with Okto...');
        setIsLoading(true);
        
        try {
            const finalAuthResponse = await authenticateWithOkto(idToken, 'google');
            
            if (isSuccessAuth(finalAuthResponse)) {
                setStatus('Okto Login Successful!');
                onLoginSuccess(finalAuthResponse.data.auth_token);
            } else if (typeof finalAuthResponse !== 'string') {
                const errorMessage = finalAuthResponse.message || 'Final authentication with Okto failed.';
                setStatus(`Error: ${errorMessage}`);
                console.error("Okto Auth Error:", finalAuthResponse);
            } else {
                setStatus('An unknown error occurred during authentication');
                console.error("Unexpected authentication response:", finalAuthResponse);
            }
        } catch (error) {
            setStatus('An error occurred during Okto authentication.');
            console.error(error);
        }
        setIsLoading(false);
    };

    const handleGoogleError = () => {
        setStatus('Google Login Failed');
        setIsLoading(false);
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
       {status && <p className={`text-center text-sm ${status.startsWith('Error:') ? 'text-red-400' : 'text-gray-400'}`}>{status}</p>}
   </div>
);
}