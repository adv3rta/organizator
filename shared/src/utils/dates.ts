export const addDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export const isExpired = (iso: string | null): boolean => {
  if (!iso) {
    return false;
  }
  return new Date(iso).getTime() < Date.now();
};
