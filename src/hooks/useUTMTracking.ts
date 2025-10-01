import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
}

interface TrackingData extends UTMParams {
  timestamp: string;
  page_url: string;
  user_agent: string;
}

export const useUTMTracking = () => {
  const [searchParams] = useSearchParams();
  const [utmParams, setUtmParams] = useState<UTMParams>({});
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  useEffect(() => {
    // Extract UTM parameters from URL
    const params: UTMParams = {
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
      ref: searchParams.get('ref') || undefined,
    };

    // Filter out undefined values
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    );

    setUtmParams(filteredParams);

    // Create comprehensive tracking data
    if (Object.keys(filteredParams).length > 0) {
      const tracking: TrackingData = {
        ...filteredParams,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      };

      setTrackingData(tracking);

      // Store in localStorage for session persistence
      localStorage.setItem('utm_tracking', JSON.stringify(tracking));
      localStorage.setItem('utm_params', JSON.stringify(filteredParams));
    } else {
      // Try to get existing UTM data from localStorage
      const existingUTM = localStorage.getItem('utm_params');
      if (existingUTM) {
        try {
          setUtmParams(JSON.parse(existingUTM));
        } catch (e) {
          console.error('Error parsing stored UTM params:', e);
        }
      }
    }
  }, [searchParams]);

  // Function to get tracking data for analytics
  const getTrackingData = (): TrackingData | null => {
    if (trackingData) return trackingData;
    
    try {
      const stored = localStorage.getItem('utm_tracking');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error parsing stored tracking data:', e);
      return null;
    }
  };

  // Function to check if traffic is from Facebook
  const isFromFacebook = (): boolean => {
    return utmParams.utm_source === 'facebook' || 
           utmParams.utm_source === 'fb' ||
           document.referrer.includes('facebook.com');
  };

  // Function to check if this is social media traffic
  const isFromSocialMedia = (): boolean => {
    const socialSources = ['facebook', 'fb', 'instagram', 'twitter', 'linkedin', 'whatsapp'];
    return socialSources.some(source => 
      utmParams.utm_source?.toLowerCase().includes(source) ||
      utmParams.utm_medium?.toLowerCase().includes(source)
    );
  };

  // Function to get referral code
  const getReferralCode = (): string | undefined => {
    return utmParams.ref;
  };

  // Function to clear tracking data
  const clearTrackingData = () => {
    localStorage.removeItem('utm_tracking');
    localStorage.removeItem('utm_params');
    setUtmParams({});
    setTrackingData(null);
  };

  // Function to manually capture UTM params
  const captureUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    const newUTMParams: UTMParams = {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      ref: params.get('ref') || undefined,
    };
    
    // Filter out undefined values
    const filteredParams = Object.fromEntries(
      Object.entries(newUTMParams).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredParams).length > 0) {
      setUtmParams(filteredParams);
      localStorage.setItem('utm_params', JSON.stringify(filteredParams));
    }
  };

  return {
    utmParams,
    trackingData,
    getTrackingData,
    isFromFacebook,
    isFromSocialMedia,
    getReferralCode,
    clearTrackingData,
    captureUTMParams,
  };
};