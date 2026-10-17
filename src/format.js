export function formatNum(number = 0) {
  if (number >= 1_000_000) return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number / 1_000_000) + " млн";
  if (number >= 1_000) return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(number / 1_000) + " тыс.";
  return new Intl.NumberFormat("ru-RU").format(number);
}
