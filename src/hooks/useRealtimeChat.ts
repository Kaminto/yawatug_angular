import { useState, useEffect, useRef } from 'react';
import { AudioRecorder, encodeAudioForAPI } from '@/components/admin/ai/AudioRecorder';
import { playAudioData, clearAudioQueue } from '@/components/admin/ai/AudioQueue';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
}

interface UseRealtimeChatReturn {
  messages: Message[];
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useRealtimeChat = (): UseRealtimeChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const currentMessageIdRef = useRef<string>('');

  const setupWebSocket = () => {
    const ws = new WebSocket(`wss://lqmcokwbqnjuufcvodos.functions.supabase.co/realtime-chat`);
    
    ws.onopen = () => {
      console.log("✅ WebSocket connected to AI assistant");
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 Received message type:", data.type);

        switch (data.type) {
          case 'response.audio.delta':
            if (data.delta) {
              // Convert base64 to Uint8Array
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              if (audioContextRef.current) {
                await playAudioData(audioContextRef.current, bytes);
                setIsPlaying(true);
              }
            }
            break;

          case 'response.audio_transcript.delta':
            if (data.delta) {
              currentTranscriptRef.current += data.delta;
              
              // Update or create message
              if (currentMessageIdRef.current) {
                setMessages(prev => prev.map(msg => 
                  msg.id === currentMessageIdRef.current 
                    ? { ...msg, content: currentTranscriptRef.current }
                    : msg
                ));
              } else {
                currentMessageIdRef.current = `msg-${Date.now()}`;
                const newMessage: Message = {
                  id: currentMessageIdRef.current,
                  type: 'assistant',
                  content: currentTranscriptRef.current,
                  timestamp: new Date(),
                  isAudio: true
                };
                setMessages(prev => [...prev, newMessage]);
              }
            }
            break;

          case 'response.audio_transcript.done':
            console.log("✅ Audio transcript complete:", currentTranscriptRef.current);
            currentTranscriptRef.current = '';
            currentMessageIdRef.current = '';
            break;

          case 'response.audio.done':
            console.log("✅ Audio playback complete");
            setIsPlaying(false);
            break;

          case 'input_audio_buffer.speech_started':
            console.log("🗣️ Speech started");
            clearAudioQueue();
            break;

          case 'input_audio_buffer.speech_stopped':
            console.log("🤐 Speech stopped");
            break;

          case 'response.created':
            console.log("🎯 AI response started");
            break;

          case 'response.done':
            console.log("✅ AI response complete");
            break;

          case 'error':
            console.error("❌ WebSocket error:", data.message);
            break;

          default:
            console.log("📎 Other message type:", data.type);
        }
      } catch (error) {
        console.error("❌ Error processing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket closed");
      setIsConnected(false);
    };

    return ws;
  };

  const connect = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      wsRef.current = setupWebSocket();
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setIsPlaying(false);
  };

  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not connected");
      return;
    }

    try {
      audioRecorderRef.current = new AudioRecorder((audioData: Float32Array) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          const audioEvent = {
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          };
          wsRef.current.send(JSON.stringify(audioEvent));
        }
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      console.log("🛑 Recording stopped");
    }
  };

  const sendTextMessage = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not connected");
      return;
    }

    // Add user message to UI
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user', 
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to OpenAI
    const textEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };

    wsRef.current.send(JSON.stringify(textEvent));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    messages,
    isConnected,
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    sendTextMessage,
    connect,
    disconnect
  };
};