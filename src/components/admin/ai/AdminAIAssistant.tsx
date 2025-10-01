import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX,
  MessageSquare,
  Zap,
  Phone,
  PhoneOff,
  Settings
} from 'lucide-react';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { cn } from '@/lib/utils';

export const AdminAIAssistant: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isConnected,
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    sendTextMessage,
    connect,
    disconnect
  } = useRealtimeChat();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendText = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickActions = [
    { label: 'System Overview', action: () => sendTextMessage('Give me a system overview') },
    { label: 'Pending Approvals', action: () => sendTextMessage('Show me pending approvals') },
    { label: 'User Statistics', action: () => sendTextMessage('What are the current user statistics?') },
    { label: 'Transaction Summary', action: () => sendTextMessage('Give me today\'s transaction summary') }
  ];

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            setIsExpanded(true);
            if (!isConnected) connect();
          }}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] max-h-[80vh]">
      <Card className="h-full shadow-2xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              YawaTug AI Assistant
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                ×
              </Button>
            </div>
          </div>

          {showSettings && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant={isConnected ? 'destructive' : 'default'}
                size="sm"
                onClick={isConnected ? disconnect : connect}
                className="flex items-center gap-1"
              >
                {isConnected ? <PhoneOff className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
              
              {isPlaying && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  Playing
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-col h-full p-4 pt-0">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.action}
                disabled={!isConnected}
                className="text-xs h-8"
              >
                <Zap className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 mb-4" ref={scrollAreaRef}>
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Hi! I'm your AI assistant. I can help you with:
                  </p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>• Transaction approvals</li>
                    <li>• User management</li>
                    <li>• System analytics</li>
                    <li>• Administrative tasks</li>
                  </ul>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-lg",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground ml-8" 
                      : "bg-muted mr-8"
                  )}
                >
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="h-6 w-6 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">U</span>
                      </div>
                    ) : (
                      <Bot className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.type === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.isAudio && (
                        <Badge variant="outline" className="text-xs">
                          <Volume2 className="h-2 w-2 mr-1" />
                          Audio
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                onClick={handleSendText}
                disabled={!isConnected || !textInput.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                className="flex items-center gap-1"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Hold to Talk
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isConnected && (
                  <Badge variant="outline" className="text-xs">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};