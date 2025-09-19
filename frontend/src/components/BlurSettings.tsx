import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { BlurRules, BLUR_RULE_LABELS } from '../types/safevision';

interface BlurSettingsProps {
  blurRules: BlurRules;
  onRulesChange: (rules: BlurRules) => void;
}

const BlurSettings: React.FC<BlurSettingsProps> = ({ blurRules, onRulesChange }) => {
  const [showDetailedSettings, setShowDetailedSettings] = useState(false);

  const handleRuleChange = (label: keyof BlurRules, value: boolean) => {
    onRulesChange({
      ...blurRules,
      [label]: value
    });
  };

  const applyPreset = (preset: 'faces-only' | 'nudity-only' | 'everything' | 'nothing') => {
    const presets: Record<string, BlurRules> = {
      'faces-only': {
        FACE_FEMALE: true,
        FACE_MALE: true,
        FEMALE_GENITALIA_EXPOSED: false,
        MALE_GENITALIA_EXPOSED: false,
        FEMALE_BREAST_EXPOSED: false,
        MALE_BREAST_EXPOSED: false,
        BUTTOCKS_EXPOSED: false,
        ANUS_EXPOSED: false,
        BELLY_EXPOSED: false,
        FEET_EXPOSED: false,
        ARMPITS_EXPOSED: false,
        FEMALE_GENITALIA_COVERED: false,
        FEMALE_BREAST_COVERED: false,
        BUTTOCKS_COVERED: false,
        ANUS_COVERED: false,
        BELLY_COVERED: false,
        FEET_COVERED: false,
        ARMPITS_COVERED: false,
      },
      'nudity-only': {
        FACE_FEMALE: false,
        FACE_MALE: false,
        FEMALE_GENITALIA_EXPOSED: true,
        MALE_GENITALIA_EXPOSED: true,
        FEMALE_BREAST_EXPOSED: true,
        MALE_BREAST_EXPOSED: true,
        BUTTOCKS_EXPOSED: true,
        ANUS_EXPOSED: true,
        BELLY_EXPOSED: true,
        FEET_EXPOSED: true,
        ARMPITS_EXPOSED: true,
        FEMALE_GENITALIA_COVERED: false,
        FEMALE_BREAST_COVERED: false,
        BUTTOCKS_COVERED: false,
        ANUS_COVERED: false,
        BELLY_COVERED: false,
        FEET_COVERED: false,
        ARMPITS_COVERED: false,
      },
      'everything': Object.keys(blurRules).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {} as BlurRules),
      'nothing': Object.keys(blurRules).reduce((acc, key) => ({
        ...acc,
        [key]: false
      }), {} as BlurRules),
    };

    onRulesChange(presets[preset]);
  };

  // Function to check which preset is currently active
  const getActivePreset = (): 'faces-only' | 'nudity-only' | 'everything' | 'nothing' | null => {
    const facesOnly = blurRules.FACE_FEMALE && blurRules.FACE_MALE && 
      !blurRules.FEMALE_GENITALIA_EXPOSED && !blurRules.MALE_GENITALIA_EXPOSED &&
      !blurRules.FEMALE_BREAST_EXPOSED && !blurRules.MALE_BREAST_EXPOSED &&
      !blurRules.BUTTOCKS_EXPOSED && !blurRules.ANUS_EXPOSED &&
      !blurRules.BELLY_EXPOSED && !blurRules.FEET_EXPOSED && !blurRules.ARMPITS_EXPOSED &&
      !blurRules.FEMALE_GENITALIA_COVERED && !blurRules.FEMALE_BREAST_COVERED &&
      !blurRules.BUTTOCKS_COVERED && !blurRules.ANUS_COVERED &&
      !blurRules.BELLY_COVERED && !blurRules.FEET_COVERED && !blurRules.ARMPITS_COVERED;

    const nudityOnly = !blurRules.FACE_FEMALE && !blurRules.FACE_MALE && 
      blurRules.FEMALE_GENITALIA_EXPOSED && blurRules.MALE_GENITALIA_EXPOSED &&
      blurRules.FEMALE_BREAST_EXPOSED && blurRules.MALE_BREAST_EXPOSED &&
      blurRules.BUTTOCKS_EXPOSED && blurRules.ANUS_EXPOSED &&
      blurRules.BELLY_EXPOSED && blurRules.FEET_EXPOSED && blurRules.ARMPITS_EXPOSED &&
      !blurRules.FEMALE_GENITALIA_COVERED && !blurRules.FEMALE_BREAST_COVERED &&
      !blurRules.BUTTOCKS_COVERED && !blurRules.ANUS_COVERED &&
      !blurRules.BELLY_COVERED && !blurRules.FEET_COVERED && !blurRules.ARMPITS_COVERED;

    const everything = Object.values(blurRules).every(value => value === true);
    const nothing = Object.values(blurRules).every(value => value === false);

    if (facesOnly) return 'faces-only';
    if (nudityOnly) return 'nudity-only';
    if (everything) return 'everything';
    if (nothing) return 'nothing';
    return null;
  };

  const faceLabels: (keyof BlurRules)[] = ['FACE_FEMALE', 'FACE_MALE'];
  const exposedLabels: (keyof BlurRules)[] = [
    'FEMALE_GENITALIA_EXPOSED',
    'MALE_GENITALIA_EXPOSED',
    'FEMALE_BREAST_EXPOSED',
    'MALE_BREAST_EXPOSED',
    'BUTTOCKS_EXPOSED',
    'ANUS_EXPOSED',
    'BELLY_EXPOSED',
    'FEET_EXPOSED',
    'ARMPITS_EXPOSED',
  ];
  const coveredLabels: (keyof BlurRules)[] = [
    'FEMALE_GENITALIA_COVERED',
    'FEMALE_BREAST_COVERED',
    'BUTTOCKS_COVERED',
    'ANUS_COVERED',
    'BELLY_COVERED',
    'FEET_COVERED',
    'ARMPITS_COVERED',
  ];

  return (
    <div className="space-y-4">
      {/* Quick Presets - Always Visible */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={getActivePreset() === 'faces-only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset('faces-only')}
            className="text-xs"
          >
            Faces Only
          </Button>
          <Button
            variant={getActivePreset() === 'nudity-only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset('nudity-only')}
            className="text-xs"
          >
            Nudity Only
          </Button>
          <Button
            variant={getActivePreset() === 'everything' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset('everything')}
            className="text-xs"
          >
            Everything
          </Button>
          <Button
            variant={getActivePreset() === 'nothing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset('nothing')}
            className="text-xs"
          >
            Nothing
          </Button>
        </div>
      </div>

      {/* Detailed Settings Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Advanced Settings</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailedSettings(!showDetailedSettings)}
          className="h-8 w-8 p-0"
        >
          {showDetailedSettings ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Detailed Settings - Hidden by Default */}
      {showDetailedSettings && (
        <div className="space-y-4 border-t pt-4">
          {/* Face Detection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Face Detection</h4>
            <div className="space-y-2">
              {faceLabels.map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <Label htmlFor={label} className="text-xs">
                    {BLUR_RULE_LABELS[label]}
                  </Label>
                  <Switch
                    id={label}
                    checked={blurRules[label]}
                    onCheckedChange={(value) => handleRuleChange(label, value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Exposed Content */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Exposed Content</h4>
            <div className="space-y-2">
              {exposedLabels.map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <Label htmlFor={label} className="text-xs">
                    {BLUR_RULE_LABELS[label]}
                  </Label>
                  <Switch
                    id={label}
                    checked={blurRules[label]}
                    onCheckedChange={(value) => handleRuleChange(label, value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Covered Content */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Covered Content</h4>
            <div className="space-y-2">
              {coveredLabels.map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <Label htmlFor={label} className="text-xs">
                    {BLUR_RULE_LABELS[label]}
                  </Label>
                  <Switch
                    id={label}
                    checked={blurRules[label]}
                    onCheckedChange={(value) => handleRuleChange(label, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlurSettings;
