import { supabase } from '../lib/supabase';
import { Expense, ExpenseSplit, Settlement } from '../types/database';

export interface ExpenseWithDetails extends Expense {
  paidByProfile?: { name: string; email: string };
  splits?: ExpenseSplit[];
}

export const getTripExpenses = async (tripId: string): Promise<ExpenseWithDetails[]> => {
  const { data: expenses, error } = await (supabase.from('expenses') as any)
    .select('*, paidByProfile:profiles!paid_by_user_id(name, email), splits:expense_splits(*)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (expenses || []) as ExpenseWithDetails[];
};

export const createExpense = async (expenseData: {
  tripId: string;
  amount: number;
  category?: string;
  date?: string;
  note?: string;
  paidByUserId: string;
  splits: { userId: string; shareAmount: number }[];
}): Promise<Expense> => {
  const { data: newExpense, error: expenseError } = await (supabase.from('expenses') as any)
    .insert({
      trip_id: expenseData.tripId,
      amount: expenseData.amount,
      category: expenseData.category || 'other',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      note: expenseData.note || null,
      paid_by_user_id: expenseData.paidByUserId,
    })
    .select()
    .single();

  if (expenseError || !newExpense) {
    throw new Error(expenseError?.message || 'Failed to create expense.');
  }

  // Insert splits
  if (expenseData.splits && expenseData.splits.length > 0) {
    const splitRows = expenseData.splits.map((s) => ({
      expense_id: (newExpense as any).id,
      user_id: s.userId,
      share_amount: s.shareAmount,
    }));

    const { error: splitError } = await (supabase.from('expense_splits') as any).insert(
      splitRows
    );

    if (splitError) {
      throw new Error(splitError.message);
    }
  }

  return newExpense as Expense;
};

export const getTripSettlements = async (tripId: string): Promise<Settlement[]> => {
  const { data, error } = await (supabase.from('settlements') as any)
    .select('*')
    .eq('trip_id', tripId)
    .order('settled_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Settlement[];
};

export const recordSettlement = async (settlementData: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}): Promise<Settlement> => {
  const { data, error } = await (supabase.from('settlements') as any)
    .insert({
      trip_id: settlementData.tripId,
      from_user_id: settlementData.fromUserId,
      to_user_id: settlementData.toUserId,
      amount: settlementData.amount,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to record settlement.');
  }

  return data as Settlement;
};
