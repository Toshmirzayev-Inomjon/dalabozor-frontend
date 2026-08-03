export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toLocalIsoDate(new Date());
}

export function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalIsoDate(date);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("uz-UZ", options || { day: "numeric", month: "long" }).format(
    new Date(year, month - 1, day),
  );
}
