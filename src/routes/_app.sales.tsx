import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, fmtMoney } from "@/lib/format";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

function SalesPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  const { data: items = [] } = useQuery({
    queryKey: ["sale-items", openId],
    queryFn: async () => openId ? (await supabase.from("sale_items").select("*").eq("sale_id", openId)).data ?? [] : [],
    enabled: !!openId,
  });

  const current = sales.find((s) => s.id === openId);

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Sales history</h1>
        <p className="text-sm text-muted-foreground">{sales.length} transactions</p>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr><th className="text-left p-3">Receipt</th><th className="text-left p-3">Date</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Payment</th><th className="text-right p-3">Total</th></tr>
          </thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No sales yet.</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(s.id)}>
                <td className="p-3 font-medium text-primary">{s.receipt_number}</td>
                <td className="p-3 text-muted-foreground">{fmtDate(s.created_at!)}</td>
                <td className="p-3">{s.customer_name}</td>
                <td className="p-3">{s.payment_method}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(Number(s.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="size-4" /> {current?.receipt_number}</DialogTitle></DialogHeader>
          {current && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{fmtDate(current.created_at!)} • {current.payment_method}</div>
              <div className="divide-y border-y">
                {items.map((i) => (
                  <div key={i.id} className="py-2 flex justify-between">
                    <span>{i.product_emoji} {i.product_name} <span className="text-muted-foreground">× {i.quantity}</span></span>
                    <span>{fmtMoney(Number(i.subtotal))}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmtMoney(Number(current.subtotal))}</span></div>
                {Number(current.discount_amount) > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{fmtMoney(Number(current.discount_amount))}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{fmtMoney(Number(current.tax_amount))}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span>{fmtMoney(Number(current.total))}</span></div>
                {current.payment_method === "Cash" && (
                  <>
                    <div className="flex justify-between text-muted-foreground"><span>Cash received</span><span>{fmtMoney(Number(current.cash_received))}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Change</span><span>{fmtMoney(Number(current.change_given))}</span></div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
