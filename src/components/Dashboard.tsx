import { useState, useEffect } from "react";
import {
  getWallets,
  getSupportedNetworks,
  getSupportedTokens,
  getPortfolioOverview,
  getPortfolioActivity,
  getPortfolioNFTs,
  getOrdersHistory,
  verifySession,
} from "../services/oktoApi";
import { StatsCard } from "./StatsCard";
import { ApiButton } from "./ApiButton";
import { ResultModal, type ApiResult } from "./ResultModal";
import {
  LogOut,
  Wallet as WalletIcon,
  Network as NetworkIcon,
  Coins,
  Eye,
  EyeOff,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Image,
  History,
  Lock,
  Zap,
  Shield,
  Send,
  FileText,
} from "lucide-react";

type DashboardProps = {
  token: string;
  handleLogout: () => void;
};

export function Dashboard({ token, handleLogout }: DashboardProps) {
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const [portfolioValue, setPortfolioValue] = useState<string>("$0.00");
  const [walletCount, setWalletCount] = useState<string>("0");
  const [nftCount, setNftCount] = useState<string>("0");
  const [activityCount, setActivityCount] = useState<string>("0");

  useEffect(() => {
    const fetchStats = async () => {
      const results = await Promise.allSettled([
        getPortfolioOverview(token),
        getWallets(token),
        getPortfolioNFTs(token),
        getPortfolioActivity(token),
      ]);

      const [portfolioRes, walletsRes, nftsRes, activityRes] = results;

      if (
        portfolioRes.status === "fulfilled" &&
        portfolioRes.value.status === "success"
      ) {
        const usdtValue =
          portfolioRes.value.data.aggregated_data.total_holding_price_usdt ||
          "0";
        setPortfolioValue(`$${parseFloat(usdtValue).toFixed(2)}`);
      } else {
        console.error(
          "Failed to fetch portfolio:",
          portfolioRes.status === "rejected"
            ? portfolioRes.reason
            : portfolioRes.value
        );
      }

      if (
        walletsRes.status === "fulfilled" &&
        walletsRes.value.status === "success"
      ) {
        setWalletCount(walletsRes.value.data.length.toString());
      } else {
        console.error(
          "Failed to fetch wallets:",
          walletsRes.status === "rejected"
            ? walletsRes.reason
            : walletsRes.value
        );
      }

      if (
        nftsRes.status === "fulfilled" &&
        nftsRes.value.status === "success"
      ) {
        setNftCount(nftsRes.value.data.length.toString());
      } else {
        console.error(
          "Failed to fetch NFTs:",
          nftsRes.status === "rejected" ? nftsRes.reason : nftsRes.value
        );
        setNftCount("0");
      }

      if (
        activityRes.status === "fulfilled" &&
        activityRes.value.status === "success"
      ) {
        setActivityCount(activityRes.value.data.length.toString());
      } else {
        console.error(
          "Failed to fetch activity:",
          activityRes.status === "rejected"
            ? activityRes.reason
            : activityRes.value
        );
      }
    };

    fetchStats();
  }, [token]);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">
                Okto API Dashboard
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-400" /> Session
            Information
          </h2>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-300">Auth Token:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={copyToken}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="font-mono text-sm text-gray-300 bg-black/20 rounded-lg p-3 break-all">
              {showToken ? token : "•".repeat(Math.min(token.length, 60))}
            </div>
            <div className="mt-4 flex justify-center">
              <ApiButton
                title="Verify Session on Server"
                icon={<Activity className="w-4 h-4" />}
                apiFn={() => verifySession(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Portfolio (USD)"
            value={portfolioValue}
            icon={<TrendingUp className="w-6 h-6 text-green-400" />}
            change={""}
            positive={false}
          />
          <StatsCard
            title="Active Wallets"
            value={walletCount}
            icon={<WalletIcon className="w-6 h-6 text-blue-400" />}
            change={""}
            positive={false}
          />
          <StatsCard
            title="NFTs Held"
            value={nftCount}
            icon={<Image className="w-6 h-6 text-purple-400" />}
            change={""}
            positive={false}
          />
          <StatsCard
            title="Total Activities"
            value={activityCount}
            icon={<Activity className="w-6 h-6 text-orange-400" />}
            change={""}
            positive={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <NetworkIcon className="w-5 h-5 mr-2 text-green-400" /> Wallet &
              Network
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ApiButton
                title="Get Wallets"
                icon={<WalletIcon className="w-4 h-4" />}
                apiFn={() => getWallets(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
              <ApiButton
                title="Supported Networks"
                icon={<NetworkIcon className="w-4 h-4" />}
                apiFn={() => getSupportedNetworks(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
              <ApiButton
                title="Supported Tokens"
                icon={<Coins className="w-4 h-4" />}
                apiFn={() => getSupportedTokens(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" /> Portfolio
              Analytics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ApiButton
                title="Portfolio Overview"
                icon={<TrendingUp className="w-4 h-4" />}
                apiFn={() => getPortfolioOverview(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
              <ApiButton
                title="Activity Feed"
                icon={<Activity className="w-4 h-4" />}
                apiFn={() => getPortfolioActivity(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
              <ApiButton
                title="NFT Collection"
                icon={<Image className="w-4 h-4" />}
                apiFn={() => getPortfolioNFTs(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
              <ApiButton
                title="Order History"
                icon={<History className="w-4 h-4" />}
                apiFn={() => getOrdersHistory(token)}
                setApiResult={setApiResult}
                setIsLoading={setIsLoading}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-start-1 lg:col-end-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-pink-400" /> Smart Intents
            </h2>
            <div className="space-y-4">
              <button
                onClick={() =>
                  (window.location.href = "/transfertoken?type=token")
                }
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Send className="w-5 h-5" />
                <span>Token Transfer</span>
              </button>
              <button
                onClick={() =>
                  (window.location.href = "/transfertoken?type=raw")
                }
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <FileText className="w-5 h-5" />
                <span>Raw Transaction</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <ResultModal
        isOpen={!!(apiResult || isLoading)}
        onClose={() => setApiResult(null)}
        result={apiResult}
        isLoading={isLoading}
      />
    </div>
  );
}
