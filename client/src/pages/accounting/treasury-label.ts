// Restricted accounting users receive only account names/IDs; never show a fake zero balance.
export function treasuryAccountLabel(account: {
  name: string;
  currentBalance?: number | string;
}) {
  return account.currentBalance == null
    ? account.name
    : `${account.name} (الرصيد: ${Number(account.currentBalance).toLocaleString()} ج.م)`;
}
