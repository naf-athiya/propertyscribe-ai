import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, Check, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface GeneratedOutputProps {
  output: {
    narration: string;
  };
}
export const GeneratedOutput = ({
  output
}: GeneratedOutputProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  const OutputCard = ({
    title,
    content,
    field
  }: {
    title: string;
    content: string;
    field: string;
  }) => <Card className="p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(content, title)} className="rounded-full hover:bg-accent">
          {copiedField === title ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </Button>
      </div>
      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
    </Card>;
  return <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Generated Content</h2>
        
      </div>

      <div className="grid gap-6">
        <Card className="p-8 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground">10-Second Script</h3>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(output.narration, "Narration Script")} className="rounded-full hover:bg-accent">
              {copiedField === "Narration Script" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          <p className="text-lg text-foreground whitespace-pre-wrap leading-relaxed">{output.narration}</p>
        </Card>

        <Card className="p-6 rounded-2xl shadow-soft overflow-hidden animate-slide-up">
          <h3 className="text-lg font-semibold text-foreground mb-4">Example Video</h3>
          <video className="w-full rounded-lg" controls loop>
            <source src="/videos/example-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </Card>
      </div>
    </div>;
};