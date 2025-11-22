import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { PropertyForm, PropertyData } from "@/components/PropertyForm";
import { GeneratedOutput } from "@/components/GeneratedOutput";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<any>(null);
  const { toast } = useToast();

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file);
    setSelectedImage(preview);
  };

  const handleImageClear = () => {
    setSelectedFile(null);
    setSelectedImage(null);
  };

  const handleGenerate = async (data: PropertyData) => {
    setIsGenerating(true);
    
    try {
      // TODO: Call edge function with LLM
      // Placeholder for now - will be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock output for testing
      const mockOutput = {
        short_hook: "Tanah Strategis BSD - Investasi Menguntungkan!",
        ad_copy: `Tanah premium di ${data.location}, ${data.size}. Harga spesial ${data.price}. Lokasi strategis dengan akses mudah ke fasilitas utama. Cocok untuk investasi jangka panjang atau bangun rumah impian Anda!`,
        narration: `Halo! Saya mau tawarkan tanah istimewa di ${data.location}. Luasnya ${data.size}, dengan harga yang sangat menarik ${data.price}. ${data.sellingPoints || 'Lokasi strategis dengan potensi investasi tinggi'}. Kesempatan terbatas, jangan sampai kehabisan!`,
        full_script: `[Opening]\nHalo teman-teman! Ada kabar baik nih untuk yang lagi cari tanah investasi.\n\n[Main Content]\nSaya punya tanah premium di ${data.location}. Ukurannya ${data.size}, sangat cocok untuk berbagai keperluan. Harganya ${data.price} - ini harga spesial loh!\n\n${data.sellingPoints ? `[Key Features]\n${data.sellingPoints}\n\n` : ''}[Closing]\nJangan sampai menyesal karena kehabisan kesempatan emas ini. Hubungi saya sekarang via WhatsApp untuk info lebih lengkap!`,
        key_points: [
          `Lokasi strategis di ${data.location}`,
          `Luas tanah ${data.size}`,
          `Harga kompetitif ${data.price}`,
          ...(data.sellingPoints ? data.sellingPoints.split(',').map(p => p.trim()).slice(0, 2) : []),
        ],
        cta: "Hubungi sekarang via WhatsApp! Stok terbatas, jangan sampai kehabisan kesempatan investasi terbaik ini. Chat langsung untuk info lengkap dan survey lokasi!"
      };
      
      setGeneratedOutput(mockOutput);
      toast({
        title: "Success!",
        description: "Ad content generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
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
            Upload your property image and details. Get professional ad copy and video scripts in seconds.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Input Section */}
        <Card className="p-8 rounded-3xl shadow-medium">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Upload Property Image</h2>
              <p className="text-muted-foreground">Start by uploading a high-quality photo of your property</p>
            </div>
            
            <ImageUpload
              onImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              onClear={handleImageClear}
            />

            {selectedImage && (
              <>
                <div className="border-t border-border pt-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Property Details</h2>
                  <p className="text-muted-foreground mb-6">Fill in the information about your property</p>
                  
                  <PropertyForm
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    hasImage={!!selectedImage}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Output Section */}
        {generatedOutput && (
          <GeneratedOutput output={generatedOutput} />
        )}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        <p>Built with Lovable • Optimized for Indonesian Property Market</p>
      </div>
    </div>
  );
};

export default Index;
