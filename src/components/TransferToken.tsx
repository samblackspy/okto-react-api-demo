import { useState, useEffect, useMemo } from "react";
import {
  estimateTokenTransfer,
  Token,
  getSupportedTokens,
  generateJobId,
  executeTransaction,
  EstimateResponse,
  ExecuteResponse,
} from "../services/oktoApi";
import { Loader2, Send, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface PortfolioToken {
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

interface PortfolioGroup {
  id: string;
  tokens: PortfolioToken[];
  [key: string]: any;
}

const API_BASE_URL = "https://sandbox-api.okto.tech/api/oc/v1";

type TransferStatus = 'idle' | 'estimating' | 'sending' | 'success' | 'error';

interface UserToken extends Token {
  balance: string;
  network_name: string;
  network_id: string;
  decimals: number;
}

interface TransferTokenProps {
  token: string;
  onSuccess?: (result: unknown) => void;
  onError?: (error: unknown) => void;
  onBack: () => void;
}

const formatBalance = (balance: string, decimals: number = 18): string => {
  try {
    const num = parseFloat(balance) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
};

export function TransferToken({ token, onSuccess, onError, onBack }: TransferTokenProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('idle');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<UserToken | null>(null);

  // Filtered tokens that the user actually has a balance for
  const availableTokens = useMemo(() => {
    return userTokens.filter(t => parseFloat(t.balance) > 0);
  }, [userTokens]);

  // Fetch all necessary data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [tokensData, portfolioData] = await Promise.all([
          getSupportedTokens(token),
          fetch(`${API_BASE_URL}/portfolio/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json()),
        ]);

        // Process tokens from portfolio to get user's tokens with balances
        const tokensWithBalance: UserToken[] = [];

        if (portfolioData?.group_tokens) {
          (portfolioData.group_tokens as PortfolioGroup[]).forEach((group: PortfolioGroup) => {
            group.tokens.forEach((token: PortfolioToken) => {
              if (parseFloat(token.balance) > 0) {
                const tokenInfo = Array.isArray(tokensData) && 
                  (tokensData as Token[]).find(t => 
                    t.address?.toLowerCase() === token.token_address?.toLowerCase()
                  );

                if (tokenInfo) {
                  tokensWithBalance.push({
                    ...tokenInfo,
                    balance: token.balance,
                    network_name: token.network_name,
                    network_id: token.network_id,
                    decimals: parseInt(token.precision) || 18,
                  });
                }
              }
            });
          });
        }

        setUserTokens(tokensWithBalance);

        // Set the first available token as selected if any
        if (tokensWithBalance.length > 0) {
          setSelectedToken(tokensWithBalance[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, onError]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedToken || !amount || !recipientAddress) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setTransferStatus('estimating');
      setError(null);

      // Generate a job ID for this transaction
      const jobId = generateJobId();

      // Estimate the transaction
      const estimate = await estimateTokenTransfer(
        token,
        jobId,
        recipientAddress,
        selectedToken.network_id,
        selectedToken.address,
        amount,
        '0', // maxFeePerGas - will be set by the API
        '0', // maxPriorityFeePerGas - will be set by the API
        '' // paymasterData - can be empty for now
      );

      if ('error' in estimate) {
        const errorMessage = typeof estimate.error === 'string' 
          ? estimate.error 
          : estimate.error?.message || 'Failed to estimate transaction';
        throw new Error(errorMessage);
      }

      setTransferStatus('sending');

      // Execute the transaction
      const result = await executeTransaction(
        token,
        (estimate as EstimateResponse).data.userOps
      );

      if ('error' in result) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Transaction failed';
        throw new Error(errorMessage);
      }

      setTransactionHash((result as ExecuteResponse).data.transactionHash || '');
      setTransferStatus('success');
      onSuccess?.(result);

    } catch (err) {
      console.error('Transfer error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setTransferStatus('error');
      onError?.(err);
    }
  };

  const handleMaxClick = () => {
    if (selectedToken) {
      // Convert balance from wei/smallest unit to token units
      const balance = parseFloat(selectedToken.balance) / Math.pow(10, selectedToken.decimals || 18);
      setAmount(balance.toString());
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading tokens...</span>
      </div>
    );
  }

  if (availableTokens.length === 0) {
    return (
      <div className="p-4">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-blue-500 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No tokens available for transfer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-blue-500 hover:text-blue-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h2 className="text-xl font-bold mb-4">Transfer Token</h2>
      
      {transferStatus === 'success' ? (
        <div className="text-center p-8 bg-green-50 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-800 mb-2">Transfer Successful!</h3>
          {transactionHash && (
            <p className="text-sm text-gray-600 break-all">
              Transaction: {transactionHash}
            </p>
          )}
          <button
            onClick={() => {
              setTransferStatus('idle');
              setAmount('');
              setRecipientAddress('');
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            New Transfer
          </button>
        </div>
      ) : transferStatus === 'error' ? (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 mr-2" />
            <span>{error || 'Transaction failed'}</span>
          </div>
          <button
            onClick={() => setTransferStatus('idle')}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Token
            </label>
            <select
              value={selectedToken?.address || ''}
              onChange={(e) => {
                const token = userTokens.find(t => t.address === e.target.value);
                if (token) setSelectedToken(token);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={transferStatus !== 'idle'}
            >
              {availableTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} ({formatBalance(token.balance, token.decimals)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              {selectedToken && (
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Max: {formatBalance(selectedToken.balance, selectedToken.decimals)}
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={!selectedToken || transferStatus !== 'idle'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
              disabled={transferStatus !== 'idle'}
            />
          </div>
          
          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedToken || !amount || !recipientAddress || transferStatus === 'sending'}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !selectedToken || !amount || !recipientAddress || transferStatus === 'sending'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {transferStatus === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Transfer
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
