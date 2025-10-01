import { useState, useEffect, useCallback } from 'react';

export interface AudioQualityMetrics {
  connectionSpeed: 'fast' | 'medium' | 'slow';
  noiseLevel: number;
  echoCancellation: boolean;
  adaptiveQuality: boolean;
}

export interface AudioSettings {
  sampleRate: number;
  bitRate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  bufferSize: number;
}

export const useAudioOptimization = () => {
  const [metrics, setMetrics] = useState<AudioQualityMetrics>({
    connectionSpeed: 'medium',
    noiseLevel: 0,
    echoCancellation: true,
    adaptiveQuality: true
  });

  const [optimizedSettings, setOptimizedSettings] = useState<AudioSettings>({
    sampleRate: 24000,
    bitRate: 128,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    bufferSize: 4096
  });

  // Monitor connection quality
  const measureConnectionSpeed = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      // Test connection with a small request
      const response = await fetch('/api/ping', { method: 'HEAD' });
      const latency = Date.now() - startTime;
      
      if (latency < 100) {
        return 'fast';
      } else if (latency < 300) {
        return 'medium';
      } else {
        return 'slow';
      }
    } catch {
      return 'slow';
    }
  }, []);

  // Analyze audio environment
  const analyzeAudioEnvironment = useCallback(async (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Sample audio for noise analysis
      const samples: number[] = [];
      const sampleCount = 10;
      
      for (let i = 0; i < sampleCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        samples.push(average);
      }
      
      const averageNoise = samples.reduce((a, b) => a + b) / samples.length;
      const noiseLevel = averageNoise / 255; // Normalize to 0-1
      
      audioContext.close();
      
      return {
        noiseLevel,
        backgroundNoise: noiseLevel > 0.3 ? 'high' : noiseLevel > 0.1 ? 'medium' : 'low'
      };
    } catch (error) {
      console.error('Error analyzing audio environment:', error);
      return { noiseLevel: 0.2, backgroundNoise: 'medium' };
    }
  }, []);

  // Optimize settings based on conditions
  const optimizeSettings = useCallback(async (connectionSpeed?: string, noiseLevel?: number) => {
    const speed = connectionSpeed || metrics.connectionSpeed;
    const noise = noiseLevel !== undefined ? noiseLevel : metrics.noiseLevel;
    
    const newSettings: AudioSettings = { ...optimizedSettings };
    
    // Adjust based on connection speed
    switch (speed) {
      case 'fast':
        newSettings.sampleRate = 24000;
        newSettings.bitRate = 256;
        newSettings.bufferSize = 2048;
        break;
      case 'medium':
        newSettings.sampleRate = 24000;
        newSettings.bitRate = 128;
        newSettings.bufferSize = 4096;
        break;
      case 'slow':
        newSettings.sampleRate = 16000;
        newSettings.bitRate = 64;
        newSettings.bufferSize = 8192;
        break;
    }
    
    // Adjust based on noise level
    if (noise > 0.4) {
      newSettings.noiseSuppression = true;
      newSettings.autoGainControl = true;
    } else if (noise < 0.1) {
      newSettings.noiseSuppression = false;
      newSettings.autoGainControl = false;
    }
    
    setOptimizedSettings(newSettings);
    
    return newSettings;
  }, [metrics, optimizedSettings]);

  // Auto-optimization on environment changes
  useEffect(() => {
    const runOptimization = async () => {
      if (!metrics.adaptiveQuality) return;
      
      const speed = await measureConnectionSpeed();
      setMetrics(prev => ({ ...prev, connectionSpeed: speed }));
      
      await optimizeSettings(speed);
    };
    
    // Run optimization every 30 seconds
    const interval = setInterval(runOptimization, 30000);
    
    // Initial optimization
    runOptimization();
    
    return () => clearInterval(interval);
  }, [measureConnectionSpeed, optimizeSettings, metrics.adaptiveQuality]);

  const updateAudioMetrics = useCallback(async (stream: MediaStream) => {
    const audioAnalysis = await analyzeAudioEnvironment(stream);
    const connectionSpeed = await measureConnectionSpeed();
    
    setMetrics(prev => ({
      ...prev,
      noiseLevel: audioAnalysis.noiseLevel,
      connectionSpeed
    }));
    
    if (metrics.adaptiveQuality) {
      await optimizeSettings(connectionSpeed, audioAnalysis.noiseLevel);
    }
  }, [analyzeAudioEnvironment, measureConnectionSpeed, optimizeSettings, metrics.adaptiveQuality]);

  const toggleAdaptiveQuality = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      adaptiveQuality: !prev.adaptiveQuality
    }));
  }, []);

  const manualOverride = useCallback((settings: Partial<AudioSettings>) => {
    setOptimizedSettings(prev => ({ ...prev, ...settings }));
    setMetrics(prev => ({ ...prev, adaptiveQuality: false }));
  }, []);

  return {
    metrics,
    optimizedSettings,
    updateAudioMetrics,
    toggleAdaptiveQuality,
    manualOverride,
    optimizeSettings
  };
};