import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Volume2, 
  VolumeX,
  Settings,
  Bot,
  User,
  Zap,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioVisualizer } from './AudioVisualizer';
import { VoiceCommandShortcuts } from './VoiceCommandShortcuts';

interface VoiceControlsProps {
  // Real-time voice chat controls
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  
  // TTS controls
  isTTSPlaying: boolean;
  onStopTTS: () => void;
  
  // Settings
  onOpenSettings: () => void;
  
  // Voice activity indicators
  voiceLevel?: number;
  error?: string | null;

  // Voice command handler
  onVoiceCommand?: (command: string) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isConnected,
  isRecording,
  isSpeaking,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  isTTSPlaying,
  onStopTTS,
  onOpenSettings,
  voiceLevel = 0,
  error,
  onVoiceCommand
}) => {
  const connectionQuality = isConnected ? 'excellent' : 'disconnected';
  
  const handleVoiceCommand = (command: string) => {
    if (onVoiceCommand) {
      onVoiceCommand(command);
    }
    
    // Handle built-in commands
    switch (command) {
      case 'start_recording':
        if (isConnected) onStartRecording();
        break;
      case 'stop_audio':
        if (isTTSPlaying) onStopTTS();
        break;
      case 'open_settings':
        onOpenSettings();
        break;
    }
  };
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Voice Assistant
          {isConnected && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status & Controls */}
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button onClick={onConnect} className="flex-1" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Connect Voice Chat
            </Button>
          ) : (
            <Button onClick={onDisconnect} variant="destructive" className="flex-1" size="sm">
              <PhoneOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Quality Indicator */}
        {isConnected && (
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Connection:</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {connectionQuality}
            </Badge>
          </div>
        )}

        {/* Voice Activity Indicators */}
        {isConnected && (
          <div className="space-y-3">
            {/* Recording Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={cn(
                  "flex-1",
                  isRecording && "animate-pulse"
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>

              {/* TTS Stop Button */}
              {isTTSPlaying && (
                <Button variant="outline" size="sm" onClick={onStopTTS}>
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                isRecording ? "bg-red-50 border-red-200 text-red-700" : "bg-muted"
              )}>
                <User className="h-4 w-4" />
                <span>You: {isRecording ? "Speaking..." : "Silent"}</span>
              </div>
              
              <div className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                isSpeaking ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-muted"
              )}>
                <Bot className="h-4 w-4" />
                <span>AI: {isSpeaking ? "Speaking..." : "Listening"}</span>
              </div>
            </div>

            {/* Advanced Audio Visualizer */}
            <AudioVisualizer
              isActive={isRecording || isSpeaking}
              type={isRecording ? 'recording' : isSpeaking ? 'speaking' : 'idle'}
              className="mt-3"
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Voice Commands & Shortcuts */}
        {onVoiceCommand && (
          <VoiceCommandShortcuts
            onVoiceCommand={handleVoiceCommand}
            isVoiceConnected={isConnected}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Click "Connect Voice Chat" for real-time conversation</p>
          <p>• Use "Start Recording" for voice input</p>
          <p>• AI responses are spoken automatically</p>
          <p>• Press Space for push-to-talk (when connected)</p>
        </div>
      </CardContent>
    </Card>
  );
};