import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Copy as CopyIcon,
} from "lucide-react";
import {
  getPortfolioOverview,
  getSupportedNetworks,
  estimateTokenTransfer as estimateTokenTransferApi,
  signUserOp,
  executeTransaction as executeTransactionApi,
  generatePaymasterData,
  getOrdersHistory,
  PortfolioToken,
  OktoErrorResponse,
  PortfolioResponse,
  NetworksResponse,
  Order,
} from "../services/oktoApi";

// Helper component for the copy button
const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-gray-200 rounded-md transition-colors"
    >
      {copied ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <CopyIcon className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );
};

interface TransferTokenProps {
  token: string;
  sessionKey: string;
  onSuccess?: (jobId: string) => void;
  onError?: (error: Error) => void;
  onBack: () => void;
}

interface ErrorDetails {
  message: string;
  details?: any;
}

interface TokenWithBalance extends PortfolioToken {
  caip2_id: string;
  chain_id: number;
}

const TransferToken: React.FC<TransferTokenProps> = ({
  token: authToken,
  sessionKey,
  onSuccess = () => {},
  onError = () => {},
  onBack,
}) => {
  // State for UI and data
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [transferStatus, setTransferStatus] = useState<"idle" | "success">(
    "idle"
  );

  // State for form inputs
  const [tokens, setTokens] = useState<TokenWithBalance[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenWithBalance | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  // State for transaction results
  const [jobId, setJobId] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  // State for the status checking feature
  const [orderHistory, setOrderHistory] = useState<Order | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [portfolioRes, networksRes] = await Promise.all([
          getPortfolioOverview(authToken),
          getSupportedNetworks(authToken),
        ]);
        if (portfolioRes.status === "error")
          throw new Error(portfolioRes.message);
        if (networksRes.status === "error")
          throw new Error(networksRes.message);

        const portfolio = (portfolioRes as PortfolioResponse).data;
        const networks = (networksRes as NetworksResponse).data.network;
        const networkMap = new Map(networks.map((n) => [n.network_id, n]));

        const transformedTokens = portfolio.group_tokens
          .flatMap((group) => group.tokens)
          .map((token) => {
            const network = networkMap.get(token.network_id);
            if (!network) return null;
            return {
              ...token,
              id: `${token.network_id}-${token.token_address || "native"}`,
              caip2_id: network.caip_id,
              chain_id: parseInt(network.chain_id, 10),
            };
          })
          .filter(
            (token): token is TokenWithBalance =>
              token !== null && parseFloat(token.balance) > 0
          );

        setTokens(transformedTokens);
        if (transformedTokens.length > 0)
          setSelectedToken(transformedTokens[0]);
      } catch (err) {
        setError({ message: (err as Error).message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [authToken]);

  const parseAmountToWei = (value: string, decimals: number): string => {
    if (!value) return "0";
    const [whole, fraction = ""] = value.replace(/,/g, "").trim().split(".");
    return BigInt(
      whole + fraction.padEnd(decimals, "0").slice(0, decimals)
    ).toString();
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken || !amount || !recipient || !sessionKey) {
      setError({
        message:
          "Please fill all fields and ensure you are logged in correctly.",
      });
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      let tokenDecimals;
      if (
        selectedToken.is_primary &&
        selectedToken.caip2_id.startsWith("eip155")
      ) {
        tokenDecimals = 18;
      } else {
        tokenDecimals = parseInt(selectedToken.precision, 10);
      }
      if (isNaN(tokenDecimals))
        throw new Error("Could not determine token precision.");

      const amountInWei = parseAmountToWei(amount, tokenDecimals);
      const newJobId = crypto.randomUUID();
      const paymasterData = await generatePaymasterData(
        import.meta.env.VITE_OKTO_CLIENT_SWA,
        import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY,
        newJobId,
        Math.floor(Date.now() / 1000) + 3600
      );

      const estimateResponse = await estimateTokenTransferApi(
        authToken,
        newJobId,
        recipient,
        selectedToken.caip2_id,
        selectedToken.is_primary ? "" : selectedToken.token_address,
        amountInWei,
        paymasterData
      );
      if (estimateResponse.status === "error" || !estimateResponse.data) {
        const apiError = (estimateResponse as OktoErrorResponse).error;
        throw new Error(
          apiError?.details ||
            apiError?.message ||
            "Failed to estimate transaction."
        );
      }

      const unsignedUserOp = estimateResponse.data.userOps;
      const signedUserOp = await signUserOp(
        unsignedUserOp,
        sessionKey,
        selectedToken.chain_id
      );
      const executeResponse = await executeTransactionApi(
        authToken,
        signedUserOp
      );
      if (executeResponse.status === "error") {
        const apiError = (executeResponse as OktoErrorResponse).error;
        throw new Error(
          apiError?.details ||
            apiError?.message ||
            "Failed to execute transaction."
        );
      }

      const successData = executeResponse.data;
      setJobId(successData.jobId);
      setTransactionHash(successData.transactionHash || "");
      setTransferStatus("success");
      onSuccess(successData.jobId);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
      onError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = useCallback(() => {
    if (selectedToken) setAmount(selectedToken.balance);
  }, [selectedToken]);

  const handleCheckStatus = async (currentJobId: string) => {
    setIsCheckingStatus(true);
    setError(null);
    try {
      const response = await getOrdersHistory(authToken);
      if (response.status === "success") {
        const historyItem = response.data.items.find(
          (item) => item.intent_id === currentJobId
        );
        setOrderHistory(historyItem || null);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError({ message: (err as Error).message });
    } finally {
      setIsCheckingStatus(false);
      setShowStatusModal(true);
    }
  };

  const resetForm = () => {
    setTransferStatus("idle");
    setJobId("");
    setTransactionHash("");
    setOrderHistory(null);
    setShowStatusModal(false);
    setAmount("");
    setRecipient("");
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading wallet...</div>
    );
  }

  if (showStatusModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Transaction Status
          </h3>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md mb-4">
              {error.message}
            </p>
          )}

          {orderHistory ? (
            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-500">Job ID:</span>{" "}
                <span className="font-mono text-gray-700">
                  {orderHistory.intent_id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>{" "}
                <span className="font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {orderHistory.status}
                </span>
              </div>
              {orderHistory.reason && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reason:</span>{" "}
                  <span className="text-red-600">{orderHistory.reason}</span>
                </div>
              )}
              {orderHistory.transaction_hash &&
                orderHistory.transaction_hash[0] && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Tx Hash:</span>{" "}
                    <a
                      href={`https://polygonscan.com/tx/${orderHistory.transaction_hash[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-mono truncate hover:underline"
                    >
                      {orderHistory.transaction_hash[0].slice(0, 20)}...
                    </a>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-gray-600 text-center my-4">
              Could not find status details for this Job ID.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => handleCheckStatus(jobId)}
              disabled={isCheckingStatus}
              className="w-full py-2 px-4 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isCheckingStatus ? "animate-spin" : ""}`}
              />
              {isCheckingStatus ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={resetForm}
              className="w-full py-2 px-4 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              New Transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (transferStatus === "success") {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Transfer Submitted!</h3>
        <p className="text-gray-600 mb-4">
          Your transaction is being processed by the network.
        </p>

        {jobId && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-left flex justify-between items-center">
            <div>
              <span className="font-medium">Job ID:</span>
              <p className="font-mono text-xs text-gray-700 break-all">
                {jobId}
              </p>
            </div>
            <CopyButton textToCopy={jobId} />
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBack}
            className="w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => handleCheckStatus(jobId)}
            disabled={isCheckingStatus}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isCheckingStatus ? "Checking..." : "Check Status"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 p-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-semibold">Transfer Token</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md text-sm">
          <p className="font-bold">Error</p>
          <p>{error.message}</p>
        </div>
      )}

      <form onSubmit={handleTransfer} className="space-y-5">
        <div>
          <label
            htmlFor="network"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Network
          </label>
          <select
            id="network"
            value={selectedToken?.network_id || ""}
            onChange={(e) =>
              setSelectedToken(
                tokens.find((t) => t.network_id === e.target.value) || null
              )
            }
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          >
            {[...new Map(tokens.map((t) => [t.network_id, t])).values()].map(
              (t) => (
                <option key={t.network_id} value={t.network_id}>
                  {t.network_name}
                </option>
              )
            )}
          </select>

          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Token
          </label>
          <select
            id="token"
            value={selectedToken?.id || ""}
            onChange={(e) =>
              setSelectedToken(
                tokens.find((t) => t.id === e.target.value) || null
              )
            }
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={!selectedToken}
          >
            {tokens
              .filter((t) => t.network_id === selectedToken?.network_id)
              .map((token) => (
                <option key={token.id} value={token.id}>
                  {token.name} ({token.symbol})
                </option>
              ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full p-2 pr-16 border border-gray-300 rounded-md"
              disabled={!selectedToken}
            />
            <button
              type="button"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              disabled={!selectedToken}
            >
              MAX
            </button>
          </div>
          {selectedToken && (
            <p className="mt-1 text-xs text-gray-500">
              Balance: {parseFloat(selectedToken.balance).toFixed(6)}{" "}
              {selectedToken.symbol}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="recipient"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Recipient Address
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !selectedToken || !amount || !recipient}
          className="w-full py-2.5 px-4 rounded-md text-white font-semibold disabled:bg-blue-300 bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Processing..." : "Review Transfer"}
        </button>
      </form>
    </div>
  );
};

export default TransferToken;
