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
  receiptUri?: string;
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

  // Upload receipt if provided
  if (expenseData.receiptUri) {
    try {
      const { uploadReceipt, setExpenseReceiptUrl } = await import('./storage');
      const receiptUrl = await uploadReceipt(expenseData.receiptUri, expenseData.tripId, newExpense.id);
      await setExpenseReceiptUrl(newExpense.id, receiptUrl);
      newExpense.receipt_url = receiptUrl;
    } catch (err) {
      console.warn('Failed to upload receipt during expense creation:', err);
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

export const updateExpense = async (
  expenseId: string,
  updates: {
    amount?: number;
    category?: string;
    date?: string;
    note?: string | null;
    paidByUserId?: string;
    splits?: { userId: string; shareAmount: number }[];
  }
): Promise<Expense> => {
  const patch: Record<string, unknown> = {};
  if (updates.amount     !== undefined) patch.amount           = updates.amount;
  if (updates.category   !== undefined) patch.category         = updates.category;
  if (updates.date       !== undefined) patch.date             = updates.date;
  if (updates.note       !== undefined) patch.note             = updates.note;
  if (updates.paidByUserId !== undefined) patch.paid_by_user_id = updates.paidByUserId;

  const { data: updated, error } = await (supabase.from('expenses') as any)
    .update(patch)
    .eq('id', expenseId)
    .select()
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to update expense.');

  // If splits are provided, replace them atomically (delete old → insert new)
  if (updates.splits) {
    const { error: delError } = await (supabase.from('expense_splits') as any)
      .delete()
      .eq('expense_id', expenseId);
    if (delError) throw new Error(delError.message);

    if (updates.splits.length > 0) {
      const rows = updates.splits.map((s) => ({
        expense_id: expenseId,
        user_id: s.userId,
        share_amount: s.shareAmount,
      }));
      const { error: insError } = await (supabase.from('expense_splits') as any).insert(rows);
      if (insError) throw new Error(insError.message);
    }
  }

  return updated as Expense;
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  // Delete splits first (FK constraint), then the expense row
  const { error: splitErr } = await (supabase.from('expense_splits') as any)
    .delete()
    .eq('expense_id', expenseId);
  if (splitErr) throw new Error(splitErr.message);

  const { error } = await (supabase.from('expenses') as any)
    .delete()
    .eq('id', expenseId);
  if (error) throw new Error(error.message);
};

export const getExpenseById = async (expenseId: string): Promise<ExpenseWithDetails> => {
  const { data, error } = await (supabase.from('expenses') as any)
    .select('*, paidByProfile:profiles!paid_by_user_id(name, email), splits:expense_splits(*)')
    .eq('id', expenseId)
    .single();

  if (error || !data) throw new Error(error?.message || 'Expense not found.');
  return data as ExpenseWithDetails;
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
