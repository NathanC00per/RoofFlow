import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoiceForm from "./InvoiceForm";

export default function InvoiceEdit() {
  const invoiceId = window.location.pathname.split("/invoices/")[1]?.replace("/edit", "");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const rows = await base44.entities.Invoice.filter({ id: invoiceId });
      return rows[0];
    },
    enabled: !!invoiceId,
  });

  if (isLoading || !invoice) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return <InvoiceForm existing={invoice} />;
}