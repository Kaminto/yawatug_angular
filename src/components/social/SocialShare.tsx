import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Facebook, Twitter, Linkedin, Instagram, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  className?: string;
}

const SocialShare: React.FC<SocialShareProps> = ({
  url = window.location.href,
  title = "Yawatu Minerals & Mining Ltd",
  description = "Invest in ethical gold mining with guaranteed returns",
  hashtags = ["YawatuMining", "GoldInvestment", "EthicalMining"],
  className = ""
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareData = {
    url,
    title,
    description,
    hashtags: hashtags.join(' ')
  };

  const socialPlatforms = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&quote=${encodeURIComponent(shareData.title + ' - ' + shareData.description)}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600',
      shareUrl: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title + ' - ' + shareData.description)}&hashtags=${encodeURIComponent(shareData.hashtags)}`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&summary=${encodeURIComponent(shareData.description)}`
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      shareUrl: '#', // Instagram doesn't support direct URL sharing
      note: 'Copy link to share on Instagram'
    }
  ];

  const handleShare = async (platform: typeof socialPlatforms[0]) => {
    if (platform.name === 'Instagram') {
      await copyToClipboard();
      toast({
        title: "Link Copied!",
        description: "Share this link on Instagram",
      });
      return;
    }

    // Check if Web Share API is supported and user is on mobile
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareData.url,
        });
        return;
      } catch (error) {
        // If sharing fails, fall back to opening URL
      }
    }

    // Open sharing URL in new window
    window.open(platform.shareUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareData.url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await copyToClipboard();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Share2 className="h-5 w-5" />
          Share with Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Native Share Button (Mobile) */}
        {navigator.share && (
          <Button
            onClick={handleNativeShare}
            className="w-full"
            variant="outline"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}

        {/* Social Platform Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {socialPlatforms.map((platform) => (
            <Button
              key={platform.name}
              onClick={() => handleShare(platform)}
              className={`${platform.color} text-white border-0`}
              variant="default"
            >
              <platform.icon className="h-4 w-4 mr-2" />
              {platform.name}
            </Button>
          ))}
        </div>

        {/* Copy Link Button */}
        <div className="pt-2 border-t">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="w-full"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Share Preview */}
        <div className="bg-muted p-3 rounded-lg text-sm">
          <div className="font-medium text-foreground mb-1">{shareData.title}</div>
          <div className="text-muted-foreground mb-2">{shareData.description}</div>
          <div className="text-xs text-muted-foreground truncate">{shareData.url}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialShare;