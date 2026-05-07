import { useEffect, useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { PropertyForm, PropertyData } from "@/components/PropertyForm";
import { GeneratedOutput } from "@/components/GeneratedOutput";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type VideoStatus = "pending" | "processing" | "ready" | "failed";

const Index = () => {
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [propertyFile, setPropertyFile] = useState<File | null>(null);
  const [influencerImage, setInfluencerImage] = useState<string | null>(null);
  const [influencerFile, setInfluencerFile] = useState<File | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [narration, setNarration] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);

  const { toast } = useToast();

  // Realtime subscription to the current generation row
  useEffect(() => {
    if (!generationId) return;
    const channel = supabase
      .channel(`gen-${generationId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generations", filter: `id=eq.${generationId}` },
        (payload) => {
          const row = payload.new as { status: VideoStatus; video_url: string | null; error: string | null };
          setVideoStatus(row.status);
          if (row.video_url) setVideoUrl(row.video_url);
          if (row.status === "failed") {
            toast({ title: "Video render failed", description: row.error ?? "Unknown error", variant: "destructive" });
          } else if (row.status === "ready") {
            toast({ title: "Video is ready!", description: "Your influencer reel is done." });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [generationId, toast]);

  const uploadToBucket = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleGenerate = async (data: PropertyData) => {
    if (!propertyFile || !influencerFile) {
      toast({
        title: "Missing image",
        description: "Please upload both a property photo and an influencer photo.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setNarration(null);
    setVideoUrl(null);
    setVideoStatus(null);
    setGenerationId(null);

    try {
      const [propertyImageUrl, influencerImageUrl] = await Promise.all([
        uploadToBucket("property-images", propertyFile),
        uploadToBucket("influencer-images", influencerFile),
      ]);

      const { data: response, error } = await supabase.functions.invoke("generate-property-ad", {
        body: { propertyData: data, propertyImageUrl, influencerImageUrl },
      });
      if (error) throw new Error(error.message || "Failed to generate script");
      if (!response?.output?.narration || !response.generationId) {
        throw new Error("Invalid response from server");
      }

      setNarration(response.output.narration);
      setGenerationId(response.generationId);
      setVideoStatus("pending");

      // Kick off video render
      const { error: renderErr } = await supabase.functions.invoke("render-property-video", {
        body: { generationId: response.generationId },
      });
      if (renderErr) throw new Error(renderErr.message || "Failed to start video render");
      setVideoStatus("processing");

      toast({ title: "Script ready!", description: "Video is rendering — usually 1-3 minutes." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-primary to-primary-glow py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Ad Generator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Generate Instant Property Video Ads
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Upload a property photo and an influencer photo. Get a real influencer-style reel in minutes.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <Card className="p-8 rounded-3xl shadow-medium">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">1. Upload Property Image</h2>
              <p className="text-muted-foreground">A clear photo of the property</p>
            </div>
            <ImageUpload
              onImageSelect={(file, preview) => {
                setPropertyFile(file);
                setPropertyImage(preview);
              }}
              selectedImage={propertyImage}
              onClear={() => {
                setPropertyFile(null);
                setPropertyImage(null);
              }}
            />

            {propertyImage && (
              <>
                <div className="border-t border-border pt-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">2. Upload Influencer Photo</h2>
                  <p className="text-muted-foreground">A clear face photo of the avatar/influencer</p>
                </div>
                <ImageUpload
                  onImageSelect={(file, preview) => {
                    setInfluencerFile(file);
                    setInfluencerImage(preview);
                  }}
                  selectedImage={influencerImage}
                  onClear={() => {
                    setInfluencerFile(null);
                    setInfluencerImage(null);
                  }}
                />
              </>
            )}

            {propertyImage && influencerImage && (
              <div className="border-t border-border pt-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">3. Property Details</h2>
                <p className="text-muted-foreground mb-6">Fill in the property info</p>
                <PropertyForm
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  hasImage={!!propertyImage && !!influencerImage}
                />
              </div>
            )}
          </div>
        </Card>

        {narration && (
          <GeneratedOutput
            narration={narration}
            videoUrl={videoUrl}
            videoStatus={videoStatus}
          />
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        <p>Built with Lovable • Optimized for Property Market</p>
      </div>
    </div>
  );
};

export default Index;
