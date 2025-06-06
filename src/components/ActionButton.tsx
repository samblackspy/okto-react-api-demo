
type ActionButtonProps = {
  title: string;
  apiFn: () => Promise<any>;
  setApiResult: (result: any) => void;
  setIsLoading: (isLoading: boolean) => void;
};

export function ActionButton({ title, apiFn, setApiResult, setIsLoading }: ActionButtonProps) {
  const handleClick = async () => {
    setIsLoading(true);
    setApiResult(null);
    try {
      const result = await apiFn();
      setApiResult(result);
    } catch (error) {
      setApiResult({ error: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-center font-medium shadow"
    >
      {title}
    </button>
  );
}