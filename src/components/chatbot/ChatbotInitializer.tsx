import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { yawutuKnowledgeBase, pageWelcomeMessages, pageQuickActions } from '@/data/chatbotKnowledge';

// Initialize chatbot knowledge base in Supabase
export const ChatbotInitializer: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const initializeChatbotKnowledge = async () => {
      try {
        // Check if knowledge base exists
        const { data: existingData } = await supabase
          .from('chatbot_knowledge')
          .select('id')
          .limit(1);

        // If empty, populate with comprehensive knowledge base
        if (!existingData || existingData.length === 0) {
          const knowledgeEntries = yawutuKnowledgeBase.map(entry => ({
            question: entry.question,
            answer: entry.answer,
            category: entry.category,
            keywords: entry.keywords,
            metadata: {
              page_context: entry.page_context || [],
              follow_up_questions: entry.follow_up_questions || [],
              quick_actions: entry.quick_actions || []
            },
            is_active: true
          }));

          const { error } = await supabase
            .from('chatbot_knowledge')
            .insert(knowledgeEntries);

          if (error) {
            console.error('Error initializing chatbot knowledge:', error);
          } else {
            console.log('Chatbot knowledge base initialized successfully');
          }
        }
      } catch (error) {
        console.error('Error checking/initializing chatbot knowledge:', error);
      }
    };

    initializeChatbotKnowledge();
  }, []);

  return null; // This component doesn't render anything
};

// Hook to get page-specific chatbot context
export const useChatbotPageContext = () => {
  const location = useLocation();
  const currentPage = location.pathname.split('/').pop() || 'home';
  
  const getPageWelcome = () => {
    return pageWelcomeMessages[currentPage as keyof typeof pageWelcomeMessages] 
           || pageWelcomeMessages.home;
  };

  const getPageActions = () => {
    return pageQuickActions[currentPage as keyof typeof pageQuickActions] 
           || pageQuickActions.home;
  };

  const getRelevantKnowledge = () => {
    return yawutuKnowledgeBase.filter(entry => 
      entry.page_context?.includes(currentPage) || 
      entry.page_context?.includes('all')
    );
  };

  return {
    currentPage,
    welcomeMessage: getPageWelcome(),
    quickActions: getPageActions(),
    relevantKnowledge: getRelevantKnowledge()
  };
};

export default ChatbotInitializer;