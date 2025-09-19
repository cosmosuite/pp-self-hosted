import React, { useState, useRef, useEffect } from 'react';
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
  const [liveBlurEnabled, setLiveBlurEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Live blur function with debouncing
  const performLiveBlur = async (rules: BlurRules) => {
    if (!selectedFile || !liveBlurEnabled) return;

    // Clear existing timeout
    if (liveBlurTimeoutRef.current) {
      clearTimeout(liveBlurTimeoutRef.current);
    }

    // Set new timeout for debounced processing
    liveBlurTimeoutRef.current = setTimeout(async () => {
      setProcessing(true);
      setError(null);

      try {
        const response = await safeVisionAPI.processImage(selectedFile, rules, threshold, true);
        setResult(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setProcessing(false);
      }
    }, 500); // 500ms debounce delay
  };

  // Handle blur rules change with live blur
  const handleBlurRulesChange = (newRules: BlurRules) => {
    setBlurRules(newRules);
    
    // Trigger live blur if file is selected and live blur is enabled
    if (selectedFile && liveBlurEnabled) {
      performLiveBlur(newRules);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      
      // Trigger live blur for new file
      if (liveBlurEnabled) {
        performLiveBlur(blurRules);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      
      // Trigger live blur for new file
      if (liveBlurEnabled) {
        performLiveBlur(blurRules);
      }
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (liveBlurTimeoutRef.current) {
        clearTimeout(liveBlurTimeoutRef.current);
      }
    };
  }, []);

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
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
        {/* Left - Blur Settings (30%) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Blur Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Live Blur Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Live Blur</span>
                  <Button
                    variant={liveBlurEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLiveBlurEnabled(!liveBlurEnabled)}
                    className="text-xs"
                  >
                    {liveBlurEnabled ? "ON" : "OFF"}
                  </Button>
                </div>
                
                <BlurSettings blurRules={blurRules} onRulesChange={handleBlurRulesChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Upload Area (70%) */}
        <div className="lg:col-span-7">
          <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFile ? (
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
            ) : (
              <div className="space-y-4">
                {/* Images Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Original Image */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Original</h4>
                    <div className="relative inline-block">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Selected image"
                        className="max-w-full h-auto rounded border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setSelectedFile(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>

                  {/* Processed Image */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Processed</h4>
                    {result && result.censored_image ? (
                      <img
                        src={`http://localhost:5001/${result.censored_image}`}
                        alt="Processed image"
                        className="max-w-full h-auto rounded border"
                        onError={(e) => {
                          console.error('Image failed to load:', e.target.src);
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', e.target.src);
                        }}
                      />
                    ) : processing ? (
                      <div className="flex items-center justify-center min-h-32 border-2 border-dashed border-gray-300 rounded p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span className="text-sm text-gray-500">Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center min-h-32 border-2 border-dashed border-gray-300 rounded p-8 text-gray-400">
                        <span className="text-sm">Click Process to see result</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* File Info and Process Button */}
                <div className="text-center">
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
                    ) : liveBlurEnabled ? (
                      'Manual Process'
                    ) : (
                      'Process Image'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default ImageProcessor;
