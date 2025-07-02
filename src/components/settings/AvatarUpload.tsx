import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarChange: (file: File | null) => void;
  onAvatarRemove: () => void;
  loading?: boolean;
  error?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  onAvatarRemove, 
  loading = false,
  error 
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const AVATAR_SIZE = 200; // 200x200 pixels

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, or GIF image.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB.';
    }
    
    return null;
  };

  const processImage = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    setValidationError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setPreview(e.target?.result as string);
        
        // Auto-crop to center square if image is not square
        if (img.width !== img.height) {
          const size = Math.min(img.width, img.height);
          setCropArea({
            x: (img.width - size) / 2,
            y: (img.height - size) / 2,
            width: size,
            height: size
          });
          setCropMode(true);
        } else {
          // Image is already square, process it directly
          processSquareImage(img, file);
        }
      };
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  }, []);

  const processSquareImage = (img: HTMLImageElement, originalFile: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to desired avatar dimensions
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    // Draw and resize image to fit avatar size
    ctx.drawImage(img, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    canvas.toBlob((blob) => {
      if (blob) {
        const processedFile = new File([blob], originalFile.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onAvatarChange(processedFile);
      }
    }, 'image/jpeg', 0.9);
  };

  const applyCrop = () => {
    if (!originalImage || !cropCanvasRef.current) return;

    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    // Draw cropped and resized image
    ctx.drawImage(
      originalImage,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], 'avatar.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onAvatarChange(croppedFile);
        setCropMode(false);
        setPreview(null);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileSelect = (file: File) => {
    processImage(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const cancelCrop = () => {
    setCropMode(false);
    setPreview(null);
    setOriginalImage(null);
  };

  const resetAvatar = () => {
    setPreview(null);
    setOriginalImage(null);
    setCropMode(false);
    setValidationError(null);
    onAvatarRemove();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Get display avatar (current, preview, or default)
  const getDisplayAvatar = () => {
    if (preview && !cropMode) return preview;
    if (currentAvatarUrl) return currentAvatarUrl;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Current Avatar Display */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-slate-700/50 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            {getDisplayAvatar() ? (
              <img 
                src={getDisplayAvatar()!} 
                alt="Profile avatar" 
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          
          {/* Hover overlay */}
          <button
            onClick={openFileDialog}
            disabled={loading || cropMode}
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:cursor-not-allowed"
            aria-label="Change profile picture"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">Profile Picture</h3>
          <p className="text-sm text-slate-400 mb-4">
            Upload a new avatar. For best results, use a square image that's at least 200×200 pixels.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openFileDialog}
              disabled={loading || cropMode}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              <Upload className="h-4 w-4" />
              Upload Photo
            </button>
            
            {currentAvatarUrl && (
              <button
                onClick={resetAvatar}
                disabled={loading || cropMode}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload profile picture file"
      />

      {/* Hidden canvases for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={cropCanvasRef} className="hidden" />

      {/* Drag and Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-slate-600 hover:border-slate-500'
        } ${loading || cropMode ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-300 mb-2">
          Drag and drop an image here, or{' '}
          <button
            onClick={openFileDialog}
            className="text-purple-400 hover:text-purple-300 underline"
            disabled={loading || cropMode}
          >
            browse files
          </button>
        </p>
        <p className="text-xs text-slate-500">
          Supports JPG, PNG, GIF up to 5MB
        </p>
      </div>

      {/* Crop Mode */}
      {cropMode && preview && originalImage && (
        <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Crop Your Image</h4>
            <div className="flex gap-2">
              <button
                onClick={cancelCrop}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={applyCrop}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                <Check className="h-4 w-4" />
                Apply Crop
              </button>
            </div>
          </div>
          
          <div className="relative mx-auto" style={{ maxWidth: '400px' }}>
            <img
              src={preview}
              alt="Crop preview"
              className="w-full h-auto rounded-lg"
              style={{ 
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
            
            {/* Crop overlay would go here in a production app */}
            <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
              <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
            </div>
          </div>
          
          <p className="text-sm text-slate-400 text-center mt-4">
            The dashed area shows how your image will be cropped to a square format.
          </p>
        </div>
      )}

      {/* Error Messages */}
      {(validationError || error) && (
        <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">
            {validationError || error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {!loading && !error && !validationError && currentAvatarUrl && !cropMode && (
        <div className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-green-300 text-sm">
            Profile picture updated successfully!
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
          <p className="text-blue-300 text-sm">
            Uploading your profile picture...
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Tips for best results:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Use a square image for best results (will be automatically cropped if not)</li>
          <li>• Minimum recommended size: 200×200 pixels</li>
          <li>• Maximum file size: 5MB</li>
          <li>• Supported formats: JPG, PNG, GIF</li>
          <li>• Your profile picture will be visible across the entire application</li>
        </ul>
      </div>
    </div>
  );
}