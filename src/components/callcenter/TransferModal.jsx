import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneForwarded } from "lucide-react";

export default function TransferModal({ open, onClose, onTransfer, agents = [] }) {
  const [manualIdentity, setManualIdentity] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transfer Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {agents.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Online Agents</p>
              {agents.map(agent => (
                <Button
                  key={agent.identity}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => { onTransfer(agent.identity); onClose(); }}
                >
                  <PhoneForwarded className="w-4 h-4 mr-2 text-green-500" />
                  {agent.name || agent.identity}
                </Button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Or transfer to phone number</p>
            <div className="flex gap-2">
              <Input
                value={manualIdentity}
                onChange={e => setManualIdentity(e.target.value)}
                placeholder="+353..."
                className="font-mono"
              />
              <Button
                onClick={() => { onTransfer(manualIdentity); onClose(); }}
                disabled={!manualIdentity.trim()}
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}