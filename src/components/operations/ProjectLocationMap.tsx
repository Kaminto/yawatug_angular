import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ProjectLocation {
  name: string;
  district: string;
  status: string;
  type: string;
  coordinates: [number, number];
}

interface ProjectLocationMapProps {
  locations: ProjectLocation[];
}

const ProjectLocationMap: React.FC<ProjectLocationMapProps> = ({ locations }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const initializeMap = (token: string) => {
    if (!mapContainer.current || !token) return;

    try {
      // Set the access token
      mapboxgl.accessToken = token;
      
      // Initialize map centered on Uganda
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [32.2903, 1.3733], // Uganda center coordinates
        zoom: 6,
        pitch: 45,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add markers for each location
      map.current.on('load', () => {
        locations.forEach((location, index) => {
          // Create marker element
          const markerElement = document.createElement('div');
          markerElement.className = 'w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform';
          markerElement.innerHTML = `<span class="text-white text-xs font-bold">${index + 1}</span>`;

          // Create popup
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
          }).setHTML(`
            <div class="p-3">
              <h3 class="font-semibold text-gray-900 mb-1">${location.name}</h3>
              <p class="text-sm text-gray-600 mb-1">${location.district} District</p>
              <p class="text-xs text-gray-500">${location.type}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                location.status === 'Active' ? 'bg-green-100 text-green-800' :
                location.status === 'Development' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }">${location.status}</span>
            </div>
          `);

          // Add marker to map
          const marker = new mapboxgl.Marker(markerElement)
            .setLngLat(location.coordinates)
            .setPopup(popup)
            .addTo(map.current!);

          // Show popup on hover
          markerElement.addEventListener('mouseenter', () => {
            popup.addTo(map.current!);
          });
        });
      });

      // Add atmosphere effect
      map.current.on('style.load', () => {
        map.current?.setFog({
          color: 'rgb(255, 255, 255)',
          'high-color': 'rgb(200, 200, 225)',
          'horizon-blend': 0.02,
        });
      });

      setShowTokenInput(false);
      setTokenError('');
    } catch (error) {
      setTokenError('Invalid Mapbox token. Please check your token and try again.');
    }
  };

  const handleTokenSubmit = () => {
    if (!mapboxToken.trim()) {
      setTokenError('Please enter a valid Mapbox token');
      return;
    }
    initializeMap(mapboxToken);
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (showTokenInput) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Map Configuration Required</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          To display the project locations map, please enter your Mapbox public token. 
          You can get one from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
        </p>
        
        <div className="w-full max-w-sm space-y-3">
          <Input
            type="text"
            placeholder="Enter Mapbox public token"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full"
          />
          {tokenError && (
            <p className="text-sm text-destructive">{tokenError}</p>
          )}
          <Button onClick={handleTokenSubmit} className="w-full">
            Load Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-lg" />
    </div>
  );
};

export default ProjectLocationMap;