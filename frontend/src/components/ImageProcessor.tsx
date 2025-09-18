import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

interface BlurOptions {
  applyBlur: boolean
  enhancedBlur: boolean
  solidColor: boolean
  maskColor: [number, number, number]
  fullBlurRule: number
  threshold: number
}

interface ProcessingResult {
  success: boolean
  outputPath?: string
  fileName?: string
  originalFileName?: string
  stats?: {
    originalSize: number
    processedSize: number
    processingTime: number
    detections: number
  }
  error?: string
}

export function ImageProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [blurOptions, setBlurOptions] = useState<BlurOptions>({
    applyBlur: true,
    enhancedBlur: false,
    solidColor: false,
    maskColor: [0, 0, 0],
    fullBlurRule: 0,
    threshold: 0.25
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult(null)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult(null)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const processImage = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setResult(null)

    try {
      console.log('Starting image processing...')
      console.log('File:', selectedFile.name, selectedFile.size)
      console.log('Options:', blurOptions)

      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('applyBlur', blurOptions.applyBlur.toString())
      formData.append('enhancedBlur', blurOptions.enhancedBlur.toString())
      formData.append('solidColor', blurOptions.solidColor.toString())
      formData.append('maskColor', JSON.stringify(blurOptions.maskColor))
      formData.append('fullBlurRule', blurOptions.fullBlurRule.toString())
      formData.append('threshold', blurOptions.threshold.toString())

      console.log('Sending request to backend...')

      const response = await fetch('http://localhost:3001/api/process-image', {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error:', errorText)
        throw new Error(`Server error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      setResult(data)
    } catch (error) {
      console.error('Processing error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (result?.fileName) {
      window.open(`http://localhost:3001/api/download/${result.fileName}`, '_blank')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Panel - Upload and Settings */}
      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>📁 Upload Image</CardTitle>
            <CardDescription>
              Select an image file to process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-4xl">📷</div>
                  <div>
                    <p className="text-lg font-medium">Drop an image here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Blur Settings */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Blur Settings</CardTitle>
            <CardDescription>
              Configure content detection and blur options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Apply Blur Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="apply-blur">Apply Blur</Label>
              <Switch
                id="apply-blur"
                checked={blurOptions.applyBlur}
                onCheckedChange={(checked) =>
                  setBlurOptions(prev => ({ ...prev, applyBlur: checked }))
                }
              />
            </div>

            {/* Enhanced Blur Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="enhanced-blur">Enhanced Blur (Stronger)</Label>
              <Switch
                id="enhanced-blur"
                checked={blurOptions.enhancedBlur}
                onCheckedChange={(checked) =>
                  setBlurOptions(prev => ({ ...prev, enhancedBlur: checked }))
                }
                disabled={!blurOptions.applyBlur}
              />
            </div>

            {/* Solid Color Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="solid-color">Use Solid Color Instead of Blur</Label>
              <Switch
                id="solid-color"
                checked={blurOptions.solidColor}
                onCheckedChange={(checked) =>
                  setBlurOptions(prev => ({ ...prev, solidColor: checked }))
                }
                disabled={!blurOptions.applyBlur}
              />
            </div>

            {/* Mask Color */}
            {blurOptions.solidColor && (
              <div className="space-y-2">
                <Label>Mask Color (RGB)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={blurOptions.maskColor[0]}
                    onChange={(e) =>
                      setBlurOptions(prev => ({
                        ...prev,
                        maskColor: [parseInt(e.target.value) || 0, prev.maskColor[1], prev.maskColor[2]]
                      }))
                    }
                    placeholder="R"
                    className="w-20"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={blurOptions.maskColor[1]}
                    onChange={(e) =>
                      setBlurOptions(prev => ({
                        ...prev,
                        maskColor: [prev.maskColor[0], parseInt(e.target.value) || 0, prev.maskColor[2]]
                      }))
                    }
                    placeholder="G"
                    className="w-20"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={blurOptions.maskColor[2]}
                    onChange={(e) =>
                      setBlurOptions(prev => ({
                        ...prev,
                        maskColor: [prev.maskColor[0], prev.maskColor[1], parseInt(e.target.value) || 0]
                      }))
                    }
                    placeholder="B"
                    className="w-20"
                  />
                </div>
              </div>
            )}

            {/* Detection Threshold */}
            <div className="space-y-2">
              <Label>Detection Threshold: {blurOptions.threshold}</Label>
              <Slider
                value={[blurOptions.threshold]}
                onValueChange={([value]) =>
                  setBlurOptions(prev => ({ ...prev, threshold: value }))
                }
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Full Blur Rule */}
            <div className="space-y-2">
              <Label htmlFor="full-blur-rule">Full Blur Rule (0 = disabled)</Label>
              <Input
                id="full-blur-rule"
                type="number"
                min="0"
                value={blurOptions.fullBlurRule}
                onChange={(e) =>
                  setBlurOptions(prev => ({ ...prev, fullBlurRule: parseInt(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>

            {/* Process Button */}
            <Button
              onClick={processImage}
              disabled={!selectedFile || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? '🔄 Processing...' : '🚀 Process Image'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Results */}
      <div className="space-y-6">
        {/* Processing Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>
                {result.success ? '✅ Processing Complete' : '❌ Processing Failed'}
              </CardTitle>
              <CardDescription>
                {result.success ? 'Your image has been processed successfully' : 'There was an error processing your image'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.success && result.stats && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Original Size</Label>
                    <p className="font-medium">{formatFileSize(result.stats.originalSize)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Processed Size</Label>
                    <p className="font-medium">{formatFileSize(result.stats.processedSize)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Processing Time</Label>
                    <p className="font-medium">{result.stats.processingTime}ms</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Detections</Label>
                    <p className="font-medium">{result.stats.detections}</p>
                  </div>
                </div>
              )}

              {result.success && (
                <Button onClick={downloadResult} className="w-full">
                  📥 Download Processed Image
                </Button>
              )}

              {result.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>📋 How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>1. Upload Image:</strong> Drag and drop or click to select an image file
            </div>
            <div>
              <strong>2. Configure Settings:</strong> Adjust blur options and detection threshold
            </div>
            <div>
              <strong>3. Process:</strong> Click the process button to analyze and blur content
            </div>
            <div>
              <strong>4. Download:</strong> Download the processed image with applied blur
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
