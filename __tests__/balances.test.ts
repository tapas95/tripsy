import { describe, it, expect } from '@jest/globals';
import { computeBalances } from '../src/utils/balances';
import { ExpenseWithDetails } from '../src/api/expenses';
import { Settlement } from '../src/types/database';

describe('computeBalances', () => {
  const memberMap = {
    'user-1': 'Alice',
    'user-2': 'Bob',
    'user-3': 'Charlie',
  };

  it('should calculate an equal split between 2 members', () => {
    const expenses: ExpenseWithDetails[] = [
      {
        id: 'e1',
        trip_id: 't1',
        amount: 100,
        category: 'food',
        date: '2026-08-05',
        note: null,
        receipt_url: null,
        paid_by_user_id: 'user-1',
        created_at: '2026-08-05T00:00:00Z',
        splits: [
          { expense_id: 'e1', user_id: 'user-1', share_amount: 50 },
          { expense_id: 'e1', user_id: 'user-2', share_amount: 50 },
        ],
      },
    ];

    const debts = computeBalances(expenses, [], memberMap);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: 'user-2',
      fromName: 'Bob',
      toUserId: 'user-1',
      toName: 'Alice',
      amount: 50,
    });
  });

  it('should simplify multi-person circular debts greedily', () => {
    const expenses: ExpenseWithDetails[] = [
      {
        id: 'e1',
        trip_id: 't1',
        amount: 90,
        category: 'food',
        date: '2026-08-05',
        note: null,
        receipt_url: null,
        paid_by_user_id: 'user-1',
        created_at: '2026-08-05T00:00:00Z',
        splits: [
          { expense_id: 'e1', user_id: 'user-1', share_amount: 30 },
          { expense_id: 'e1', user_id: 'user-2', share_amount: 30 },
          { expense_id: 'e1', user_id: 'user-3', share_amount: 30 },
        ],
      },
      {
        id: 'e2',
        trip_id: 't1',
        amount: 60,
        category: 'transport',
        date: '2026-08-05',
        note: null,
        receipt_url: null,
        paid_by_user_id: 'user-2',
        created_at: '2026-08-05T00:00:00Z',
        splits: [
          { expense_id: 'e2', user_id: 'user-2', share_amount: 30 },
          { expense_id: 'e2', user_id: 'user-3', share_amount: 30 },
        ],
      },
    ];

    const debts = computeBalances(expenses, [], memberMap);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: 'user-3',
      fromName: 'Charlie',
      toUserId: 'user-1',
      toName: 'Alice',
      amount: 60,
    });
  });

  it('should adjust balances correctly when settlements are logged', () => {
    const expenses: ExpenseWithDetails[] = [
      {
        id: 'e1',
        trip_id: 't1',
        amount: 100,
        category: 'food',
        date: '2026-08-05',
        note: null,
        receipt_url: null,
        paid_by_user_id: 'user-1',
        created_at: '2026-08-05T00:00:00Z',
        splits: [
          { expense_id: 'e1', user_id: 'user-1', share_amount: 50 },
          { expense_id: 'e1', user_id: 'user-2', share_amount: 50 },
        ],
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 's1',
        trip_id: 't1',
        from_user_id: 'user-2',
        to_user_id: 'user-1',
        amount: 30,
        settled_at: '2026-08-05T00:00:00Z',
      },
    ];

    const debts = computeBalances(expenses, settlements, memberMap);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: 'user-2',
      fromName: 'Bob',
      toUserId: 'user-1',
      toName: 'Alice',
      amount: 20,
    });
  });
});
