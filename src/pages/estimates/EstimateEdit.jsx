import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EstimateForm from "./EstimateForm";

export default function EstimateEdit() {
  const estimateId = window.location.pathname.split("/estimates/")[1]?.replace("/edit", "");

  const { data: estimate, isLoading } = useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: async () => {
      const rows = await base44.entities.Estimate.filter({ id: estimateId });
      return rows[0];
    },
    enabled: !!estimateId,
  });

  if (isLoading || !estimate) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return <EstimateForm existing={estimate} />;
}