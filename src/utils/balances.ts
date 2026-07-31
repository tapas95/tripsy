/**
 * Balance calculation engine.
 *
 * Takes a list of expenses (with splits) and settled payments and
 * returns a simplified "who owes whom" debt list — no pair appears twice.
 *
 * Algorithm:
 *  1. For each expense, the payer is owed back each other person's share_amount.
 *  2. Sum net balance per user (positive = owed money, negative = owes money).
 *  3. Apply settlements to reduce balances.
 *  4. Simplify: greedily match biggest creditor with biggest debtor.
 */

import { ExpenseWithDetails } from '../api/expenses';
import { Settlement } from '../types/database';

export interface Debt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export const computeBalances = (
  expenses: ExpenseWithDetails[],
  settlements: Settlement[],
  memberMap: Record<string, string>, // userId -> name
): Debt[] => {
  // net[userId] = how much they are owed (positive) or owe (negative)
  const net: Record<string, number> = {};

  const add = (uid: string, delta: number) => {
    net[uid] = (net[uid] ?? 0) + delta;
  };

  // Build raw balances from expense splits
  for (const expense of expenses) {
    const payerId = expense.paid_by_user_id;
    const splits  = expense.splits ?? [];
    for (const split of splits) {
      if (split.user_id === payerId) continue; // payer doesn't owe themselves
      const amt = Number(split.share_amount);
      add(payerId,      +amt); // payer is owed
      add(split.user_id, -amt); // splittee owes
    }
  }

  // Apply settlements — reduce debts
  for (const s of settlements) {
    add(s.from_user_id, +Number(s.amount)); // they paid, so they owe less
    add(s.to_user_id,   -Number(s.amount)); // receiver got paid, owed less
  }

  // Split into creditors (positive) and debtors (negative)
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([id, v]) => ({ id, amount: v }));
  const debtors   = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([id, v]) => ({ id, amount: -v }));

  // Greedy simplification
  const debts: Debt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];
    const amt      = Math.min(creditor.amount, debtor.amount);

    if (amt > 0.005) {
      debts.push({
        fromUserId: debtor.id,
        fromName:   memberMap[debtor.id] ?? 'Member',
        toUserId:   creditor.id,
        toName:     memberMap[creditor.id] ?? 'Member',
        amount:     Math.round(amt * 100) / 100,
      });
    }

    creditor.amount -= amt;
    debtor.amount   -= amt;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount   < 0.005) di++;
  }

  return debts;
};
