import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTextToSpeechOptions {
  autoPlay?: boolean;
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Get mute preference from localStorage
    const saved = localStorage.getItem('yawatu-tts-muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = async () => {
        // Force voice loading on mobile devices
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          speechSynthesis.cancel(); // Cancel the silent speech
        }
        
        const availableVoices = speechSynthesis.getVoices();
        console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.voiceURI})`));
        setVoices(availableVoices);
        
        // Always load admin voice preference for all users
        if (availableVoices.length > 0) {
          await loadAdminVoicePreference(availableVoices);
        } else {
          // Retry loading voices after multiple delays for mobile browsers
          const retryLoadVoices = async (attempt: number = 1) => {
            const retryVoices = speechSynthesis.getVoices();
            console.log(`Voice loading attempt ${attempt}:`, retryVoices.length);
            
            if (retryVoices.length > 0) {
              setVoices(retryVoices);
              await loadAdminVoicePreference(retryVoices);
            } else if (attempt < 5) {
              // Try multiple times with increasing delays
              setTimeout(() => retryLoadVoices(attempt + 1), attempt * 500);
            } else {
              console.log('No voices available after multiple attempts');
            }
          };
          
          setTimeout(() => retryLoadVoices(), 100);
        }
      };

      // Load admin voice preference function
      const loadAdminVoicePreference = async (availableVoices: SpeechSynthesisVoice[]) => {
        try {
          const { data } = await supabase
            .from('admin_payment_settings')
            .select('setting_value')
            .eq('setting_name', 'systemVoiceId')
            .single();
          
          const adminVoiceId = data?.setting_value;
          console.log('Admin voice setting:', adminVoiceId);
          
          if (adminVoiceId) {
            // Try exact match first
            let adminVoice = availableVoices.find(v => v.voiceURI === adminVoiceId);
            
            // If exact match not found, try fallback matching by name
            if (!adminVoice) {
              console.log('Exact admin voice not found, trying fallback matching');
              adminVoice = findCompatibleVoice(availableVoices, adminVoiceId);
            }
            
            if (adminVoice) {
              console.log('Using admin voice:', adminVoice.name);
              setSelectedVoice(adminVoice);
            } else {
              console.log('Admin voice not available on this device, using best English alternative');
              setDefaultEnglishVoice(availableVoices);
            }
          } else {
            console.log('No admin voice setting found, using default English voice');
            setDefaultEnglishVoice(availableVoices);
          }
        } catch (error) {
          console.log('Error loading admin voice preference, using default English voice:', error);
          setDefaultEnglishVoice(availableVoices);
        }
      };

      // Function to find compatible voice when exact match fails (centralized)
      const findCompatibleVoice = (availableVoices: SpeechSynthesisVoice[], adminVoiceId: string) => {
        // Extract voice name patterns for fallback matching
        const voiceName = adminVoiceId.toLowerCase();
        
        // Priority fallback order for mobile-compatible female English voices
        const mobileCompatiblePatterns = [
          // Apple iOS voices
          'samantha', 'karen', 'moira', 'tessa', 'allison', 'susan', 'fiona', 'victoria',
          // Google Android voices  
          'google', 'jenny', 'nova', 'wavenet',
          // Samsung voices
          'samsung',
          // Chrome/System voices
          'aria', 'eva', 'hazel', 'zira',
          // AWS Polly voices (if available)
          'joanna', 'kendra', 'kimberly', 'salli', 'amy', 'emma', 'aditi', 'raveena',
          // Generic patterns
          'female', 'woman', 'enhanced', 'premium', 'natural'
        ];
        
        // Try to find a mobile-compatible voice that matches any of the patterns
        for (const pattern of mobileCompatiblePatterns) {
          const matchingVoice = availableVoices.find(voice => {
            const name = voice.name.toLowerCase();
            const uri = voice.voiceURI?.toLowerCase() || '';
            
            // Check if voice is mobile compatible
            const isMobileCompatible = 
              // Apple voices
              (name.includes('apple') || uri.includes('com.apple')) ||
              // Google voices
              (name.includes('google') || uri.includes('com.google')) ||
              // Samsung voices
              name.includes('samsung') ||
              // System voices (no Microsoft/Windows)
              (!name.includes('microsoft') && !name.includes('windows') && !name.includes('desktop')) ||
              // Chrome voices
              (name.includes('chrome') || uri.includes('chrome')) ||
              // WebKit voices
              (uri.includes('webkit') || name.includes('webkit'));
            
            return voice.lang.startsWith('en') && 
                   isMobileCompatible &&
                   name.includes(pattern);
          });
          
          if (matchingVoice) {
            console.log(`Found mobile-compatible voice using pattern "${pattern}":`, matchingVoice.name);
            return matchingVoice;
          }
        }
        
        // If no pattern match, find any mobile-compatible English voice
        return availableVoices.find(voice => {
          const name = voice.name.toLowerCase();
          const uri = voice.voiceURI?.toLowerCase() || '';
          
          return voice.lang.startsWith('en') && 
                 (!name.includes('microsoft') || !name.includes('online')) &&
                 (name.includes('apple') || 
                  name.includes('google') || 
                  name.includes('samsung') ||
                  uri.includes('com.apple') ||
                  uri.includes('com.google') ||
                  (!name.includes('microsoft') && !name.includes('windows')));
        });
      };

      // Set mobile-compatible English voice as fallback
      const setDefaultEnglishVoice = (availableVoices: SpeechSynthesisVoice[]) => {
        // Try to find mobile-compatible voices first
        const mobileVoice = availableVoices.find(voice => {
          const name = voice.name.toLowerCase();
          const uri = voice.voiceURI?.toLowerCase() || '';
          
          return voice.lang.startsWith('en') && 
                 (name.includes('apple') || 
                  name.includes('google') || 
                  name.includes('samsung') ||
                  uri.includes('com.apple') ||
                  uri.includes('com.google') ||
                  (!name.includes('microsoft') && !name.includes('windows') && name.includes('female')));
        });
        
        // Fallback to any English voice if no mobile-compatible found
        const fallbackVoice = mobileVoice || 
          availableVoices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Female')) || 
          availableVoices.find(voice => voice.lang.startsWith('en'));
        
        if (fallbackVoice) {
          setSelectedVoice(fallbackVoice);
        }
      };

      // Initial load
      loadVoices();
      
      // Listen for voice changes (important for mobile)
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Mobile-specific: Try loading voices on first user interaction
      const handleFirstInteraction = async () => {
        console.log('First interaction detected, reloading voices');
        await loadVoices();
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('mousedown', handleFirstInteraction);
      };
      
      // Listen for multiple interaction types
      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
      document.addEventListener('click', handleFirstInteraction, { once: true });
      document.addEventListener('mousedown', handleFirstInteraction, { once: true });

      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('mousedown', handleFirstInteraction);
      };
    }
  }, []);

  // Listen for admin voice changes globally
  useEffect(() => {
    const handleVoiceChange = async (event: CustomEvent) => {
      const { voiceURI } = event.detail;
      if (voiceURI && voices.length > 0) {
        let voice = voices.find(v => v.voiceURI === voiceURI);
        
        // If exact match not found, try compatibility fallback
        if (!voice) {
          voice = findCompatibleVoice(voices, voiceURI);
        }
        
        if (voice) {
          console.log('Global voice change detected:', voice.name);
          setSelectedVoice(voice);
        }
      }
    };

    // Function to find compatible voice when exact match fails
    const findCompatibleVoice = (availableVoices: SpeechSynthesisVoice[], adminVoiceId: string) => {
      const voiceName = adminVoiceId.toLowerCase();
      
      // Priority fallback order for female English voices
      const femaleVoicePatterns = [
        'imani', 'aria', 'zira', 'eva', 'samantha', 'karen', 'moira', 'tessa', 'female',
        'woman', 'enhanced', 'premium', 'natural'
      ];
      
      // Try to find a voice that matches any of the patterns
      for (const pattern of femaleVoicePatterns) {
        const matchingVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en') && 
          voice.name.toLowerCase().includes(pattern)
        );
        if (matchingVoice) {
          console.log(`Found compatible voice using pattern "${pattern}":`, matchingVoice.name);
          return matchingVoice;
        }
      }
      
      // If no pattern match, find any female-sounding English voice
      return availableVoices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('female') || 
         voice.name.toLowerCase().includes('woman'))
      );
    };

    window.addEventListener('admin-voice-changed', handleVoiceChange as EventListener);
    return () => {
      window.removeEventListener('admin-voice-changed', handleVoiceChange as EventListener);
    };
  }, [voices]);

  // Save mute preference to localStorage
  useEffect(() => {
    localStorage.setItem('yawatu-tts-muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const speak = (text: string) => {
    if (!isSupported || isMuted || !text.trim()) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    if (options.voice) utterance.voice = options.voice;
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;

    // Use selected voice or try to find a good English voice
    if (options.voice) {
      utterance.voice = options.voice;
    } else if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (voices.length > 0) {
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const pause = () => {
    speechSynthesis.pause();
  };

  const resume = () => {
    speechSynthesis.resume();
  };

  const toggleMute = () => {
    if (isSpeaking) {
      stop();
    }
    setIsMuted(!isMuted);
  };

  const setVoice = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    // Voice is now controlled by admin, no need to save to localStorage
  };

  const refreshVoiceSettings = async () => {
    try {
      const { data } = await supabase
        .from('admin_payment_settings')
        .select('setting_value')
        .eq('setting_name', 'systemVoiceId')
        .single();
      
      const adminVoiceId = data?.setting_value;
      if (adminVoiceId && voices.length > 0) {
        const adminVoice = voices.find(v => v.voiceURI === adminVoiceId);
        if (adminVoice) {
          setSelectedVoice(adminVoice);
        }
      }
    } catch (error) {
      console.log('No admin voice setting found, using default');
    }
  };

  return {
    speak,
    stop,
    pause,
    resume,
    toggleMute,
    setVoice,
    refreshVoiceSettings,
    isSpeaking,
    isMuted,
    isSupported,
    voices,
    selectedVoice
  };
};