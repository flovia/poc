import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboardCopy(timeoutMs = 1400) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const copy = useCallback(
    async (text: string | null | undefined): Promise<boolean> => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }

      clearTimer();
      setCopied(true);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, timeoutMs);
      return true;
    },
    [clearTimer, timeoutMs],
  );

  const reset = useCallback(() => {
    clearTimer();
    setCopied(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { copied, copy, reset };
}
