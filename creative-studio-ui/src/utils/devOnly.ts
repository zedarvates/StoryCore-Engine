// Remplace console.log par une version silencieuse en production
// Usage: Remplacer console.log(...) par devLog(...)

const isDev = (): boolean => {
  return import.meta.env?.DEV || process.env?.NODE_ENV === 'development';
};

export const devLog = (...args: unknown[]): void => {
  if (isDev()) {
    console.log(...args);
  }
  // Silence en production
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev()) {
    console.warn(...args);
  }
};

export const devError = (...args: unknown[]): void => {
  if (isDev()) {
    console.error(...args);
  }
};

export const devGroup = (...args: unknown[]): void => {
  if (isDev()) {
    console.group(...args);
  }
};

export const devGroupEnd = (): void => {
  if (isDev()) {
    console.groupEnd();
  }
};

export const devTable = (...args: unknown[]): void => {
  if (isDev()) {
    console.table(...args);
  }
};
