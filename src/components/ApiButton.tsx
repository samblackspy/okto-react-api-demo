import React from "react";
import { Loader2 } from "lucide-react";

type ApiButtonProps = {
  title: string;
  icon: React.ReactNode;
  apiFn: () => Promise<any>;
  setApiResult: (result: any) => void;
  setIsLoading: (loading: boolean) => void;
};

export function ApiButton({
  title,
  icon,
  apiFn,
  setApiResult,
  setIsLoading,
}: ApiButtonProps) {
  const [isButtonLoading, setIsButtonLoading] = React.useState(false);

  const handleClick = async () => {
    setIsButtonLoading(true);
    setIsLoading(true);
    try {
      const result = await apiFn();
      setApiResult(result);
    } catch (error) {
      setApiResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsButtonLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isButtonLoading}
      className="w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 rounded-xl p-4 text-left transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center space-x-3">
        <div className="text-blue-400 group-hover:text-blue-300 transition-colors">
          {isButtonLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            icon
          )}
        </div>
        <span className="text-white font-medium group-hover:text-gray-100 transition-colors">
          {title}
        </span>
      </div>
    </button>
  );
}
