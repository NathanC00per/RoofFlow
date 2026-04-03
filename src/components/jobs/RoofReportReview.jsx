import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, X, Download, ChevronDown, MapPin, Hammer, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function RoofReportReview({ report, job, onClose }) {
  const queryClient = useQueryClient();
  const [reviewerNotes, setReviewerNotes] = useState(report?.reviewer_notes || "");
  const [expandedSections, setExpandedSections] = useState({ analysis: true, materials: true });

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
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold mb-1">{report?.job_customer_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Professional Roof Assessment Report</p>
            </div>
            <Badge className={report?.status === "approved" ? "bg-green-600" : report?.status === "rejected" ? "bg-red-600" : "bg-blue-600"}>
              {report?.status.charAt(0).toUpperCase() + report?.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div id="roof-report-content" className="space-y-6 py-4">
          
          {/* Executive Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-blue-900 mb-3">Executive Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm">{job?.address}, {job?.city}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hammer className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Roof Type</p>
                  <p className="font-semibold text-sm capitalize">{job?.roof_type?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Roof Age</p>
                  <p className="font-semibold text-sm">{job?.roof_age_years} years</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Total</p>
                  <p className="font-bold text-lg text-blue-600">${report?.total_estimated_cost?.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Site Photos */}
          {(job?.photos_overall?.length > 0 || job?.photos_damage?.length > 0 || job?.photos_exterior?.length > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="bg-slate-100 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-200"
                onClick={() => toggleSection('photos')}
              >
                <h2 className="text-lg font-bold text-slate-900">Site Photography</h2>
                <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.photos ? 'rotate-180' : ''}`} />
              </div>
              {expandedSections.photos && (
                <div className="p-6 bg-white space-y-6">
                  {job?.photos_overall?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-slate-700">Overall Roof Condition</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {job.photos_overall.map((photo, idx) => (
                          <img key={idx} src={photo} alt={`Overall ${idx + 1}`} className="w-full h-40 object-cover rounded border" />
                        ))}
                      </div>
                    </div>
                  )}
                  {job?.photos_damage?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-red-700">Identified Damage Areas</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {job.photos_damage.map((photo, idx) => (
                          <img key={idx} src={photo} alt={`Damage ${idx + 1}`} className="w-full h-40 object-cover rounded border-2 border-red-200" />
                        ))}
                      </div>
                    </div>
                  )}
                  {job?.photos_exterior?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-3 text-slate-700">Exterior / Facade</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {job.photos_exterior.map((photo, idx) => (
                          <img key={idx} src={photo} alt={`Exterior ${idx + 1}`} className="w-full h-40 object-cover rounded border" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analysis & Recommendations */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="bg-amber-50 p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100"
              onClick={() => toggleSection('analysis')}
            >
              <h2 className="text-lg font-bold text-amber-900">Professional Analysis & Recommendations</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.analysis ? 'rotate-180' : ''}`} />
            </div>
            {expandedSections.analysis && (
              <div className="p-6 bg-white">
                <div className="prose prose-sm max-w-none space-y-4 text-sm leading-relaxed">
                  {report?.ai_analysis?.split('\n').filter(Boolean).map((paragraph, idx) => (
                    <p key={idx} className="text-slate-700">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Materials & Costs */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="bg-green-50 p-4 flex items-center justify-between cursor-pointer hover:bg-green-100"
              onClick={() => toggleSection('materials')}
            >
              <h2 className="text-lg font-bold text-green-900">Materials & Cost Estimate</h2>
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.materials ? 'rotate-180' : ''}`} />
            </div>
            {expandedSections.materials && (
              <div className="p-6 bg-white space-y-6">
                {/* Materials Table */}
                {report?.materials_needed?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-slate-900">Material Requirements</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-3 font-semibold text-slate-700">Material</th>
                            <th className="text-center p-3 font-semibold text-slate-700">Quantity</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Unit Price</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.materials_needed.map((mat, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="p-3 text-slate-700">{mat.name}</td>
                              <td className="text-center p-3 text-slate-600">{mat.quantity} {mat.unit}</td>
                              <td className="text-right p-3 text-slate-600">${(mat.estimated_cost / (mat.quantity || 1)).toFixed(2)}</td>
                              <td className="text-right p-3 font-semibold text-slate-900">${mat.estimated_cost?.toFixed(2) || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cost Summary */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700">Materials Subtotal:</span>
                    <span className="font-semibold text-slate-900">${report?.estimated_material_cost?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700">Labor (estimated):</span>
                    <span className="font-semibold text-slate-900">${report?.estimated_labor_cost?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total Estimated Cost:</span>
                    <span className="text-xl font-bold text-green-600">${report?.total_estimated_cost?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="pt-2 text-sm text-slate-600 italic">
                    Timeline: {report?.timeline_estimate}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reviewer Notes */}
          {report?.status === "draft" && (
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-bold text-slate-900 mb-3">Review Notes</h3>
              <Textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Add your professional notes, concerns, or required changes..."
                className="h-24"
              />
            </div>
          )}

          {report?.status !== "draft" && report?.reviewer_notes && (
            <div className="border rounded-lg p-6 bg-slate-50">
              <h3 className="font-bold text-slate-900 mb-2">Review Notes</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.reviewer_notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between items-center border-t pt-4 mt-6">
          <p className="text-xs text-muted-foreground">Generated: {new Date(report?.created_date).toLocaleString()}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePDF} size="sm">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            {report?.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  size="sm"
                  className="text-red-600"
                >
                  <X className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}