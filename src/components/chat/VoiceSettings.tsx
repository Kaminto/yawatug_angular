import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoiceSettings, VoiceQuality, VoiceProvider } from '@/hooks/useEnhancedTextToSpeech';
import { Volume2, Mic, Settings2, Crown } from 'lucide-react';

interface VoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: VoiceSettings;
  onUpdateSettings: (settings: Partial<VoiceSettings>) => void;
  availableVoices: string[];
  onTestVoice: (text: string) => void;
}

export const VoiceSettingsDialog: React.FC<VoiceSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
  availableVoices,
  onTestVoice
}) => {
  const testPhrase = "Hello! This is a test of the selected voice settings. How does this sound?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Voice Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Provider */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Voice Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings.provider === 'elevenlabs' ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                  onClick={() => onUpdateSettings({ provider: 'elevenlabs' })}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">ElevenLabs</span>
                    <Badge variant="secondary" className="text-xs">Premium</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ultra-realistic AI voices with emotion and natural speech patterns
                  </p>
                </div>

                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    settings.provider === 'browser' ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                  onClick={() => onUpdateSettings({ provider: 'browser' })}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="font-medium">Browser TTS</span>
                    <Badge variant="outline" className="text-xs">Standard</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Built-in browser speech synthesis (reliable fallback)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Quality */}
          {settings.provider === 'elevenlabs' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Voice Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      settings.quality === 'premium' ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}
                    onClick={() => onUpdateSettings({ quality: 'premium' })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Premium</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Highest quality, more expressive
                    </p>
                  </div>

                  <div 
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      settings.quality === 'standard' ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}
                    onClick={() => onUpdateSettings({ quality: 'standard' })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="h-4 w-4" />
                      <span className="font-medium">Standard</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fast generation, good quality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Selection */}
          <div className="space-y-3">
            <Label htmlFor="voice-select">Voice</Label>
            <Select 
              value={settings.voice} 
              onValueChange={(value) => onUpdateSettings({ voice: value })}
            >
              <SelectTrigger id="voice-select">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {voice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Speech Speed</Label>
              <span className="text-sm text-muted-foreground">{settings.speed}x</span>
            </div>
            <Slider
              value={[settings.speed]}
              onValueChange={([value]) => onUpdateSettings({ speed: value })}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Pitch Control (Browser TTS only) */}
          {settings.provider === 'browser' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pitch</Label>
                <span className="text-sm text-muted-foreground">{settings.pitch}</span>
              </div>
              <Slider
                value={[settings.pitch]}
                onValueChange={([value]) => onUpdateSettings({ pitch: value })}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
          )}

          {/* Test Voice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Voice Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => onTestVoice(testPhrase)}
                className="w-full"
                variant="outline"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Test Current Voice Settings
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-speak AI responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically speak AI responses in chat
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Voice interruption</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow interrupting AI speech with voice input
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Noise suppression</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce background noise in recordings
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};