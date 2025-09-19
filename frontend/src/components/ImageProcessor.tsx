import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Upload } from 'lucide-react';
import BlurSettings from './BlurSettings';
import { safeVisionAPI } from '../services/safevisionApi';
import { BlurRules, DEFAULT_BLUR_RULES, SafeVisionResponse } from '../types/safevision';

const ImageProcessor: React.FC = () => {
  const [blurRules, setBlurRules] = useState<BlurRules>(DEFAULT_BLUR_RULES);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SafeVisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.25);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await safeVisionAPI.processImage(file, blurRules, threshold, true);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleProcessImage = async () => {
    if (selectedFile) {
      await handleImageUpload(selectedFile);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MODERATE': return 'text-yellow-600';
      case 'LOW': return 'text-blue-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Row - Blur Settings and Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left - Blur Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Blur Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <BlurSettings blurRules={blurRules} onRulesChange={setBlurRules} />
          </CardContent>
        </Card>

        {/* Right - Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Drop an image here or click to browse</p>
              <p className="text-sm text-gray-500">Supports: JPG, PNG, GIF, BMP, TIFF</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {/* Process Button */}
            {selectedFile && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Selected: {selectedFile.name}
                </p>
                <Button 
                  onClick={handleProcessImage}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Image'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
          {/* Processing Status */}
          {processing && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Processing image...</span>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Image</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Censored Image */}
                {result.censored_image && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Image URL: http://localhost:5001/{result.censored_image}
                    </p>
                    <img
                      src={`http://localhost:5001/${result.censored_image}`}
                      alt="Processed image"
                      className="w-full h-auto rounded border"
                      onError={(e) => {
                        console.error('Image failed to load:', e.target.src);
                      }}
                      onLoad={(e) => {
                        console.log('Image loaded successfully:', e.target.src);
                      }}
                    />
                  </div>
                )}
                {!result.censored_image && (
                  <div className="text-center py-8 text-gray-500">
                    No processed image available
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
};

export default ImageProcessor;
