import { useState, useEffect } from "react";
import {
  estimateTokenTransfer,
  estimateRawTransaction,
  executeTransaction,
  generateJobId,
  Token,
  Network,
  Wallet,
  EstimateResponse,
  getSupportedNetworks,
  getSupportedTokens,
  getWallets,
} from "../services/oktoApi";
import { Loader2, Send, FileText, CheckCircle, XCircle } from "lucide-react";

interface TransferTokenProps {
  token: string;
  onSuccess?: (result: unknown) => void;
  onError?: (error: unknown) => void;
  onBack: () => void;
  defaultTab?: TransferType;
}

type TransferType = "TOKEN_TRANSFER" | "RAW_TRANSACTION";

export function TransferToken({
  token,
  onSuccess,
  onError,
  onBack,
  defaultTab = "TOKEN_TRANSFER",
}: TransferTokenProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const [networksData, tokensData, walletsData] = await Promise.all([
          getSupportedNetworks(token),
          getSupportedTokens(token),
          getWallets(token),
        ]);

        if ("error" in networksData) {
          throw new Error(
            networksData.error?.message || "Failed to load networks"
          );
        }
        if ("error" in tokensData) {
          throw new Error(tokensData.error?.message || "Failed to load tokens");
        }
        if (Array.isArray(walletsData) && walletsData.length === 0) {
          throw new Error("No wallets found");
        }

        setNetworks(Array.isArray(networksData) ? networksData : []);
        setTokens(Array.isArray(tokensData) ? tokensData : []);
        setWallets(Array.isArray(walletsData) ? walletsData : []);

        if (Array.isArray(networksData) && networksData.length > 0) {
          setSelectedNetwork(networksData[0].caip_id);
          setRawTxNetwork(networksData[0].caip_id);
        }
        if (Array.isArray(walletsData) && walletsData.length > 0) {
          setFromAddress(walletsData[0].address);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setDataError(
          error instanceof Error ? error.message : "Failed to load data"
        );
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [token]);
  const [transferType, setTransferType] = useState<TransferType>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  } | null>(null);

  const [selectedToken, setSelectedToken] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const [rawTxNetwork, setRawTxNetwork] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("");

  const resetStatus = () => {
    setTimeout(() => setStatus(null), 5000);
  };

  const handleTokenTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const jobId = generateJobId();

      const response = await estimateTokenTransfer(
        token,
        jobId,
        recipientAddress,
        selectedNetwork,
        selectedToken,
        amount,
        "0x77359400",
        "0x77359400",
        "0x"
      );

      if ("error" in response) {
        throw new Error(
          response.error?.message || "Failed to estimate token transfer"
        );
      }

      const estimateResponse = response as EstimateResponse;

      if (!estimateResponse.data?.userOps) {
        throw new Error("Invalid response from token transfer estimate");
      }

      const result = await executeTransaction(
        token,
        estimateResponse.data.userOps
      );

      if (result.status === "success") {
        setStatus({
          type: "success",
          message: "Token transfer initiated successfully!",
        });
        onSuccess?.(result);
      } else {
        throw new Error("Failed to execute token transfer");
      }
    } catch (error) {
      console.error("Token transfer error:", error);
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to transfer tokens",
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
      resetStatus();
    }
  };

  const handleRawTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const jobId = generateJobId();

      const transaction = {
        data: data || "0x",
        from: fromAddress,
        to: toAddress,
        value: value || "0x0",
      };

      const response = await estimateRawTransaction(
        token,
        jobId,
        rawTxNetwork,
        [transaction],
        "0x77359400",
        "0x77359400",
        "0x"
      );

      if ("error" in response) {
        throw new Error(
          response.error?.message || "Failed to estimate raw transaction"
        );
      }

      const estimateResponse = response as EstimateResponse;

      if (!estimateResponse.data?.userOps) {
        throw new Error("Invalid response from raw transaction estimate");
      }

      const result = await executeTransaction(
        token,
        estimateResponse.data.userOps
      );

      if (result.status === "success") {
        setStatus({
          type: "success",
          message: "Raw transaction executed successfully!",
        });
        onSuccess?.(result);
      } else {
        throw new Error("Failed to execute raw transaction");
      }
    } catch (error) {
      console.error("Raw transaction error:", error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to execute raw transaction",
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
      resetStatus();
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10"
            title="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-white">
            {transferType === "TOKEN_TRANSFER"
              ? "Transfer Tokens"
              : "Send Raw Transaction"}
          </h2>
        </div>

        <div className="flex space-x-2 bg-white/5 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTransferType("TOKEN_TRANSFER")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              transferType === "TOKEN_TRANSFER"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            Token Transfer
          </button>
          <button
            type="button"
            onClick={() => setTransferType("RAW_TRANSACTION")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              transferType === "RAW_TRANSACTION"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            Raw Transaction
          </button>
        </div>
      </div>

      {(status || dataError) && (
        <div
          className={`mb-4 p-3 rounded-md ${
            status?.type === "success"
              ? "bg-green-900/30 border border-green-800 text-green-200"
              : "bg-red-900/30 border border-red-800 text-red-200"
          }`}
        >
          <div className="flex items-center">
            {status?.type === "success" ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span>{status?.message || dataError}</span>
          </div>
        </div>
      )}

      {isLoadingData && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <span className="ml-2 text-gray-300">Loading data...</span>
        </div>
      )}

      {!isLoadingData && transferType === "TOKEN_TRANSFER" ? (
        <form onSubmit={handleTokenTransfer} className="space-y-4">
          <div>
            <label
              htmlFor="network"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Network
            </label>
            <select
              id="network"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Network</option>
              {networks.map((network) => (
                <option key={network.caip_id} value={network.caip_id}>
                  {network.network_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Token
            </label>
            <select
              id="token"
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Token</option>
              {tokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recipient"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Recipient Address
            </label>
            <input
              type="text"
              id="recipient"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Amount
            </label>
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Transfer Tokens
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRawTransaction} className="space-y-4">
          <div>
            <label
              htmlFor="rawTxNetwork"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Network
            </label>
            <select
              id="rawTxNetwork"
              value={rawTxNetwork}
              onChange={(e) => setRawTxNetwork(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Network</option>
              {networks.map((network) => (
                <option key={network.caip_id} value={network.caip_id}>
                  {network.network_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="fromAddress"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              From Address
            </label>
            <select
              id="fromAddress"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} (
                  {wallet.network_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="toAddress"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              To Address
            </label>
            <input
              type="text"
              id="toAddress"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="value"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Value (in wei)
            </label>
            <input
              type="text"
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="data"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Data (hex)
            </label>
            <textarea
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="0x..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Send Transaction
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
