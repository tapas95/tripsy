import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTripExpenses,
  createExpense,
  getTripSettlements,
  recordSettlement,
  ExpenseWithDetails,
} from '../api/expenses';

export const useExpenses = (tripId: string) => {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery<ExpenseWithDetails[]>({
    queryKey: ['expenses', tripId],
    queryFn: () => getTripExpenses(tripId),
    enabled: !!tripId,
  });

  const settlementsQuery = useQuery({
    queryKey: ['settlements', tripId],
    queryFn: () => getTripSettlements(tripId),
    enabled: !!tripId,
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: {
      amount: number;
      category?: string;
      date?: string;
      note?: string;
      paidByUserId: string;
      splits: { userId: string; shareAmount: number }[];
    }) => createExpense({ ...data, tripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });
    },
  });

  const settleDebtMutation = useMutation({
    mutationFn: (data: { fromUserId: string; toUserId: string; amount: number }) =>
      recordSettlement({ ...data, tripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlements', tripId] });
    },
  });

  return {
    expenses: expensesQuery.data || [],
    isLoadingExpenses: expensesQuery.isLoading,
    refetchExpenses: expensesQuery.refetch,
    settlements: settlementsQuery.data || [],
    createExpense: createExpenseMutation.mutateAsync,
    isCreatingExpense: createExpenseMutation.isPending,
    settleDebt: settleDebtMutation.mutateAsync,
    isSettling: settleDebtMutation.isPending,
  };
};
