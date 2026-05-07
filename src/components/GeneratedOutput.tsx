import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedOutputProps {
  narration: string;
  videoUrl: string | null;
  videoStatus: "pending" | "processing" | "ready" | "failed" | null;
}

export const GeneratedOutput = ({ narration, videoUrl, videoStatus }: GeneratedOutputProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(narration);
      setCopied(true);
      toast({ title: "Copied!", description: "Script copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground">Generated Content</h2>

      <div className="grid gap-6">
        <Card className="p-8 rounded-2xl shadow-soft animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground">10-Second Script</h3>
            <Button variant="ghost" size="icon" onClick={copyToClipboard} className="rounded-full hover:bg-accent">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          <p className="text-lg text-foreground whitespace-pre-wrap leading-relaxed">{narration}</p>
        </Card>

        <Card className="p-6 rounded-2xl shadow-soft overflow-hidden animate-slide-up">
          <h3 className="text-lg font-semibold text-foreground mb-4">Influencer Video</h3>
          {videoStatus === "ready" && videoUrl ? (
            <video className="w-full rounded-lg" controls loop>
              <source src={videoUrl} type="video/mp4" />
            </video>
          ) : videoStatus === "failed" ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-6 text-center">
              Video render failed. Please try again.
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-12 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-foreground font-medium">
                {videoStatus === "processing" ? "Rendering your video..." : "Starting render..."}
              </p>
              <p className="text-sm text-muted-foreground">
                Usually takes 1-3 minutes. The video will appear here automatically.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
