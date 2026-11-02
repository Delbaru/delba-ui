import { useCallback, useMemo, useState, type FocusEvent } from 'react';

interface UseInputFocusOptions {
  lockAutofill: boolean;
}

export function useInputFocus({ lockAutofill }: UseInputFocusOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [isAutofillLocked, setIsAutofillLocked] = useState(lockAutofill);

  const enter = useCallback(() => {
    setIsFocused(true);
  }, []);

  const leave = useCallback(
    (focusRemainsInside: boolean) => {
      if (focusRemainsInside) return;
      setIsFocused(false);
      if (lockAutofill) setIsAutofillLocked(true);
    },
    [lockAutofill],
  );

  const unlockAutofill = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!lockAutofill || !isAutofillLocked) return;
      setIsAutofillLocked(false);
      // React commits the state on the next render; remove the transient lock before same-tick input.
      event.currentTarget.removeAttribute('readonly');
    },
    [isAutofillLocked, lockAutofill],
  );

  const focus = useMemo(() => ({ enter, leave }), [enter, leave]);
  const autofill = useMemo(() => ({ unlock: unlockAutofill }), [unlockAutofill]);

  return { isFocused, isAutofillLocked, focus, autofill };
}
