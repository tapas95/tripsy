export type TripRole = 'owner' | 'member';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  default_currency: string;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: TripRole;
  joined_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  paid_by_user_id: string;
  receipt_url: string | null;
  created_at: string;
}

export interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  share_amount: number;
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settled_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & {
          created_at?: string;
          avatar_url?: string | null;
          default_currency?: string;
        };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      trips: {
        Row: Trip;
        Insert: {
          id?: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          currency?: string;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Trip>;
      };
      trip_members: {
        Row: TripMember;
        Insert: {
          trip_id: string;
          user_id: string;
          role?: TripRole;
          joined_at?: string;
        };
        Update: Partial<TripMember>;
      };
      expenses: {
        Row: Expense;
        Insert: {
          id?: string;
          trip_id: string;
          amount: number;
          category?: string;
          date?: string;
          note?: string | null;
          paid_by_user_id: string;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Expense>;
      };
      expense_splits: {
        Row: ExpenseSplit;
        Insert: ExpenseSplit;
        Update: Partial<ExpenseSplit>;
      };
      settlements: {
        Row: Settlement;
        Insert: {
          id?: string;
          trip_id: string;
          from_user_id: string;
          to_user_id: string;
          amount: number;
          settled_at?: string;
        };
        Update: Partial<Settlement>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
