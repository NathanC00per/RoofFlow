import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Delete } from "lucide-react";

const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

export default function Dialer({ onCall, disabled }) {
  const [number, setNumber] = useState('');

  const handleKey = (k) => setNumber(prev => prev + k);
  const handleDelete = () => setNumber(prev => prev.slice(0, -1));

  const handleCall = () => {
    if (number.trim()) onCall(number.trim());
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+353..."
          className="font-mono text-lg text-center"
          onKeyDown={(e) => e.key === 'Enter' && handleCall()}
        />
        <Button variant="outline" size="icon" onClick={handleDelete}>
          <Delete className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <Button
            key={k}
            variant="outline"
            className="h-11 text-base font-semibold"
            onClick={() => handleKey(k)}
          >
            {k}
          </Button>
        ))}
      </div>
      <Button
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={disabled || !number.trim()}
        onClick={handleCall}
      >
        <Phone className="w-4 h-4 mr-2" />
        Call
      </Button>
    </div>
  );
}