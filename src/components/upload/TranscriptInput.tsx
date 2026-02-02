import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TranscriptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TranscriptInput({ value, onChange, disabled }: TranscriptInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="transcript">Or paste your transcript directly</Label>
      <Textarea
        id="transcript"
        placeholder="Paste your meeting transcript here...

Example:
John: We need to update the API endpoints for v2.0 by next Friday.
Sarah: I'll handle the frontend changes. Can we get the design review done by Wednesday?
John: Sure, I'll set that up. Also, Mike should look into the database optimization."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[200px] resize-none font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Tip: Include speaker names for better owner detection
      </p>
    </div>
  );
}
