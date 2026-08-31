import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../lib/apiError";

interface RunOptions<T> {
  successMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
}

export function useApiCall() {
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(
    async <T>(
      request: () => Promise<T>,
      options: RunOptions<T> = {},
    ): Promise<T | null> => {
      setIsLoading(true);
      try {
        const data = await request();
        if (options.successMessage) toast.success(options.successMessage);
        options.onSuccess?.(data);
        return data;
      } catch (error) {
        options.onError?.(error);
        if (options.showErrorToast !== false) {
          toast.error(getApiErrorMessage(error));
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, run };
}
