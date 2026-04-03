import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function RoofReportReview({ report, onClose }) {
  const queryClient = useQueryClient();
  const [reviewerNotes, setReviewerNotes] = useState(report?.reviewer_notes || "");

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.RoofReport.update(report.id, {
        status: "approved",
        reviewer_notes: reviewerNotes,
        approved_by: (await base44.auth.me()).email,
        approved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roofReports"] });
      toast.success("Report approved!");
      onClose();
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.RoofReport.update(report.id, {
        status: "rejected",
        reviewer_notes: reviewerNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roofReports"] });
      toast.success("Report rejected");
      onClose();
    }
  });

  const generatePDF = async () => {
    try {
      const element = document.getElementById("roof-report-content");
      const canvas = await html2canvas(element, { scale: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`roof-report-${report.job_customer_name}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Roof Report - {report?.job_customer_name}</DialogTitle>
        </DialogHeader>

        <div id="roof-report-content" className="space-y-6 pr-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{report?.job_customer_name}</h3>
              <p className="text-sm text-muted-foreground">Generated {new Date(report?.created_date).toLocaleDateString()}</p>
            </div>
            <Badge className={report?.status === "approved" ? "bg-green-600" : report?.status === "rejected" ? "bg-red-600" : "bg-yellow-600"}>
              {report?.status.charAt(0).toUpperCase() + report?.status.slice(1)}
            </Badge>
          </div>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> AI Analysis & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{report?.ai_analysis}</p>
            </CardContent>
          </Card>

          {/* Materials */}
          {report?.materials_needed?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Materials Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.materials_needed.map((mat, idx) => (
                    <div key={idx} className="flex justify-between p-2 rounded bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{mat.name}</p>
                        <p className="text-xs text-muted-foreground">{mat.quantity} {mat.unit}</p>
                      </div>
                      <p className="font-semibold text-sm">${mat.estimated_cost?.toFixed(2) || "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Materials:</span>
                <span className="font-semibold">${report?.estimated_material_cost?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Labor:</span>
                <span className="font-semibold">${report?.estimated_labor_cost?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-primary">${report?.total_estimated_cost?.toFixed(2) || "0.00"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Timeline: {report?.timeline_estimate}</p>
            </CardContent>
          </Card>

          {/* Reviewer Notes */}
          {report?.status === "draft" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Add notes, changes, or concerns about this report..."
                  className="h-24"
                />
              </CardContent>
            </Card>
          )}

          {/* Display Notes if Already Reviewed */}
          {report?.status !== "draft" && report?.reviewer_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.reviewer_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end border-t pt-4 mt-4">
          <Button variant="outline" onClick={generatePDF}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          {report?.status === "draft" && (
            <>
              <Button
                variant="outline"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}