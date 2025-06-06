import {
  Wallet as EthersWallet,
  keccak256,
  AbiCoder,
  getBytes,
  solidityPacked,
  toBigInt,
} from "ethers";

const API_BASE_URL = "https://sandbox-api.okto.tech/api/oc/v1";

export interface AuthenticateResponse {
  status: string;
  data: {
    userSWA: string;
    nonce: string;
    clientSWA: string;
    sessionExpiry: number;
    auth_token: string;
  };
}

export interface SessionConfig {
  sessionPrivKey: string;
  sessionPubKey: string;
  userSWA: string;
}

export interface Wallet {
  caip_id: string;
  network_name: string;
  address: string;
}

export interface Network {
  caip_id: string;
  network_name: string;
  logo: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  network_name: string;
}

export interface OktoErrorResponse {
  status: string;
  message: string;
  code?: number;
  error?: any;
}

export interface SendEmailOtpResponse {
  status: string;
  data: { token?: string };
}

export interface VerifyEmailOtpResponse {
  status: string;
  data: { auth_token?: string };
}

export function isSuccessAuth(
  response: AuthenticateResponse | OktoErrorResponse | string
): response is AuthenticateResponse {
  if (typeof response === "string") return false;
  return (response as AuthenticateResponse).data?.userSWA !== undefined;
}

function nonceToBigInt(nonce: string): bigint {
  const hex = nonce.replace(/-/g, "");
  return toBigInt(`0x${hex}`);
}

async function generatePaymasterData(
  clientSwa: string,
  clientPrivateKey: string,
  nonce: string,
  validUntil: number,
  validAfter: number = 0
): Promise<string> {
  const paymasterDataHash = keccak256(
    solidityPacked(
      ["bytes32", "address", "uint48", "uint48"],
      [
        `0x${nonceToBigInt(nonce).toString(16).padStart(64, "0")}`,
        clientSwa,
        validUntil,
        validAfter,
      ]
    )
  );

  const clientSigner = new EthersWallet(clientPrivateKey);
  const signature = await clientSigner.signMessage(getBytes(paymasterDataHash));

  const paymasterData = AbiCoder.defaultAbiCoder().encode(
    ["address", "uint48", "uint48", "bytes"],
    [clientSwa, validUntil, validAfter, signature]
  );

  return paymasterData;
}

async function getAuthorizationToken(
  sessionConfig: SessionConfig
): Promise<string> {
  const data = {
    expire_at: Math.round(Date.now() / 1000) + 60 * 90,
    session_pub_key: sessionConfig.sessionPubKey,
  };

  const sessionSigner = new EthersWallet(sessionConfig.sessionPrivKey);
  const dataSignature = await sessionSigner.signMessage(JSON.stringify(data));

  const payload = {
    type: "ecdsa_uncompressed",
    data,
    data_signature: dataSignature,
  };

  return btoa(JSON.stringify(payload));
}

export async function authenticateWithOkto(
  idToken: string,
  provider: "okto" | "google",
  clientSwa?: string,
  clientPrivateKey?: string
): Promise<AuthenticateResponse | OktoErrorResponse> {
  try {
    const CLIENT_SWA = clientSwa || import.meta.env.VITE_OKTO_CLIENT_SWA;
    const CLIENT_PRIVATE_KEY =
      clientPrivateKey || import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY;

    if (!CLIENT_SWA || !CLIENT_PRIVATE_KEY) {
      throw new Error("Client SWA and Private Key are required");
    }

    const sessionWallet = EthersWallet.createRandom();
    const sessionPk = sessionWallet.signingKey.publicKey;
    const sessionAddress = sessionWallet.address;
    const nonce = crypto.randomUUID();
    const validUntil = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
    const validAfter = 0;

    const paymasterData = await generatePaymasterData(
      CLIENT_SWA,
      CLIENT_PRIVATE_KEY,
      nonce,
      validUntil,
      validAfter
    );

    const messageHash = keccak256(
      AbiCoder.defaultAbiCoder().encode(["address"], [sessionAddress])
    );
    const messageBytes = getBytes(messageHash);

    const clientSigner = new EthersWallet(CLIENT_PRIVATE_KEY);
    const sessionPkClientSignature = await clientSigner.signMessage(
      messageBytes
    );
    const sessionDataUserSignature = await sessionWallet.signMessage(
      messageBytes
    );

    const authPayload = {
      authData: {
        idToken,
        provider,
      },
      sessionData: {
        nonce,
        clientSWA: CLIENT_SWA,
        sessionPk,
        maxPriorityFeePerGas: "0xBA43B7400",
        maxFeePerGas: "0xBA43B7400",
        paymaster: "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3",  
        paymasterData,
      },
      sessionPkClientSignature,
      sessionDataUserSignature,
    };

    console.log("Auth payload:", authPayload);

     const response = await fetch(`${API_BASE_URL}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });

    const result = await response.json();
    console.log("Auth response:", result);

    if (response.status === 200 && result.data) {
       const sessionConfig: SessionConfig = {
        sessionPrivKey: sessionWallet.privateKey,
        sessionPubKey: sessionPk,
        userSWA: result.data.userSWA,
      };

      console.log("Session config:", sessionConfig);

       const authToken = await getAuthorizationToken(sessionConfig);
      console.log("Generated auth token:", authToken);

      return {
        status: "success",
        data: {
          ...result.data,
          auth_token: authToken,
          userSWA: result.data.userSWA,
          nonce: result.data.nonce,
          clientSWA: result.data.clientSWA,
          sessionExpiry: result.data.sessionExpiry,
        },
      };
    } else {
      return {
        status: "error",
        message: result.error?.message || "Authentication failed",
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error("Authentication error:", error);
    return {
      status: "error",
      message: error.message || "An error occurred during authentication",
      error,
    };
  }
}

export async function sendEmailOtp(
  email: string,
  client_signature: string,
  timestamp: number
): Promise<SendEmailOtpResponse | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/authenticate/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        email,
        client_swa: import.meta.env.VITE_OKTO_CLIENT_SWA,
        timestamp,
      },
      client_signature,
      type: "ethsign",
    }),
  });
  return response.json() as Promise<SendEmailOtpResponse | OktoErrorResponse>;
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
  token: string,
  client_signature: string,
  timestamp: number
): Promise<VerifyEmailOtpResponse | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/authenticate/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        email,
        token,
        otp,
        client_swa: import.meta.env.VITE_OKTO_CLIENT_SWA,
        timestamp,
      },
      client_signature,
      type: "ethsign",
    }),
  });
  return response.json() as Promise<VerifyEmailOtpResponse | OktoErrorResponse>;
}

export async function getWallets(
  token: string
): Promise<Wallet[] | OktoErrorResponse> {
  const r = await (
    await fetch(`${API_BASE_URL}/wallets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  return r.status === "success" ? r.data : r;
}

export async function getSupportedNetworks(
  token: string
): Promise<Network[] | OktoErrorResponse> {
  const r = await (
    await fetch(`${API_BASE_URL}/supported/networks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  return r.status === "success" ? r.data.network : r;
}

export async function getSupportedTokens(
  token: string
): Promise<Token[] | OktoErrorResponse> {
  const r = await (
    await fetch(`${API_BASE_URL}/supported/tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  return r.status === "success" ? r.data.tokens : r;
}

export async function getPortfolio(
  token: string
): Promise<any | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/aggregated-portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function getPortfolioActivity(
  token: string
): Promise<any | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/portfolio/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function getPortfolioNFT(
  token: string
): Promise<any | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/portfolio/nft`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function getOrdersHistory(
  token: string
): Promise<any | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

export async function verifySession(
  token: string
): Promise<any | OktoErrorResponse> {
  const response = await fetch(`${API_BASE_URL}/verify-session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}
