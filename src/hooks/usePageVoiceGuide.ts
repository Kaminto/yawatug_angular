import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTextToSpeech } from './useTextToSpeech';
import { pageWelcomeMessages } from '@/data/chatbotKnowledge';

interface PageVoiceGuideProps {
  onVoiceComplete?: () => void;
}

export const usePageVoiceGuide = (props?: PageVoiceGuideProps) => {
  const location = useLocation();
  const { speak, isSpeaking, isMuted, toggleMute } = useTextToSpeech({
    autoPlay: true,
    rate: 0.9,
    pitch: 1,
    volume: 0.8
  });
  
  const lastReadPageRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Extract page name from pathname
    const currentPage = location.pathname.split('/').pop() || 'home';
    const normalizedPage = currentPage === '' ? 'home' : currentPage;
    
    // Only read if this is a different page than the last one read
    if (lastReadPageRef.current === normalizedPage) {
      return;
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Get the welcome message for this page
    const welcomeMessage = pageWelcomeMessages[normalizedPage as keyof typeof pageWelcomeMessages] 
                          || pageWelcomeMessages.home;

    // Set the last read page immediately to prevent duplicates
    lastReadPageRef.current = normalizedPage;

    // Small delay to ensure page has loaded before speaking
    timeoutRef.current = setTimeout(() => {
      if (welcomeMessage && !isMuted) {
        speak(welcomeMessage);
        // Call onVoiceComplete after speech ends (estimate based on text length)
        if (props?.onVoiceComplete) {
          const estimatedDuration = welcomeMessage.length * 80; // ~80ms per character
          setTimeout(props.onVoiceComplete, estimatedDuration);
        }
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]); // Only depend on pathname, not speak function

  return {
    isSpeaking,
    isMuted,
    toggleMute,
    speak
  };
};