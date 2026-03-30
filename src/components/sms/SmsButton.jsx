import { useState } from "react";
import { MessageSquare, Send, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SMS_TEMPLATES = [
  {
    label: "Job Scheduled",
    text: (job) =>
      `Hi ${job.customer_name}, your roofing job at ${job.address} has been scheduled for ${job.start_date || "an upcoming date"}. We'll be in touch with more details. Any questions? Reply to this message.`,
  },
  {
    label: "Job Starting Soon",
    text: (job) =>
      `Hi ${job.customer_name}, just a reminder that our crew will be at ${job.address} tomorrow. Please ensure access is available. Thank you!`,
  },
  {
    label: "Job Completed",
    text: (job) =>
      `Hi ${job.customer_name}, we've completed the roofing work at ${job.address}. Thank you for choosing us! An invoice will follow shortly.`,
  },
  {
    label: "Estimate Ready",
    text: (job) =>
      `Hi ${job.customer_name}, your estimate for the roofing work at ${job.address} is ready. We'll send it to you shortly. Please don't hesitate to call with any questions.`,
  },
  {
    label: "Custom Message",
    text: () => "",
  },
];

export default function SmsButton({ phone, job, variant = "outline", size = "sm", label = "Send SMS" }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(phone || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function applyTemplate(template) {
    setMessage(template.text(job || {}));
  }

  async function handleSend() {
    if (!to.trim() || !message.trim()) {
      toast.error("Phone number and message are required");
      return;
    }
    setSending(true);
    const res = await base44.functions.invoke("sendSms", { to: to.trim(), message: message.trim() });
    setSending(false);
    if (res.data?.success) {
      toast.success("SMS sent successfully!");
      setOpen(false);
      setMessage("");
    } else {
      toast.error(res.data?.error || "Failed to send SMS");
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-2">
        <MessageSquare className="w-4 h-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send SMS
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="+353 87 123 4567"
              />
            </div>

            {/* Templates */}
            <div className="space-y-1.5">
              <Label>Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                {SMS_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length} chars</p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}