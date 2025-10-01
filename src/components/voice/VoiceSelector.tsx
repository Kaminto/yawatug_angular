import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Volume2 } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { supabase } from '@/integrations/supabase/client';

interface VoiceSelectorProps {
  onVoiceChange?: (voice: SpeechSynthesisVoice | null) => void;
  className?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  onVoiceChange, 
  className = '' 
}) => {
  const { 
    voices, 
    speak, 
    stop, 
    isSpeaking,
    selectedVoice,
    setVoice
  } = useTextToSpeech();
  
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');

  // Load admin voice preferences on mount
  useEffect(() => {
    const loadAdminVoiceSettings = async () => {
      try {
        const { data: voiceSettings } = await supabase
          .from('admin_payment_settings')
          .select('setting_name, setting_value')
          .in('setting_name', ['systemVoiceId'])
          .order('setting_name');

        if (voiceSettings && voiceSettings.length > 0) {
          const voiceId = voiceSettings.find(s => s.setting_name === 'systemVoiceId')?.setting_value;
          
          if (voiceId && voices.length > 0) {
            setSelectedVoiceId(voiceId);
            const voice = voices.find(v => v.voiceURI === voiceId);
            if (voice) {
              setVoice(voice);
            }
          }
        }
      } catch (error) {
        console.log('Error loading admin voice settings:', error);
      }
    };

    if (voices.length > 0) {
      loadAdminVoiceSettings();
    }
  }, [voices, setVoice]);

  // Check if voice is mobile-compatible
  const isMobileCompatible = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    const uri = voice.voiceURI?.toLowerCase() || '';
    
    // Microsoft Online voices don't work on mobile
    if (name.includes('microsoft') && name.includes('online')) return false;
    
    // These are known mobile-compatible voice patterns:
    // iOS native voices
    if (name.includes('apple') || uri.includes('com.apple')) return true;
    
    // Android native voices  
    if (name.includes('google') || uri.includes('com.google')) return true;
    
    // Chrome/Chromium built-in voices (work on mobile Chrome)
    if (name.includes('chrome') || uri.includes('chrome')) return true;
    
    // Samsung voices (work on Samsung devices)
    if (name.includes('samsung')) return true;
    
    // Generic system voices (usually mobile-compatible)
    if (name.includes('default') || name.includes('system')) return true;
    
    // Voices without vendor prefixes are usually system voices
    if (!name.includes('microsoft') && 
        !name.includes('windows') && 
        !name.includes('desktop') &&
        !name.includes('cortana')) return true;
    
    // Espeak voices (open source, work on many platforms)
    if (name.includes('espeak') || uri.includes('espeak')) return true;
    
    // WebKit voices (Safari mobile)
    if (uri.includes('webkit') || name.includes('webkit')) return true;
    
    return false;
  };

  // Filter to English voices and sort by mobile compatibility and quality
  const filteredAndSortedVoices = voices
    .filter(voice => voice.lang.startsWith('en'))
    .sort((a, b) => {
      // First priority: mobile compatibility
      const aMobile = isMobileCompatible(a);
      const bMobile = isMobileCompatible(b);
      if (aMobile && !bMobile) return -1;
      if (!aMobile && bMobile) return 1;

      // Second priority: female voices
      const aFemale = a.name.toLowerCase().includes('female') || 
                     a.name.toLowerCase().includes('woman') ||
                     ['zira', 'eva', 'aria', 'samantha', 'karen', 'moira', 'tessa', 'allison', 'susan',
                      'jenny', 'hazel', 'nova', 'emma', 'joanna', 'kendra', 'kimberly', 'salli',
                      'amy', 'aditi', 'raveena'].some(name => 
                       a.name.toLowerCase().includes(name));
      const bFemale = b.name.toLowerCase().includes('female') || 
                     b.name.toLowerCase().includes('woman') ||
                     ['zira', 'eva', 'aria', 'samantha', 'karen', 'moira', 'tessa', 'allison', 'susan',
                      'jenny', 'hazel', 'nova', 'emma', 'joanna', 'kendra', 'kimberly', 'salli',
                      'amy', 'aditi', 'raveena'].some(name => 
                       b.name.toLowerCase().includes(name));
      
      if (aFemale && !bFemale) return -1;
      if (!aFemale && bFemale) return 1;
      
      return a.name.localeCompare(b.name);
    });

  const handleVoiceChange = async (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    
    const voice = voices.find(v => v.voiceURI === voiceId);
    if (voice) {
      setVoice(voice);
      onVoiceChange?.(voice);
      
      // Save to admin settings
      try {
        await supabase
          .from('admin_payment_settings')
          .upsert({
            setting_name: 'systemVoiceId',
            setting_value: voiceId,
            description: 'System-wide voice selection for TTS'
          });

        // Dispatch global voice change event
        window.dispatchEvent(new CustomEvent('admin-voice-changed', {
          detail: { voiceURI: voiceId }
        }));
      } catch (error) {
        console.error('Error saving voice setting:', error);
      }
    }
  };

  const handlePreview = () => {
    if (isSpeaking) {
      stop();
    } else {
      const previewText = "Hello! This is how I sound. I will guide you through the Yawatu platform.";
      speak(previewText);
    }
  };

  const getVoiceDisplayName = (voice: SpeechSynthesisVoice) => {
    let name = voice.name;
    
    // Clean up common voice names
    name = name.replace(/Microsoft\s+/i, '');
    name = name.replace(/\s+\(.*?\)/, ''); // Remove parenthetical info
    name = name.replace(/\s+Desktop/, '');
    
    // Add mobile compatibility indicator
    const mobileIcon = isMobileCompatible(voice) ? '✓ ' : '';
    
    return `${mobileIcon}${name} (${voice.lang})`;
  };

  if (voices.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-sm text-muted-foreground">
            Loading voices...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Selection
        </CardTitle>
        <CardDescription>
          Choose a voice for system announcements and guidance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Voice</label>
          <Select value={selectedVoiceId} onValueChange={handleVoiceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a voice..." />
            </SelectTrigger>
            <SelectContent>
              {filteredAndSortedVoices.map((voice) => (
                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                  {getVoiceDisplayName(voice)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="flex items-center gap-2"
          >
            {isSpeaking ? (
              <>
                <Square className="h-4 w-4" />
                Stop Preview
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Preview Voice
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>✓ = Mobile-optimized voice</p>
          <p>Voices marked with ✓ work better on mobile devices and provide consistent playback across platforms.</p>
        </div>
      </CardContent>
    </Card>
  );
};