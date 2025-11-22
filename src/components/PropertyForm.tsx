import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Sparkles } from "lucide-react";

interface PropertyFormProps {
  onGenerate: (data: PropertyData) => void;
  isGenerating: boolean;
  hasImage: boolean;
}

export interface PropertyData {
  price: string;
  size: string;
  location: string;
  sellingPoints: string;
}

export const PropertyForm = ({ onGenerate, isGenerating, hasImage }: PropertyFormProps) => {
  const [formData, setFormData] = useState<PropertyData>({
    price: "",
    size: "",
    location: "",
    sellingPoints: "",
  });

  const isValid = hasImage && formData.price && formData.size && formData.location;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onGenerate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="price" className="text-sm font-medium">
            Harga (IDR)
          </Label>
          <Input
            id="price"
            placeholder="e.g., 500,000,000"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="size" className="text-sm font-medium">
            Ukuran Tanah
          </Label>
          <Input
            id="size"
            placeholder="e.g., 200m²"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium">
          Lokasi
        </Label>
        <Input
          id="location"
          placeholder="e.g., Tangerang Selatan, dekat BSD City"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="h-12 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellingPoints" className="text-sm font-medium">
          Selling Points (Optional)
        </Label>
        <Textarea
          id="sellingPoints"
          placeholder="e.g., dekat sekolah, akses toll, lingkungan asri..."
          value={formData.sellingPoints}
          onChange={(e) => setFormData({ ...formData, sellingPoints: e.target.value })}
          className="min-h-24 rounded-xl resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={!isValid || isGenerating}
        className="w-full h-14 rounded-xl text-base font-semibold shadow-medium hover:shadow-strong transition-all duration-300"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            generate an influencer-style video
          </>
        )}
      </Button>
    </form>
  );
};
