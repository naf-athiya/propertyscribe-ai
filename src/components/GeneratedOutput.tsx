import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, Check, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedOutputProps {
  output: {
    ad_copy: string;
    narration: string;
    short_hook: string;
    full_script: string;
    key_points: string[];
    cta: string;
  };
}

export const GeneratedOutput = ({ output }: GeneratedOutputProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const OutputCard = ({ title, content, field }: { title: string; content: string; field: string }) => (
    <Card className="p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copyToClipboard(content, title)}
          className="rounded-full hover:bg-accent"
        >
          {copiedField === title ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Generated Content</h2>
        <Button
          className="rounded-xl shadow-medium hover:shadow-strong transition-all duration-300"
          onClick={() => {
            toast({
              title: "Coming Soon!",
              description: "VEED integration will be available soon",
            });
          }}
        >
          <Video className="w-4 h-4 mr-2" />
          Create Video in VEED
        </Button>
      </div>

      <div className="grid gap-6">
        <OutputCard title="Short Hook" content={output.short_hook} field="Short Hook" />
        
        <OutputCard title="Ad Copy" content={output.ad_copy} field="Ad Copy" />
        
        <OutputCard title="Narration Script" content={output.narration} field="Narration Script" />
        
        <OutputCard title="Full Script" content={output.full_script} field="Full Script" />
        
        <Card className="p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Key Selling Points</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(output.key_points.join("\n"), "Key Points")}
              className="rounded-full hover:bg-accent"
            >
              {copiedField === "Key Points" ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <ul className="space-y-2">
            {output.key_points.map((point, idx) => (
              <li key={idx} className="flex items-start">
                <span className="w-6 h-6 rounded-full bg-accent text-primary text-sm font-semibold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-foreground leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Card>

        <OutputCard title="Call to Action" content={output.cta} field="CTA" />
      </div>
    </div>
  );
};
