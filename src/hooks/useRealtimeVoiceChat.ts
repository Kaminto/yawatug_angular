import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioRecorder, AudioQueue, encodeAudioForAPI, playAudioData } from '@/utils/audioUtils';

export interface VoiceChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
}

export const useRealtimeVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudioContext();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to WebSocket relay
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host.replace('lovable.app', 'supabase.co')}/functions/v1/openai-realtime-relay`;
      
      console.log('🔌 Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to realtime voice chat');
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type);

          switch (data.type) {
            case 'response.audio.delta':
              // Handle audio streaming from AI
              if (audioContextRef.current && data.delta) {
                const binaryString = atob(data.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                await playAudioData(audioContextRef.current, bytes);
                setIsSpeaking(true);
              }
              break;

            case 'response.audio.done':
              setIsSpeaking(false);
              break;

            case 'response.audio_transcript.delta':
              // Handle text transcript from AI
              if (data.delta) {
                const messageId = `ai-${Date.now()}`;
                setMessages(prev => {
                  const existingIndex = prev.findIndex(m => m.id === messageId);
                  const newMessage: VoiceChatMessage = {
                    id: messageId,
                    type: 'assistant',
                    content: data.delta,
                    timestamp: new Date(),
                    isAudio: true
                  };
                  
                  if (existingIndex >= 0) {
                    // Update existing message
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      content: updated[existingIndex].content + data.delta
                    };
                    return updated;
                  } else {
                    return [...prev, newMessage];
                  }
                });
              }
              break;

            case 'input_audio_buffer.speech_started':
              console.log('🎤 Speech detected');
              setIsRecording(true);
              break;

            case 'input_audio_buffer.speech_stopped':
              console.log('🔇 Speech ended');
              setIsRecording(false);
              break;

            case 'conversation.item.input_audio_transcription.completed':
              // Handle user speech transcript
              if (data.transcript) {
                const messageId = `user-${Date.now()}`;
                setMessages(prev => [...prev, {
                  id: messageId,
                  type: 'user',
                  content: data.transcript,
                  timestamp: new Date(),
                  isAudio: true
                }]);
              }
              break;

            case 'error':
              console.error('❌ Realtime error:', data);
              setError(data.message || 'Connection error');
              break;

            default:
              console.log('📝 Other message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection failed');
        setIsConnected(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsRecording(false);
        setIsSpeaking(false);
        
        if (event.code !== 1000) {
          setError('Connection lost');
        }
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      setError('Failed to connect to voice chat');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
    }

    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    if (!audioContextRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot start recording: not connected');
      return;
    }

    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await recorderRef.current.start();
      setIsRecording(true);
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
    console.log('🔇 Recording stopped');
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send message: not connected');
      return;
    }

    const messageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: messageId,
      type: 'user',
      content: text,
      timestamp: new Date(),
      isAudio: false
    }]);

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    wsRef.current.send(JSON.stringify(event));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    isRecording, 
    isSpeaking,
    messages,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
    clearMessages
  };
};