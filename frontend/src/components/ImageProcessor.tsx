import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Upload, Eye, EyeOff } from 'lucide-react';
import BlurSettings from './BlurSettings';
import { safeVisionAPI } from '../services/safevisionApi';
import { BlurRules, DEFAULT_BLUR_RULES, SafeVisionResponse } from '../types/safevision';

const ImageProcessor: React.FC = () => {
  const [blurRules, setBlurRules] = useState<BlurRules>(DEFAULT_BLUR_RULES);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SafeVisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.25);
  const [showBlurSettings, setShowBlurSettings] = useState(false);
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
      handleImageUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Settings and Upload */}
        <div className="space-y-6">
          {/* Upload Area */}
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
            </CardContent>
          </Card>

          {/* Threshold Setting */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="threshold">Detection Threshold: {threshold}</Label>
                <Input
                  id="threshold"
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower values = more sensitive detection
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Blur Settings Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Blur Settings</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBlurSettings(!showBlurSettings)}
                >
                  {showBlurSettings ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showBlurSettings ? 'Hide' : 'Show'} Settings
                </Button>
              </div>
            </CardHeader>
            {showBlurSettings && (
              <CardContent>
                <BlurSettings blurRules={blurRules} onRulesChange={setBlurRules} />
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column - Results */}
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
                <CardTitle>Detection Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Detections Found</p>
                    <p className="text-2xl font-bold">{result.data?.detections_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Risk Level</p>
                    <p className={`text-2xl font-bold ${getRiskColor(result.data?.risk_level || 'SAFE')}`}>
                      {result.data?.risk_level || 'SAFE'}
                    </p>
                  </div>
                </div>

                {/* Safety Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${result.data?.is_safe ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    {result.data?.is_safe ? 'Safe Content' : 'NSFW Content Detected'}
                  </span>
                </div>

                {/* Detections List */}
                {result.detections && result.detections.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Detected Objects:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.detections.map((detection, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{detection.label}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({Math.round(detection.confidence * 100)}%)
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              detection.should_blur 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {detection.should_blur ? 'Will Blur' : 'No Blur'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Censored Image */}
                {result.censored_image && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Censored Image:</h4>
                    <img
                      src={`http://localhost:5001/${result.censored_image}`}
                      alt="Censored result"
                      className="w-full h-auto rounded border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;
