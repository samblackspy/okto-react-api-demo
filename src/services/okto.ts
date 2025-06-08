import {
  Wallet as EthersWallet,
  keccak256,
  AbiCoder,
  getBytes,
  solidityPacked,
  toBigInt,
  toBeHex,
  concat,
} from "ethers";

const API_BASE_URL = "https://sandbox-api.okto.tech/api/oc/v1";
const ENTRYPOINT_CONTRACT_ADDRESS =
  "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

// INTERFACES
export interface OktoErrorResponse {
  status: "error";
  message: string;
  code?: number;
  error?: { message: string; code?: number; details?: any; traceId?: string };
}
export interface Network {
  caip_id: string;
  network_name: string;
  chain_id: string;
  logo: string;
  sponsorship_enabled: boolean;
  gsn_enabled: boolean;
  type: string;
  network_id: string;
  onramp_enabled: boolean;
  whitelisted: boolean;
}
export interface Wallet {
  id: string;
  address: string;
  network_name: string;
}
export interface SupportedToken {
  id: string;
  name: string;
  symbol: string;
  decimals: string;
}
export interface Nft {
  token_id: string;
  name: string;
  image_url: string;
}
export interface Activity {
  id: string;
  type: string;
  amount: string;
  timestamp: number;
}
export interface Order {
  id: string;
  status: string;
  amount: string;
  created_at: string;
}
export interface SessionInfo {
  is_valid: boolean;
  user_id: string;
  expires_at: number;
}
export interface PortfolioToken {
  id: string;
  name: string;
  symbol: string;
  short_name: string;
  token_image: string;
  token_address: string;
  network_id: string;
  precision: string;
  network_name: string;
  is_primary: boolean;
  balance: string;
  holdings_price_usdt: string;
  holdings_price_inr: string;
}
export interface PortfolioGroupToken extends PortfolioToken {
  aggregation_type: string;
  tokens: PortfolioToken[];
}
export interface PortfolioOverview {
  aggregated_data: {
    holdings_count: string;
    holdings_price_inr: string;
    holdings_price_usdt: string;
    total_holding_price_inr: string;
    total_holding_price_usdt: string;
  };
  group_tokens: PortfolioGroupToken[];
}
export interface PortfolioResponse {
  status: "success";
  data: PortfolioOverview;
}
export interface NetworksResponse {
  status: "success";
  data: { network: Network[] };
}
export interface WalletsResponse {
  status: "success";
  data: Wallet[];
}
export interface SupportedTokensResponse {
  status: "success";
  data: { tokens: SupportedToken[] };
}
export interface NftResponse {
  status: "success";
  data: Nft[];
}
export interface ActivityResponse {
  status: "success";
  data: Activity[];
}
export interface OrdersResponse {
  status: "success";
  data: Order[];
}
export interface SessionInfoResponse {
  status: "success";
  data: SessionInfo;
}
export interface ExecuteRequest {
  sender: string;
  nonce: string;
  paymaster: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterPostOpGasLimit: string;
  paymasterVerificationGasLimit: string;
  callData: string;
  paymasterData: string;
  signature: string;
}
export interface EstimateResponseData {
  details: any;
  userOps: ExecuteRequest;
}
export interface EstimateResponse {
  status: "success" | "error";
  data?: EstimateResponseData;
  error?: { message: string; code?: number; details?: any };
}
export interface ExecuteResponse {
  status: "success";
  data: { jobId: string; transactionHash?: string; status?: string };
}
export interface AuthResponseData {
  userSWA: string;
  nonce: string;
  clientSWA: string;
  sessionExpiry: number;
  auth_token: string;
  session_priv_key: string;
}

// HELPER FUNCTIONS
function nonceToBigInt(nonce: string): bigint {
  return toBigInt(`0x${nonce.replace(/-/g, "")}`);
}

export async function generatePaymasterData(
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
  return new AbiCoder().encode(
    ["address", "uint48", "uint48", "bytes"],
    [clientSwa, validUntil, validAfter, signature]
  );
}

async function getAuthorizationToken(
  sessionPubKey: string,
  sessionPrivKey: string
): Promise<string> {
  const data = {
    expire_at: Math.round(Date.now() / 1000) + 5400,
    session_pub_key: sessionPubKey,
  };
  const sessionSigner = new EthersWallet(sessionPrivKey);
  const dataSignature = await sessionSigner.signMessage(JSON.stringify(data));
  const payload = {
    type: "ecdsa_uncompressed",
    data,
    data_signature: dataSignature,
  };
  return btoa(JSON.stringify(payload));
}

// SIGNING LOGIC
function generatePackedUserOp(userOp: Omit<ExecuteRequest, "signature">) {
  const accountGasLimits = concat([
    toBeHex(toBigInt(userOp.verificationGasLimit), 16),
    toBeHex(toBigInt(userOp.callGasLimit), 16),
  ]);
  const gasFees = concat([
    toBeHex(toBigInt(userOp.maxFeePerGas), 16),
    toBeHex(toBigInt(userOp.maxPriorityFeePerGas), 16),
  ]);
  const paymasterAndData =
    userOp.paymaster && userOp.paymaster.length > 2
      ? concat([
          userOp.paymaster,
          toBeHex(toBigInt(userOp.paymasterVerificationGasLimit), 16),
          toBeHex(toBigInt(userOp.paymasterPostOpGasLimit), 16),
          userOp.paymasterData,
        ])
      : "0x";
  return {
    sender: userOp.sender,
    nonce: toBigInt(userOp.nonce),
    initCode: "0x",
    callData: userOp.callData,
    accountGasLimits,
    preVerificationGas: toBigInt(userOp.preVerificationGas),
    gasFees,
    paymasterAndData,
  };
}

function generateUserOpHash(
  packedUserOp: ReturnType<typeof generatePackedUserOp>,
  chainId: number
): string {
  const encodedUserOp = new AbiCoder().encode(
    [
      "address",
      "uint256",
      "bytes32",
      "bytes32",
      "bytes32",
      "uint256",
      "bytes32",
      "bytes32",
    ],
    [
      packedUserOp.sender,
      packedUserOp.nonce,
      keccak256(packedUserOp.initCode),
      keccak256(packedUserOp.callData),
      keccak256(packedUserOp.accountGasLimits),
      packedUserOp.preVerificationGas,
      keccak256(packedUserOp.gasFees),
      keccak256(packedUserOp.paymasterAndData),
    ]
  );
  const encodedForHashing = new AbiCoder().encode(
    ["bytes32", "address", "uint256"],
    [keccak256(encodedUserOp), ENTRYPOINT_CONTRACT_ADDRESS, chainId]
  );
  return keccak256(encodedForHashing);
}

export async function signUserOp(
  userOp: Omit<ExecuteRequest, "signature">,
  sessionPrivateKey: string,
  chainId: number
): Promise<ExecuteRequest> {
  if (!sessionPrivateKey.startsWith("0x"))
    sessionPrivateKey = `0x${sessionPrivateKey}`;
  const packedUserOp = generatePackedUserOp(userOp);
  const userOpHash = generateUserOpHash(packedUserOp, chainId);
  const sessionSigner = new EthersWallet(sessionPrivateKey);
  const signature = await sessionSigner.signMessage(getBytes(userOpHash));
  return { ...userOp, signature };
}

// API FUNCTIONS
export async function authenticateWithOkto(
  idToken: string,
  provider: "okto" | "google"
): Promise<{ status: "success"; data: AuthResponseData } | OktoErrorResponse> {
  try {
    const CLIENT_SWA = import.meta.env.VITE_OKTO_CLIENT_SWA;
    const CLIENT_PRIVATE_KEY = import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY;
    if (!CLIENT_SWA || !CLIENT_PRIVATE_KEY)
      throw new Error("Client SWA/Private Key missing");

    const sessionWallet = EthersWallet.createRandom();
    const nonce = crypto.randomUUID();
    const validUntil = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
    const paymasterData = await generatePaymasterData(
      CLIENT_SWA,
      CLIENT_PRIVATE_KEY,
      nonce,
      validUntil
    );
    const messageHash = keccak256(
      new AbiCoder().encode(["address"], [sessionWallet.address])
    );
    const messageBytes = getBytes(messageHash);
    const clientSigner = new EthersWallet(CLIENT_PRIVATE_KEY);
    const sessionPkClientSignature =
      await clientSigner.signMessage(messageBytes);
    const sessionDataUserSignature =
      await sessionWallet.signMessage(messageBytes);
    const authPayload = {
      authData: { idToken, provider },
      sessionData: {
        nonce,
        clientSWA: CLIENT_SWA,
        sessionPk: sessionWallet.signingKey.publicKey,
        maxPriorityFeePerGas: "0xBA43B7400",
        maxFeePerGas: "0xBA43B7400",
        paymaster: "0x74324fA6Fa67b833dfdea4C1b3A9898574d076e3",
        paymasterData,
      },
      sessionPkClientSignature,
      sessionDataUserSignature,
    };
    const response = await fetch(`${API_BASE_URL}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });
    const result = await response.json();
    if (!response.ok || result.status !== "success")
      throw new Error(result.error?.message || "Authentication failed");

    const authToken = await getAuthorizationToken(
      sessionWallet.signingKey.publicKey,
      sessionWallet.privateKey
    );
    return {
      status: "success",
      data: {
        ...result.data,
        auth_token: authToken,
        session_priv_key: sessionWallet.privateKey,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unknown error during authentication";
    return { status: "error", message, error: { message } };
  }
}

export async function getWallets(
  token: string
): Promise<WalletsResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/wallets`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getSupportedNetworks(
  token: string
): Promise<NetworksResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/supported/networks`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getSupportedTokens(
  token: string
): Promise<SupportedTokensResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/supported/tokens`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function verifySession(
  token: string
): Promise<SessionInfoResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/verify-session`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getPortfolioOverview(
  token: string
): Promise<PortfolioResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/aggregated-portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getPortfolioActivity(
  token: string
): Promise<ActivityResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/portfolio/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getPortfolioNFTs(
  token: string
): Promise<NftResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/portfolio/nft`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function getOrdersHistory(
  token: string
): Promise<OrdersResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());
}
export async function estimateTokenTransfer(
  token: string,
  jobId: string,
  recipientWalletAddress: string,
  caip2Id: string,
  tokenAddress: string,
  amount: string,
  paymasterData: string
): Promise<EstimateResponse | OktoErrorResponse> {
  const payload = {
    type: "TOKEN_TRANSFER",
    jobId,
    gasDetails: {
      maxFeePerGas: "0x3b9aca00",
      maxPriorityFeePerGas: "0x3b9aca00",
    },
    paymasterData,
    details: { recipientWalletAddress, caip2Id, tokenAddress, amount },
  };
  return fetch(`${API_BASE_URL}/estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}
export async function executeTransaction(
  token: string,
  request: ExecuteRequest
): Promise<ExecuteResponse | OktoErrorResponse> {
  return fetch(`${API_BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  }).then((res) => res.json());
}
