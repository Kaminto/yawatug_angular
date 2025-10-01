import { useState, useEffect, useCallback } from 'react';

// Settings coordination hook to manage cross-tab updates
export const useSettingsCoordination = () => {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [updateSource, setUpdateSource] = useState<string>('');

  const triggerUpdate = useCallback((source: string) => {
    console.log(`🔄 Settings update triggered by: ${source}`);
    setLastUpdate(Date.now());
    setUpdateSource(source);
  }, []);

  // Custom event for cross-component communication
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      triggerUpdate(event.detail.source);
    };

    window.addEventListener('settingsUpdate' as any, handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdate' as any, handleSettingsUpdate);
  }, [triggerUpdate]);

  const notifySettingsUpdate = useCallback((source: string) => {
    const event = new CustomEvent('settingsUpdate', { detail: { source } });
    window.dispatchEvent(event);
  }, []);

  return {
    lastUpdate,
    updateSource,
    triggerUpdate,
    notifySettingsUpdate
  };
};