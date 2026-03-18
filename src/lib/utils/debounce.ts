type AnyFn = (...args: never[]) => void;

type Debounced<T extends AnyFn> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<T extends AnyFn>(fn: T, waitMs: number): Debounced<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;

  const run = () => {
    if (!latestArgs) {
      return;
    }

    fn(...latestArgs);
    latestArgs = null;
  };

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      run();
    }, waitMs);
  }) as Debounced<T>;

  debounced.cancel = () => {
    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
    latestArgs = null;
  };

  debounced.flush = () => {
    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
    run();
  };

  return debounced;
}