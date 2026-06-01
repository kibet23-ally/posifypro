export const fmtMoney = (n: number, symbol = "KSh") =>
  `${symbol} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const genReceiptNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `R-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.floor(Math.random()*1000)}`;
};
