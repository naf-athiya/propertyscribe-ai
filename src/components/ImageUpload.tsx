import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export const ImageUpload = ({ onImageSelect, selectedImage, onClear }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        onImageSelect(file, preview);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      onImageSelect(file, preview);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {!selectedImage ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center
            transition-all duration-300 cursor-pointer
            ${
              isDragging
                ? "border-primary bg-accent scale-[1.02]"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
            }
          `}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-1">
                Drop your property image here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse your files
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WEBP up to 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-medium">
          <img
            src={selectedImage}
            alt="Property preview"
            className="w-full h-64 object-cover"
          />
          <Button
            onClick={onClear}
            variant="destructive"
            size="icon"
            className="absolute top-4 right-4 rounded-full shadow-lg"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Image ready</span>
          </div>
        </div>
      )}
    </div>
  );
};
