import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { BlurRules, BLUR_RULE_LABELS } from '../types/safevision';

interface BlurSettingsProps {
  blurRules: BlurRules;
  onRulesChange: (rules: BlurRules) => void;
}

const BlurSettings: React.FC<BlurSettingsProps> = ({ blurRules, onRulesChange }) => {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Blur Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Quick Presets</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('faces-only')}
            >
              Faces Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('nudity-only')}
            >
              Nudity Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('everything')}
            >
              Everything
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('nothing')}
            >
              Nothing
            </Button>
          </div>
        </div>

        {/* Face Detection */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Face Detection</h4>
          <div className="space-y-2">
            {faceLabels.map((label) => (
              <div key={label} className="flex items-center justify-between">
                <Label htmlFor={label} className="text-sm">
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
                <Label htmlFor={label} className="text-sm">
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
                <Label htmlFor={label} className="text-sm">
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
      </CardContent>
    </Card>
  );
};

export default BlurSettings;
