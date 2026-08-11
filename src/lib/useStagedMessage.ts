import { useEffect, useRef, useState } from 'react';

/**
 * Cycles through a sequence of messages while `active` is true, advancing on
 * the given delays. This is purely cosmetic — it doesn't reflect real backend
 * stage transitions (the tool-calling loop's actual timing varies), but a
 * two-call round trip (tool selection, then answer formatting) genuinely does
 * take a few seconds, and a message that changes reads as "working" rather
 * than "stuck" even though the underlying wait is the same length either way.
 */
export function useStagedMessage(active: boolean, stages: string[], delaysMs: number[]) {
  const [index, setIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!active) {
      setIndex(0);
      return;
    }

    let elapsed = 0;
    stages.forEach((_, i) => {
      if (i === 0) return;
      elapsed += delaysMs[i - 1] ?? 1200;
      const t = setTimeout(() => setIndex(i), elapsed);
      timers.current.push(t);
    });

    return () => {
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return stages[index];
}
