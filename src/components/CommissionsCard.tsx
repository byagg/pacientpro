import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { useCommissions } from "@/hooks/use-commissions";

interface CommissionsCardProps {
  userId: string;
}

const CommissionsCard = ({ userId }: CommissionsCardProps) => {
  const { data: commissions = [], isLoading } = useCommissions(userId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel('commissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions',
          filter: `angiologist_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const paidCommissions = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          Načítavam provízie...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>Moje provízie</CardTitle>
        </div>
        <CardDescription>
          Prehľad vašich provízií za odoslaných pacientov
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové provízie</p>
                <p className="text-3xl font-bold text-primary">
                  {totalCommissions.toFixed(2)} €
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Čakajúce</p>
              <p className="text-xl font-semibold text-warning">
                {pendingCommissions.toFixed(2)} €
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Vyplatené</p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                {paidCommissions.toFixed(2)} €
              </p>
            </div>
          </div>

          {commissions.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Zatiaľ nemáte žiadne provízie
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionsCard;
