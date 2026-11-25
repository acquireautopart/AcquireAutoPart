export const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(
    Number(amount || 0),
  );
export const shortDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date))
    : "—";
export const cx = (...classes) => classes.filter(Boolean).join(" ");
