export const parseArg = (index: number, args: string[]): string | undefined => args[index + 1];

export const parsePositiveInteger = (value: string | undefined, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

export const parseIso = (value: string | undefined, name: string) => {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO datetime`);
  return new Date(value).toISOString();
};
