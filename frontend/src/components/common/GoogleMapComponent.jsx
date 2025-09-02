import React, { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { Loader } from '@googlemaps/js-api-loader';

const GoogleMapComponent = ({ 
  center = { lat: 28.7041, lng: 77.1025 }, 
  zoom = 15, 
  markers = [], 
  onMarkerClick,
  showTraffic = false,
  enableClustering = false,
  mapType = 'roadmap',
  className = 'w-full h-64',
  routes = [],
  onMapLoad
}) => {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const trafficLayer = useRef(null);
  const markerClusterer = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || map.current || !window.google) return;
    
    try {
      map.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: mapType,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Initialize traffic layer
      trafficLayer.current = new window.google.maps.TrafficLayer();
      
      // Initialize directions service and renderer
      directionsService.current = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      directionsRenderer.current.setMap(map.current);

      // Initialize marker clusterer if available and needed
      if (enableClustering && window.MarkerClusterer) {
        markerClusterer.current = new window.MarkerClusterer(map.current, [], {
          imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
          gridSize: 60,
          maxZoom: 15
        });
      }

      setIsLoaded(true);
      
      // Call onMapLoad callback if provided
      if (onMapLoad) {
        onMapLoad(map.current);
      }
    } catch (error) {
      console.error('Error initializing Google Map:', error);
    }
  }, [center, zoom, mapType, enableClustering, onMapLoad]);

  // Update map center when center prop changes
  useEffect(() => {
    if (map.current && center) {
      map.current.setCenter(center);
    }
  }, [center]);

  // Toggle traffic layer
  useEffect(() => {
    if (!trafficLayer.current || !map.current) return;
    
    if (showTraffic) {
      trafficLayer.current.setMap(map.current);
    } else {
      trafficLayer.current.setMap(null);
    }
  }, [showTraffic]);

  // Handle markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (markerClusterer.current) {
      markerClusterer.current.clearMarkers();
    }

    // Add new markers
    const newMarkers = markers.map(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: enableClustering ? null : map.current,
        title: markerData.title,
        icon: markerData.icon || {
          url: '/truck-marker-icon.svg',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Add click listener
      if (onMarkerClick || markerData.onClick) {
        marker.addListener('click', () => {
          if (markerData.onClick) {
            markerData.onClick(markerData);
          } else if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        });
      }

      // Add info window if content provided
      if (markerData.infoWindow) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: markerData.infoWindow
        });

        marker.addListener('click', () => {
          infoWindow.open(map.current, marker);
        });
      }

      return marker;
    });

    markersRef.current = newMarkers;

    // Add markers to clusterer if enabled
    if (enableClustering && markerClusterer.current) {
      markerClusterer.current.addMarkers(newMarkers);
    }
  }, [markers, isLoaded, enableClustering, onMarkerClick]);

  // Handle routes/directions
  useEffect(() => {
    if (!map.current || !directionsService.current || !directionsRenderer.current || !isLoaded) return;

    if (routes.length > 0) {
      const route = routes[0]; // Handle first route for now
      if (route.origin && route.destination) {
        const request = {
          origin: route.origin,
          destination: route.destination,
          waypoints: route.waypoints || [],
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true
        };

        directionsService.current.route(request, (result, status) => {
          if (status === 'OK') {
            directionsRenderer.current.setDirections(result);
          } else {
            console.error('Directions request failed due to ' + status);
          }
        });
      }
    } else {
      // Clear directions if no routes
      directionsRenderer.current.setDirections({ routes: [] });
    }
  }, [routes, isLoaded]);

  return <div ref={mapRef} className={className} />;
};

// Wrapper component that loads Google Maps API
const GoogleMapWrapper = (props) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setScriptLoaded(true);
      return;
    }

    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBw5HYJlrqKfn39dGPdNwNYIQKGa4ZQwz4', // Fallback API key
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    loader.load()
      .then(() => {
        setScriptLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
        setLoadError(error);
      });
  }, []);

  if (loadError) {
    return (
      <div className={props.className || 'w-full h-64'}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <div className="text-center text-gray-500">
            <p>Failed to load Google Maps</p>
            <p className="text-sm mt-1">Please check your API key</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className={props.className || 'w-full h-64'}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  return <GoogleMapComponent {...props} />;
};

export default GoogleMapWrapper;