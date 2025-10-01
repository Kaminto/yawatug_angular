import { useState, useEffect } from 'react';

export const useFirstTimeVisitor = () => {
  const [isFirstTimeVisitor, setIsFirstTimeVisitor] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('yawatu_visited');
    const hasSeenWelcomeMsg = localStorage.getItem('yawatu_welcome_seen');
    
    if (!hasVisited) {
      setIsFirstTimeVisitor(true);
      localStorage.setItem('yawatu_visited', 'true');
    }
    
    if (!hasSeenWelcomeMsg) {
      setHasSeenWelcome(false);
    } else {
      setHasSeenWelcome(true);
    }
  }, []);

  const markWelcomeSeen = () => {
    localStorage.setItem('yawatu_welcome_seen', 'true');
    setHasSeenWelcome(true);
  };

  const getVisitorContext = () => {
    return {
      isFirstTime: isFirstTimeVisitor,
      hasSeenWelcome,
      sessionStart: new Date().toISOString()
    };
  };

  return {
    isFirstTimeVisitor,
    hasSeenWelcome,
    markWelcomeSeen,
    getVisitorContext
  };
};