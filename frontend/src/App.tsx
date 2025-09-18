import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ImageProcessor } from './components/ImageProcessor'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            SafeVision Content Filter
          </h1>
          <p className="text-muted-foreground">
            AI-Powered Content Detection & Filtering
          </p>
        </div>
        
        <ImageProcessor />
      </div>
    </div>
  )
}

export default App
