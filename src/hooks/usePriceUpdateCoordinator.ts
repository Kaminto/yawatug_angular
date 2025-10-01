import { useState, useEffect, useCallback } from 'react';

// Simple event emitter for price updates
class PriceUpdateEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

const priceUpdateEmitter = new PriceUpdateEmitter();

export const usePriceUpdateCoordinator = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = priceUpdateEmitter.subscribe(() => {
      setUpdateTrigger(prev => prev + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const triggerPriceUpdate = useCallback(() => {
    console.log('🔄 Triggering global price update');
    priceUpdateEmitter.emit();
  }, []);

  return { updateTrigger, triggerPriceUpdate };
};

export const triggerGlobalPriceUpdate = () => {
  priceUpdateEmitter.emit();
};