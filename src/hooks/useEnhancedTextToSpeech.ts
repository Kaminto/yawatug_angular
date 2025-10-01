import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VoiceQuality = 'standard' | 'premium';
export type VoiceProvider = 'browser' | 'elevenlabs';

export interface VoiceSettings {
  provider: VoiceProvider;
  quality: VoiceQuality;
  voice: string;
  speed: number;
  pitch: number;
}

const ELEVENLABS_VOICES = {
  'Aria': '9BWtsMINqrJLrRacOk9x',
  'Roger': 'CwhRBWXzGAHq8TQ4Fs17',
  'Sarah': 'EXAVITQu4vr4xnSDxMaL', 
  'Laura': 'FGY2WhTYpPnrIDTdsKH5',
  'Charlie': 'IKne3meq5aSn9XLyUdCD',
  'George': 'JBFqnCBsd6RMkjVDRZzb',
  'Callum': 'N2lVS1w4EtoT3dr4eOWO',
  'River': 'SAz9YHcvj6GT2YYXdXww',
  'Liam': 'TX3LPaxmHKxFdv7VOQHJ',
  'Charlotte': 'XB0fDUnXU5powFXDhCwa'
};

export const useEnhancedTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>({
    provider: 'elevenlabs',
    quality: 'premium',
    voice: 'Aria',
    speed: 0.95,
    pitch: 1.0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);

  const speak = useCallback(async (text: string, customSettings?: Partial<VoiceSettings>) => {
    if (!text.trim()) return;

    const activeSettings = { ...settings, ...customSettings };
    
    // Add to queue if already playing
    if (isPlaying) {
      audioQueueRef.current.push(text);
      return;
    }

    try {
      setIsPlaying(true);

      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      if (activeSettings.provider === 'elevenlabs') {
        // Use ElevenLabs for premium quality
        const { data, error } = await supabase.functions.invoke('text-to-speech-elevenlabs', {
          body: {
            text,
            voice_id: ELEVENLABS_VOICES[activeSettings.voice as keyof typeof ELEVENLABS_VOICES] || ELEVENLABS_VOICES.Aria,
            model: activeSettings.quality === 'premium' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
            quality: activeSettings.quality
          }
        });

        if (error) {
          console.warn('ElevenLabs failed, falling back to browser TTS:', error);
          await speakWithBrowserTTS(text, activeSettings);
          return;
        }

        if (data?.audioContent) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
            { type: 'audio/mpeg' }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const audio = new Audio(audioUrl);
          audio.playbackRate = activeSettings.speed;
          audio.volume = 0.9;
          
          audio.onended = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
            
            // Play next in queue if any
            if (audioQueueRef.current.length > 0) {
              const nextText = audioQueueRef.current.shift();
              if (nextText) {
                setTimeout(() => speak(nextText, customSettings), 300);
              }
            }
          };

          audio.onerror = () => {
            console.warn('Audio playback failed, falling back to browser TTS');
            setIsPlaying(false);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
            speakWithBrowserTTS(text, activeSettings);
          };

          setCurrentAudio(audio);
          await audio.play();
        }
      } else {
        // Use browser TTS
        await speakWithBrowserTTS(text, activeSettings);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setIsPlaying(false);
      // Fallback to browser TTS
      await speakWithBrowserTTS(text, activeSettings);
    }
  }, [settings, currentAudio, isPlaying]);

  const speakWithBrowserTTS = useCallback(async (text: string, activeSettings: VoiceSettings) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Find a suitable voice
    const preferredVoice = voices.find(voice => 
      voice.name.toLowerCase().includes(activeSettings.voice.toLowerCase()) ||
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('male')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = activeSettings.speed;
    utterance.pitch = activeSettings.pitch;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    // Clear queue
    audioQueueRef.current = [];
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
  }, [currentAudio]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    settings,
    updateSettings,
    availableVoices: Object.keys(ELEVENLABS_VOICES)
  };
};