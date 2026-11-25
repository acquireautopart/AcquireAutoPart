export const cx = (...values) => values.filter(Boolean).join(" ");
export const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number(amount || 0),
  );
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(value),
      )
    : "—";
export const ago = (value) => {
  if (!value) return "—";
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 60
    ? `${minutes}m ago`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)}h ago`
      : `${Math.floor(minutes / 1440)}d ago`;
};
