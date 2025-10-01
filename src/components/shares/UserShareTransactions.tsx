import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History } from "lucide-react";
import { formatDateTime } from '@/lib/dateFormatter';

interface UserShareTransaction {
  id: string;
  share_id: string;
  user_id: string;
  transaction_type: string;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  share_name?: string;
}

interface UserShareTransactionsProps {
  userId: string;
  sortOrder?: 'date_desc' | 'date_asc';
}

const UserShareTransactions: React.FC<UserShareTransactionsProps> = ({ userId, sortOrder = 'date_desc' }) => {
  const [transactions, setTransactions] = useState<UserShareTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchShareTransactions();
    // eslint-disable-next-line
  }, [userId, sortOrder]);

  const fetchShareTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("share_transactions")
        .select(
          "id, share_id, user_id, transaction_type, quantity, price_per_share, total_amount, currency, status, created_at, shares(name)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: sortOrder === 'date_asc' });
      if (error) throw error;
      const items = (data || []).map((tx: any) => ({
        ...tx,
        share_name: tx.shares?.name,
      }));
      setTransactions(items);
    } catch (err: any) {
      toast.error("Failed to load share transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton className="h-8 w-full" key={i} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No share transactions found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Share</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm">{tx.share_name || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        tx.transaction_type === "buy"
                          ? "text-green-700 font-medium"
                          : tx.transaction_type === "sell"
                          ? "text-red-700 font-medium"
                          : "font-medium"
                      }
                    >
                      {tx.transaction_type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{tx.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    UGX {Number(tx.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        tx.status === "completed"
                          ? "text-green-600"
                          : tx.status === "pending"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
                    >
                      {tx.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default UserShareTransactions;
