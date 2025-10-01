import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Share2, Facebook, Twitter, Linkedin, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SocialShareWidgetProps {
  className?: string;
  compact?: boolean;
}

const SocialShareWidget: React.FC<SocialShareWidgetProps> = ({ 
  className = "", 
  compact = false 
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareData = {
    url: window.location.href,
    title: "Yawatu Minerals & Mining Ltd",
    description: "Invest in ethical gold mining with guaranteed returns and transparent operations."
  };

  const socialPlatforms = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:text-blue-700',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-sky-500 hover:text-sky-600',
      shareUrl: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title + ' - ' + shareData.description)}`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'text-blue-700 hover:text-blue-800',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`
    }
  ];

  const handleShare = (platform: typeof socialPlatforms[0]) => {
    window.open(platform.shareUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link Copied!",
        description: "Page URL copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm font-medium text-muted-foreground">Share:</span>
        {socialPlatforms.map((platform) => (
          <Button
            key={platform.name}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${platform.color}`}
            onClick={() => handleShare(platform)}
          >
            <platform.icon className="h-4 w-4" />
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Share this page</span>
          </div>
          
          <div className="flex items-center gap-1">
            {socialPlatforms.map((platform) => (
              <Button
                key={platform.name}
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${platform.color}`}
                onClick={() => handleShare(platform)}
                title={`Share on ${platform.name}`}
              >
                <platform.icon className="h-4 w-4" />
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyToClipboard}
              title="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialShareWidget;