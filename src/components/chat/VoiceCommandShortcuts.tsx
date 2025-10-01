import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Keyboard, 
  Mic, 
  Volume2, 
  Settings,
  Zap,
  MessageCircle,
  Phone,
  PhoneOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCommandShortcutsProps {
  onVoiceCommand: (command: string) => void;
  isVoiceConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const VoiceCommandShortcuts: React.FC<VoiceCommandShortcutsProps> = ({
  onVoiceCommand,
  isVoiceConnected,
  onConnect,
  onDisconnect
}) => {
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  const shortcuts = [
    { key: 'Space', action: 'Push to Talk', icon: Mic, command: 'start_recording' },
    { key: 'Ctrl+Enter', action: 'Send Message', icon: MessageCircle, command: 'send_message' },
    { key: 'Escape', action: 'Stop Audio', icon: Volume2, command: 'stop_audio' },
    { key: 'Ctrl+K', action: 'Voice Settings', icon: Settings, command: 'open_settings' },
    { key: 'Ctrl+R', action: 'Toggle Voice Chat', icon: isVoiceConnected ? PhoneOff : Phone, command: 'toggle_voice' },
  ];

  const quickCommands = [
    { label: 'Check Balance', command: 'show my wallet balance' },
    { label: 'Share Prices', command: 'what are current share prices' },
    { label: 'Recent Transactions', command: 'show my recent transactions' },
    { label: 'Help', command: 'how can you help me' },
  ];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const { key, ctrlKey, metaKey } = e;
      const modifier = ctrlKey || metaKey;

      // Handle keyboard shortcuts
      if (key === ' ' && !modifier) {
        e.preventDefault();
        setActiveShortcut('start_recording');
        onVoiceCommand('start_recording');
      } else if (key === 'Enter' && modifier) {
        e.preventDefault();
        setActiveShortcut('send_message');
        onVoiceCommand('send_message');
      } else if (key === 'Escape') {
        e.preventDefault();
        setActiveShortcut('stop_audio');
        onVoiceCommand('stop_audio');
      } else if (key === 'k' && modifier) {
        e.preventDefault();
        setActiveShortcut('open_settings');
        onVoiceCommand('open_settings');
      } else if (key === 'r' && modifier) {
        e.preventDefault();
        setActiveShortcut('toggle_voice');
        if (isVoiceConnected) {
          onDisconnect();
        } else {
          onConnect();
        }
      }

      // Clear active shortcut after animation
      if (activeShortcut) {
        setTimeout(() => setActiveShortcut(null), 200);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onVoiceCommand, isVoiceConnected, onConnect, onDisconnect, activeShortcut]);

  return (
    <div className="space-y-4">
      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            const isActive = activeShortcut === shortcut.command;
            
            return (
              <div 
                key={shortcut.key}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg transition-all",
                  isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "h-3 w-3",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-xs">{shortcut.action}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {shortcut.key}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Voice Commands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Quick Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd.label}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8"
              onClick={() => onVoiceCommand(cmd.command)}
            >
              <Mic className="h-3 w-3 mr-2" />
              {cmd.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};