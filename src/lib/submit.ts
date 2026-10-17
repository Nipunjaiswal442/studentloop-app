import { useCallback, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "./errors";

/**
 * Runs an async action with a pending flag and a toast on failure.
 * Resolves to the action's result, or undefined if it failed.
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    try {
      return await action();
    } catch (e) {
      toast.error(errorMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, run };
}
