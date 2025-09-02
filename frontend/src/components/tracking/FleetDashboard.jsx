import React, { useState, useEffect, useRef } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { Search, MapPin, Navigation, Layers, Filter, ExternalLink, Bell, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import LocationSearchComponent from '../common/LocationSearchComponent.jsx';
import locationService from '../../services/LocationService.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import alertService from '../../services/AlertManagementService.js';
import { fetchEnhancedFleet } from '../../utils/api.js';

// Transform truck data from database to vehicle format for map display
const transformTruckToVehicle = (truck) => {
  // Extract location coordinates from various possible sources
  let latitude = null;
  let longitude = null;
  let locationSource = 'default';
  let locationAddress = 'Unknown Location';
  
  // Priority order for location data:
  // 1. Current location (most recent)
  // 2. First checkpoint location (if available and has coordinates)
  // 3. Pickup location data (if coordinates available)
  // 4. Drop location data (if coordinates available)
  // 5. Last known location from history
  
  
  
  // Extract complete route information including all waypoints
  let routeWaypoints = [];
  let pickupLocation = null;
  let dropLocation = null;
  
  // Build complete route from reservation data
  if (truck.reservationSummary) {
    const reservation = truck.reservationSummary;
    
    // Try to get pickup location coordinates (this could be the starting point)
    if (reservation.pickupLocation) {
      // Prefer coordinates stored within reservation summary
      const pickupCoords = reservation.pickupLocationData?.coordinates
        || truck.pickupLocationData?.coordinates
        || truck.reservationDetails?.pickupLocationData?.coordinates;
      if (pickupCoords?.lat != null && pickupCoords?.lng != null) {
        pickupLocation = {
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
          address: reservation.pickupLocation || reservation.pickupLocationData?.address,
          type: 'pickup'
        };
        routeWaypoints.push(pickupLocation);
  }
    }
    
    // Add all checkpoints with coordinates to the route
    if (reservation.checkpoints && reservation.checkpoints.length > 0) {
      reservation.checkpoints.forEach((checkpoint, index) => {
        if (checkpoint.locationData?.coordinates) {
          const waypoint = {
            lat: checkpoint.locationData.coordinates.lat,
            lng: checkpoint.locationData.coordinates.lng,
            address: checkpoint.locationData.address || checkpoint.location,
            type: 'checkpoint',
            checkpointIndex: index,
            details: {
              goodsType: checkpoint.goodsType,
              weight: checkpoint.weight,
              handlingInstructions: checkpoint.handlingInstructions,
              date: checkpoint.date
            }
          };
          routeWaypoints.push(waypoint);
        }
      });
    }
    
    // Try to get drop location coordinates (this could be the ending point)
    if (reservation.dropLocation) {
      // Prefer coordinates stored within reservation summary
      const dropCoords = reservation.dropLocationData?.coordinates
        || truck.dropLocationData?.coordinates
        || truck.reservationDetails?.dropLocationData?.coordinates;
      if (dropCoords?.lat != null && dropCoords?.lng != null) {
        dropLocation = {
          lat: dropCoords.lat,
          lng: dropCoords.lng,
          address: reservation.dropLocation || reservation.dropLocationData?.address,
          type: 'drop'
        };
        routeWaypoints.push(dropLocation);
  }
    }
  }
  
  
  
  if (truck.currentLocation?.coordinates) {
    latitude = truck.currentLocation.coordinates.lat || truck.currentLocation.coordinates.latitude;
    longitude = truck.currentLocation.coordinates.lng || truck.currentLocation.coordinates.longitude;
    locationAddress = truck.currentLocation.address || 'Current Location';
    locationSource = 'current_location';
  } else if (truck.reservationSummary?.checkpoints?.[0]?.locationData?.coordinates) {
    // Use the first checkpoint as current location for reserved trucks
    const checkpoint = truck.reservationSummary.checkpoints[0];
    latitude = checkpoint.locationData.coordinates.lat;
    longitude = checkpoint.locationData.coordinates.lng;
    locationAddress = checkpoint.locationData.address || checkpoint.location;
    locationSource = 'first_checkpoint';
  } else if (truck.reservationSummary?.checkpoints?.length > 0) {
    // Try to find any checkpoint with coordinates
    for (const checkpoint of truck.reservationSummary.checkpoints) {
      if (checkpoint.locationData?.coordinates) {
        latitude = checkpoint.locationData.coordinates.lat;
        longitude = checkpoint.locationData.coordinates.lng;
        locationAddress = checkpoint.locationData.address || checkpoint.location;
        locationSource = 'checkpoint_coordinates';
        break;
      }
    }
  } else if (truck.reservationSummary?.pickupLocationData?.coordinates) {
    // Prefer pickup from reservation summary
    latitude = truck.reservationSummary.pickupLocationData.coordinates.lat || truck.reservationSummary.pickupLocationData.coordinates.latitude;
    longitude = truck.reservationSummary.pickupLocationData.coordinates.lng || truck.reservationSummary.pickupLocationData.coordinates.longitude;
    locationAddress = truck.reservationSummary.pickupLocationData.address || truck.reservationSummary.pickupLocation || 'Pickup Location';
    locationSource = 'reservation_summary_pickup';
  } else if (truck.reservationSummary?.dropLocationData?.coordinates) {
    // Or drop from reservation summary
    latitude = truck.reservationSummary.dropLocationData.coordinates.lat || truck.reservationSummary.dropLocationData.coordinates.latitude;
    longitude = truck.reservationSummary.dropLocationData.coordinates.lng || truck.reservationSummary.dropLocationData.coordinates.longitude;
    locationAddress = truck.reservationSummary.dropLocationData.address || truck.reservationSummary.dropLocation || 'Drop Location';
    locationSource = 'reservation_summary_drop';
  } else if (truck.pickupLocationData?.coordinates) {
    latitude = truck.pickupLocationData.coordinates.lat || truck.pickupLocationData.coordinates.latitude;
    longitude = truck.pickupLocationData.coordinates.lng || truck.pickupLocationData.coordinates.longitude;
    locationAddress = truck.pickupLocationData.address || 'Pickup Location';
    locationSource = 'pickup_location';
  } else if (truck.reservationDetails?.pickupLocationData?.coordinates) {
    latitude = truck.reservationDetails.pickupLocationData.coordinates.lat || truck.reservationDetails.pickupLocationData.coordinates.latitude;
    longitude = truck.reservationDetails.pickupLocationData.coordinates.lng || truck.reservationDetails.pickupLocationData.coordinates.longitude;
    locationAddress = truck.reservationDetails.pickupLocationData.address || 'Pickup Location';
    locationSource = 'reservation_pickup';
  } else if (truck.dropLocationData?.coordinates) {
    latitude = truck.dropLocationData.coordinates.lat || truck.dropLocationData.coordinates.latitude;
    longitude = truck.dropLocationData.coordinates.lng || truck.dropLocationData.coordinates.longitude;
    locationAddress = truck.dropLocationData.address || 'Drop Location';
    locationSource = 'drop_location';
  } else if (truck.locationHistory && truck.locationHistory.length > 0) {
    const lastLocation = truck.locationHistory[truck.locationHistory.length - 1];
    latitude = lastLocation.latitude;
    longitude = lastLocation.longitude;
    locationAddress = lastLocation.address || 'Historical Location';
    locationSource = 'location_history';
  }
  
  // If no valid coordinates are available, skip this vehicle
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }
  
  // Determine vehicle status from truck data
  let status = 'available';
  let alerts = [];
  
  if (truck.status === 'in_transit' || truck.status === 'Reserved' || truck.isReserved) {
    status = 'in_transit';
  } else if (truck.status === 'maintenance') {
    status = 'maintenance';
    alerts.push('maintenance');
  } else if (truck.status === 'unavailable') {
    status = 'connection_lost';
    alerts.push('connection');
  }
  
  // Add alerts based on truck indicators
  if (truck.indicators) {
    if (truck.indicators.hasAlerts) alerts.push('general_alert');
    if (truck.indicators.lowFuel) alerts.push('fuel_low');
    if (truck.indicators.maintenanceDue) alerts.push('maintenance_due');
    if (truck.indicators.lowSentiment) alerts.push('low_morale');
  }
  
  // Add alerts based on truck conditions
  if (truck.alerts && truck.alerts.length > 0) {
    alerts = [...alerts, ...truck.alerts.map(alert => alert.type || alert)];
  }
  
  // Check for potential issues
  if (truck.metrics?.fuelLevel && truck.metrics.fuelLevel < 20) {
    alerts.push('fuel_low');
  }
  
  if (truck.lastActiveAt && new Date() - new Date(truck.lastActiveAt) > 60 * 60 * 1000) {
    alerts.push('connection');
    status = 'connection_lost';
  }
  
  const transformedVehicle = {
    vehicleId: truck.id || truck.number,
    location: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: locationAddress,
      isStale: truck.lastActiveAt && new Date() - new Date(truck.lastActiveAt) > 30 * 60 * 1000
    },
    status: status,
    alerts: [...new Set(alerts)], // Remove duplicates
    lastUpdate: truck.updatedAt || truck.lastActiveAt || truck.lastActivity || new Date().toISOString(),
    driver: truck.driver?.name || truck.reservationSummary?.assignedDriver?.name || 'Unassigned',
    route: truck.reservationSummary?.route || 
           (truck.reservationDetails?.route ? 
            `${truck.reservationDetails.route.pickupLocation} → ${truck.reservationDetails.route.dropLocation}` : 
            'No route assigned'),
    speed: truck.metrics?.currentSpeed || truck.currentSpeed || 0,
  fuel: truck.metrics?.fuelLevel || truck.fuel || 0, // Fallback to 0 if no fuel data
    companyId: truck.businessUid || truck.companyId || 'default',
    company: truck.company || 'Company',
    // Enhanced route information for map display
    routeData: {
      waypoints: routeWaypoints,
      pickupLocation: pickupLocation,
      dropLocation: dropLocation,
      hasCompleteRoute: routeWaypoints.length >= 1, // Changed from 2 to 1 to show single waypoints
      checkpointCount: truck.reservationSummary?.checkpoints?.length || 0
    },
    // Additional truck details for info window
    truckDetails: {
      number: truck.number || truck.licensePlate || truck.id,
      model: truck.model || 'Unknown Model',
      capacity: truck.capacity || truck.maxCapacity || 'Unknown',
      licensePlate: truck.licensePlate || truck.number || 'Unknown',
      customerName: truck.reservationSummary?.customerName || 
                   truck.reservationDetails?.customerInfo?.contactName || 
                   truck.customer?.contactName || 'No customer assigned',
      pickupLocation: truck.reservationSummary?.pickupLocation || 
                     truck.reservationDetails?.route?.pickupLocation || 
                     truck.pickupLocationData?.address || 'Unknown',
      dropLocation: truck.reservationSummary?.dropLocation || 
                   truck.reservationDetails?.route?.dropLocation || 
                   truck.dropLocationData?.address || 'Unknown',
      checkpoints: truck.reservationSummary?.checkpoints || truck.reservationDetails?.checkpoints || [],
      sentimentScore: truck.driver?.sentimentScore || null,
      sentimentLabel: truck.driver?.sentimentLabel || null,
      priority: truck.priority || 'Medium'
    }
  };
  
  return transformedVehicle;
};

// Enhanced Google Maps component with better features
const MapComponent = ({ 
  vehicles, 
  alerts, 
  onVehicleSelect, 
  selectedVehicle, 
  center, 
  zoom,
  showTraffic = false,
  showClustering = true,
  showRoutes = true,
  searchLocation = null,
  mapType = 'roadmap'
}) => {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const routePolylines = useRef({});
  const routeRenderers = useRef({});
  const waypointMarkers = useRef({});
  const infoWindow = useRef(null);
  const trafficLayer = useRef(null);
  const markerClusterer = useRef(null);
  const searchMarker = useRef(null);
  const geocoderRef = useRef(null);
  const geocodeCache = useRef({});

  // Initialize map with enhanced features
  useEffect(() => {
    if (!mapRef.current || map.current) return;

    // Enhanced map configuration
    map.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: mapType,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_CENTER
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      },
      scaleControl: true,
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      fullscreenControl: true
    });

    // Initialize traffic layer
    trafficLayer.current = new window.google.maps.TrafficLayer();
    
    // Initialize info window
    infoWindow.current = new window.google.maps.InfoWindow({
      maxWidth: 350
    });

  // Initialize geocoder
  geocoderRef.current = new window.google.maps.Geocoder();

    // Initialize marker clusterer if available
    if (window.MarkerClusterer && showClustering) {
      markerClusterer.current = new window.MarkerClusterer(map.current, [], {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        gridSize: 60,
        maxZoom: 15
      });
    }
  }, [center, zoom, mapType]);

  // Toggle traffic layer
  useEffect(() => {
    if (!trafficLayer.current) return;
    
    if (showTraffic) {
      trafficLayer.current.setMap(map.current);
    } else {
      trafficLayer.current.setMap(null);
    }
  }, [showTraffic]);

  // Handle search location marker
  useEffect(() => {
    if (!map.current) return;

    // Remove existing search marker
    if (searchMarker.current) {
      searchMarker.current.setMap(null);
      searchMarker.current = null;
    }

    // Add new search marker if location is provided
    if (searchLocation) {
      const icon = {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      };

      searchMarker.current = new window.google.maps.Marker({
        position: {
          lat: searchLocation.coordinates.lat,
          lng: searchLocation.coordinates.lng
        },
        map: map.current,
        title: searchLocation.address,
        icon: icon,
        animation: window.google.maps.Animation.DROP
      });

      // Center map on search location
      map.current.setCenter({
        lat: searchLocation.coordinates.lat,
        lng: searchLocation.coordinates.lng
      });
      map.current.setZoom(12);

      // Add info window for search marker
      const searchInfoContent = `
        <div style="max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; color: #4F46E5; font-size: 16px; font-weight: 600;">
            Search Location
          </h3>
          <p style="margin: 0; color: #374151; font-size: 14px;">
            ${searchLocation.address}
          </p>
          <div style="margin-top: 8px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${searchLocation.coordinates.lat},${searchLocation.coordinates.lng}" 
               target="_blank" 
               style="color: #4F46E5; text-decoration: none; font-size: 12px;">
              View on Google Maps ↗
            </a>
          </div>
        </div>
      `;

      searchMarker.current.addListener('click', () => {
        infoWindow.current.setContent(searchInfoContent);
        infoWindow.current.open(map.current, searchMarker.current);
      });
    }
  }, [searchLocation]);

  // Enhanced vehicle markers with clustering and route visualization
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and routes
    Object.values(markers.current).forEach(marker => {
      marker.setMap(null);
    });
    markers.current = {};

    // Clear existing route polylines
    Object.values(routePolylines.current).forEach(polyline => {
      polyline.setMap(null);
    });
    routePolylines.current = {};

    // Clear existing directions renderers
    Object.values(routeRenderers.current).forEach(renderer => {
      renderer.setMap(null);
    });
    routeRenderers.current = {};

    // Clear existing waypoint markers
    Object.values(waypointMarkers.current).forEach(markers => {
      markers.forEach(marker => marker.setMap(null));
    });
    waypointMarkers.current = {};

    // Clear clusterer
    if (markerClusterer.current) {
      markerClusterer.current.clearMarkers();
    }

    const newMarkers = [];

    // Helper: geocode with caching
    const geocodeAddress = (address) => {
      return new Promise((resolve) => {
        if (!address) return resolve(null);
        if (geocodeCache.current[address]) return resolve(geocodeCache.current[address]);
        if (!geocoderRef.current) return resolve(null);
        geocoderRef.current.geocode({ address }, (results, status) => {
          if ((status === 'OK' || status === window.google.maps.GeocoderStatus.OK) && results?.[0]) {
            const loc = results[0].geometry.location;
            const coords = { lat: loc.lat(), lng: loc.lng() };
            geocodeCache.current[address] = coords;
            resolve(coords);
          } else {
            resolve(null);
          }
        });
      });
    };

    // Add enhanced vehicle markers and routes
    vehicles.forEach(vehicle => {
      const { vehicleId, location, status, alerts: vehicleAlerts, lastUpdate, routeData } = vehicle;
      
      // Enhanced marker styling based on status and alerts
      let markerColor = '#22c55e'; // Green - normal
      let markerIcon = 'circle';
      
      if (vehicleAlerts.length > 0) {
        const hasCritical = vehicleAlerts.some(alert => 
          ['breakdown', 'emergency'].includes(alert)
        );
        const hasHigh = vehicleAlerts.some(alert => 
          ['delay', 'detour', 'speed'].includes(alert)
        );
        
        if (hasCritical) {
          markerColor = '#ef4444'; // Red - critical
          markerIcon = 'exclamation';
        } else if (hasHigh) {
          markerColor = '#f59e0b'; // Orange - warning
          markerIcon = 'triangle';
        } else {
          markerColor = '#3b82f6'; // Blue - info
        }
      }

      if (status === 'connection_lost' || location.isStale) {
        markerColor = '#6b7280'; // Gray - stale/disconnected
        markerIcon = 'cross';
      }

      // Create enhanced custom marker icon for vehicle
      const markerIconConfig = {
        path: getMarkerPath(markerIcon),
        scale: 10,
        fillColor: markerColor,
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        anchor: new window.google.maps.Point(0, 0)
      };

      // Create main vehicle marker
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: showClustering ? null : map.current,
        title: `Vehicle ${vehicleId}`,
        icon: markerIconConfig,
        animation: vehicleAlerts.length > 0 && selectedVehicle?.vehicleId === vehicleId ? 
          window.google.maps.Animation.BOUNCE : null,
        zIndex: 1000 // Ensure vehicle markers are above route elements
      });

      // Enhanced info window content
      const infoContent = createVehicleInfoWindow(vehicle);

      // Add click listener
      marker.addListener('click', () => {
        infoWindow.current.setContent(infoContent);
        infoWindow.current.open(map.current, marker);
        onVehicleSelect(vehicle);
      });

      markers.current[vehicleId] = marker;
      newMarkers.push(marker);

      // Add route visualization if waypoints are available and routes are enabled
      if (showRoutes && routeData && routeData.waypoints && routeData.waypoints.length >= 1) {
        
        
        // Helper: add waypoint markers (supports pickup/drop/checkpoints)
        const addWaypointMarkersForVehicle = (waypointsList) => {
          const vehicleWaypointMarkers = [];
          waypointsList.forEach((waypoint, index) => {
            let waypointIcon;
            let waypointLabel;
            let waypointZIndex = 800;

            switch (waypoint.type) {
              case 'pickup':
                waypointIcon = {
                  path: 'M 0,-15 L -10,10 L 10,10 Z',
                  scale: 1,
                  fillColor: '#10b981',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                };
                waypointLabel = 'Pickup';
                waypointZIndex = 900;
                break;
              case 'drop':
                waypointIcon = {
                  path: 'M -10,-10 L 10,-10 L 10,10 L -10,10 Z',
                  scale: 1,
                  fillColor: '#dc2626',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                };
                waypointLabel = 'Drop';
                waypointZIndex = 900;
                break;
              case 'checkpoint':
              default:
                waypointIcon = {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                };
                waypointLabel = `Stop ${index + 1}`;
                break;
            }

            const waypointMarker = new window.google.maps.Marker({
              position: { lat: waypoint.lat, lng: waypoint.lng },
              map: map.current,
              title: `${waypointLabel}: ${waypoint.address}`,
              icon: waypointIcon,
              zIndex: waypointZIndex
            });

            const waypointInfoContent = createWaypointInfoWindow(waypoint, vehicleId, waypointLabel);
            waypointMarker.addListener('click', () => {
              if (waypoint.type === 'pickup') {
                const vehicleInfo = createVehicleInfoWindow(vehicle);
                infoWindow.current.setContent(vehicleInfo);
                infoWindow.current.open(map.current, waypointMarker);
              } else {
                infoWindow.current.setContent(waypointInfoContent);
                infoWindow.current.open(map.current, waypointMarker);
              }
            });

            vehicleWaypointMarkers.push(waypointMarker);
          });

          waypointMarkers.current[vehicleId] = vehicleWaypointMarkers;
          
        };

        const drawWithDirections = async () => {
          // Resolve pickup/drop: use provided coords or geocode addresses if missing
          let pickup = routeData.pickupLocation;
          let drop = routeData.dropLocation;

          if (!pickup && vehicle.truckDetails?.pickupLocation) {
            const coords = await geocodeAddress(vehicle.truckDetails.pickupLocation);
            if (coords) pickup = { lat: coords.lat, lng: coords.lng, address: vehicle.truckDetails.pickupLocation, type: 'pickup' };
          }
          if (!drop && vehicle.truckDetails?.dropLocation) {
            const coords = await geocodeAddress(vehicle.truckDetails.dropLocation);
            if (coords) drop = { lat: coords.lat, lng: coords.lng, address: vehicle.truckDetails.dropLocation, type: 'drop' };
          }

          const hasPickup = !!pickup;
          const hasDrop = !!drop;

          // Build combined waypoints array for markers
          const combinedWaypoints = [...(routeData.waypoints || [])];
          if (hasPickup && !combinedWaypoints.some(wp => wp.type === 'pickup')) {
            combinedWaypoints.unshift(pickup);
          }
          if (hasDrop && !combinedWaypoints.some(wp => wp.type === 'drop')) {
            combinedWaypoints.push(drop);
          }

          if (hasPickup && hasDrop) {
            // Cleanup previous renderer for this vehicle
            if (routeRenderers.current[vehicleId]) {
              routeRenderers.current[vehicleId].setMap(null);
              delete routeRenderers.current[vehicleId];
            }

            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
              map: map.current,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: markerColor,
                strokeOpacity: 0.9,
                strokeWeight: 4,
                zIndex: 100
              }
            });

            const origin = new window.google.maps.LatLng(pickup.lat, pickup.lng);
            const destination = new window.google.maps.LatLng(drop.lat, drop.lng);
            const waypointStops = routeData.waypoints
              .filter(wp => wp.type === 'checkpoint')
              .map(wp => ({ location: new window.google.maps.LatLng(wp.lat, wp.lng), stopover: true }));

            const request = {
              origin,
              destination,
              waypoints: waypointStops,
              travelMode: window.google.maps.TravelMode.DRIVING,
              optimizeWaypoints: false
            };

            directionsService.route(request, (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
                directionsRenderer.setDirections(result);
                routeRenderers.current[vehicleId] = directionsRenderer;
                
                // Add markers including pickup/drop
                addWaypointMarkersForVehicle(combinedWaypoints);
              } else {
                
                // Fallback to simple polyline if directions fail
                const routePath = routeData.waypoints.map(waypoint => ({ lat: waypoint.lat, lng: waypoint.lng }));
                const routePolyline = new window.google.maps.Polyline({
                  path: routePath,
                  geodesic: true,
                  strokeColor: markerColor,
                  strokeOpacity: 0.85,
                  strokeWeight: 4,
                  map: map.current,
                  zIndex: 100
                });
                routePolylines.current[vehicleId] = routePolyline;
                addWaypointMarkersForVehicle(combinedWaypoints.length ? combinedWaypoints : routeData.waypoints);
              }
            });
          } else {
            // No pickup/drop: just add available markers (likely checkpoints)
            addWaypointMarkersForVehicle(routeData.waypoints);
          }
        };

        drawWithDirections();
      } else {
        
      }
    });

    // Add markers to clusterer or map
    if (showClustering && markerClusterer.current) {
      markerClusterer.current.addMarkers(newMarkers);
    } else {
      newMarkers.forEach(marker => marker.setMap(map.current));
    }

    // Fit bounds to show all vehicles and routes (if no search location)
    if (vehicles.length > 0 && !searchLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      
      vehicles.forEach(vehicle => {
        // Add vehicle location to bounds
        bounds.extend({
          lat: vehicle.location.latitude,
          lng: vehicle.location.longitude
        });
        
        // Add all route waypoints to bounds if available
        if (vehicle.routeData?.waypoints) {
          vehicle.routeData.waypoints.forEach(waypoint => {
            bounds.extend({ lat: waypoint.lat, lng: waypoint.lng });
          });
        }
      });
      
      map.current.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(map.current, 'idle', () => {
        if (map.current.getZoom() > 15) map.current.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [vehicles, onVehicleSelect, showClustering, showRoutes, searchLocation]);

  // Highlight selected vehicle
  useEffect(() => {
    if (!selectedVehicle || !markers.current[selectedVehicle.vehicleId]) return;

    const marker = markers.current[selectedVehicle.vehicleId];
    
    // Animate selected marker
    marker.setAnimation(window.google.maps.Animation.BOUNCE);
    
    // Center map on selected vehicle
    map.current.panTo({
      lat: selectedVehicle.location.latitude,
      lng: selectedVehicle.location.longitude
    });
    
    // Stop animation after 3 seconds
    setTimeout(() => {
      marker.setAnimation(null);
    }, 3000);
  }, [selectedVehicle]);

  // Helper function to get marker path based on icon type
  const getMarkerPath = (iconType) => {
    switch (iconType) {
      case 'triangle':
        return 'M 0,-8 L -8,8 L 8,8 Z';
      case 'exclamation':
        return window.google.maps.SymbolPath.CIRCLE;
      case 'cross':
        return 'M -6,-6 L 6,6 M -6,6 L 6,-6';
      default:
        return window.google.maps.SymbolPath.CIRCLE;
    }
  };

  // Helper function to create waypoint info window content
  const createWaypointInfoWindow = (waypoint, vehicleId, waypointLabel) => {
    return `
      <div style="max-width: 350px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            ${waypointLabel}
          </h3>
          <span style="padding: 4px 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; 
                       background-color: #3b82f6; color: white; border-radius: 8px;">
            Vehicle ${vehicleId}
          </span>
        </div>
        
        <div style="font-size: 14px; color: #4b5563; line-height: 1.5;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">📍 Address:</strong><br>
            <span style="color: #6b7280;">${waypoint.address || 'Address not available'}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">📊 Coordinates:</strong>
            <span style="color: #6b7280;">${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}</span>
          </div>
          
          ${waypoint.details?.goodsType ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">📦 Goods Type:</strong>
              <span style="color: #6b7280;">${waypoint.details.goodsType}</span>
            </div>
          ` : ''}
          
          ${waypoint.details?.weight ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">⚖️ Weight:</strong>
              <span style="color: #6b7280;">${waypoint.details.weight}</span>
            </div>
          ` : ''}
          
          ${waypoint.details?.handlingInstructions ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">📋 Instructions:</strong>
              <span style="color: #6b7280;">${waypoint.details.handlingInstructions}</span>
            </div>
          ` : ''}
          
          ${waypoint.details?.date ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">📅 Date:</strong>
              <span style="color: #6b7280;">${new Date(waypoint.details.date).toLocaleDateString()}</span>
            </div>
          ` : ''}
          
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <a href="https://www.google.com/maps/search/?api=1&query=${waypoint.lat},${waypoint.lng}" 
               target="_blank" 
               style="color: #3b82f6; text-decoration: none; font-size: 12px;">
              📱 View on Google Maps ↗
            </a>
          </div>
        </div>
      </div>
    `;
  };

  // Helper function to create route info window content
  const createRouteInfoWindow = (vehicle, waypointCount) => {
    return `
      <div style="max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            🛣️ Route for ${vehicle.truckDetails?.number || vehicle.vehicleId}
          </h3>
        </div>
        
        <div style="font-size: 14px; color: #4b5563; line-height: 1.5;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">📊 Route Stats:</strong><br>
            <span style="color: #6b7280;">${waypointCount} waypoints connected</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">🚛 Driver:</strong>
            <span style="color: #6b7280;">${vehicle.driver || 'Unassigned'}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">📍 Current Status:</strong>
            <span style="color: #6b7280;">${vehicle.status.replace('_', ' ')}</span>
          </div>
          
          <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
            Click on waypoints for detailed stop information
          </div>
        </div>
      </div>
    `;
  };

  // Helper function to create enhanced info window content
  const createVehicleInfoWindow = (vehicle) => {
    const { vehicleId, location, status, alerts: vehicleAlerts, lastUpdate, truckDetails } = vehicle;
    
    return `
      <div style="max-width: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
            ${truckDetails?.number || vehicleId}
          </h3>
          <span style="padding: 4px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; 
                       background-color: ${getStatusColor(status, vehicleAlerts)}; color: white; border-radius: 12px;">
            ${status.replace('_', ' ')}
          </span>
        </div>
        
        <div style="font-size: 14px; color: #4b5563; line-height: 1.5;">
          ${truckDetails?.model ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">� Model:</strong>
              <span style="color: #6b7280;">${truckDetails.model}</span>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">�📍 Current Location:</strong><br>
            <span style="color: #6b7280;">${location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}</span>
          </div>
          
          ${vehicle.driver !== 'Unassigned' ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">� Driver:</strong>
              <span style="color: #6b7280;">${vehicle.driver}</span>
              ${truckDetails?.sentimentScore ? `
                <span style="margin-left: 8px; padding: 2px 6px; background-color: ${
                  truckDetails.sentimentScore >= 70 ? '#22c55e' : 
                  truckDetails.sentimentScore >= 40 ? '#f59e0b' : '#ef4444'
                }; color: white; border-radius: 10px; font-size: 10px;">
                  ${truckDetails.sentimentLabel || 'Mood: ' + truckDetails.sentimentScore + '%'}
                </span>
              ` : ''}
            </div>
          ` : ''}
          
          ${vehicle.route !== 'No route assigned' ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">🗺️ Route:</strong><br>
              <span style="color: #6b7280;">${vehicle.route}</span>
            </div>
          ` : ''}
          
          ${truckDetails?.customerName && truckDetails.customerName !== 'No customer assigned' ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">� Customer:</strong>
              <span style="color: #6b7280;">${truckDetails.customerName}</span>
            </div>
          ` : ''}
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <strong style="color: #374151;">⚡ Speed:</strong>
              <span style="color: #6b7280;">${vehicle.speed || 0} km/h</span>
            </div>
            <div>
              <strong style="color: #374151;">⛽ Fuel:</strong>
              <span style="color: #6b7280;">${vehicle.fuel || 0}%</span>
            </div>
          </div>
          
          ${truckDetails?.capacity ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">� Capacity:</strong>
              <span style="color: #6b7280;">${truckDetails.capacity} kg</span>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">🕒 Last Update:</strong>
            <span style="color: #6b7280;">${new Date(lastUpdate).toLocaleString()}</span>
          </div>
          
          ${truckDetails?.checkpoints && truckDetails.checkpoints.length > 0 ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">🏁 Checkpoints:</strong>
              <span style="color: #6b7280;">${truckDetails.checkpoints.length} remaining</span>
            </div>
          ` : ''}
          
          ${vehicle.routeData?.hasCompleteRoute ? `
            <div style="margin-bottom: 8px; padding: 8px; background-color: #f0f9ff; border-radius: 6px; border-left: 3px solid #3b82f6;">
              <strong style="color: #1e40af;">🛣️ Route Details:</strong><br>
              <div style="margin-top: 4px; font-size: 12px;">
                <div style="margin-bottom: 4px;">
                  <span style="color: #059669;">📍 Pickup:</span> 
                  <span style="color: #374151;">${vehicle.routeData.pickupLocation?.address || 'Pickup Location'}</span>
                </div>
                ${vehicle.routeData.waypoints.filter(wp => wp.type === 'checkpoint').map((checkpoint, idx) => `
                  <div style="margin-bottom: 4px;">
                    <span style="color: #3b82f6;">🔹 Stop ${idx + 1}:</span> 
                    <span style="color: #374151;">${checkpoint.address}</span>
                  </div>
                `).join('')}
                <div style="margin-bottom: 4px;">
                  <span style="color: #dc2626;">🏁 Drop:</span> 
                  <span style="color: #374151;">${vehicle.routeData.dropLocation?.address || 'Drop Location'}</span>
                </div>
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #bfdbfe;">
                  <span style="color: #6b7280; font-size: 11px;">
                    Total waypoints: ${vehicle.routeData.waypoints.length} | 
                    Route shown on map
                  </span>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${vehicleAlerts.length > 0 ? `
            <div style="margin-top: 12px; padding: 8px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong style="color: #92400e;">⚠️ Active Alerts:</strong><br>
              <div style="margin-top: 4px;">
                ${vehicleAlerts.map(alert => `
                  <span style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 6px; 
                               background-color: #ef4444; color: white; border-radius: 10px; font-size: 11px;">
                    ${alert.replace('_', ' ').toUpperCase()}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <a href="https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}" 
               target="_blank" 
               style="color: #3b82f6; text-decoration: none; font-size: 12px;">
              📱 View on Google Maps ↗
            </a>
          </div>
        </div>
      </div>
    `;
  };

  // Helper function to get status color
  const getStatusColor = (status, alerts) => {
    if (alerts.length > 0) {
      const hasCritical = alerts.some(alert => ['breakdown', 'emergency'].includes(alert));
      const hasHigh = alerts.some(alert => ['delay', 'detour', 'speed'].includes(alert));
      
      if (hasCritical) return '#ef4444';
      if (hasHigh) return '#f59e0b';
      return '#3b82f6';
    }
    
    switch (status) {
      case 'in_transit': return '#22c55e';
      case 'connection_lost': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

const FleetDashboard = () => {
  const { user } = useAuth(); // Get current authenticated user
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Enhanced map controls
  const [showTraffic, setShowTraffic] = useState(false);
  const [showClustering, setShowClustering] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapType, setMapType] = useState('roadmap');
  const [searchLocation, setSearchLocation] = useState(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  
  // Alert management
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertStats, setAlertStats] = useState({});
  const [dataSource, setDataSource] = useState('loading'); // 'database', 'fallback', 'demo'
  
  const refreshInterval = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4001';
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  

  // Subscribe to real-time alerts
  useEffect(() => {
    if (user?.uid || user?.id) {
      const userId = user?.uid || user?.id; // Prefer uid (Firebase auth ID) over id
      const unsubscribe = alertService.subscribeToAlerts(
        userId,
        user.userType || 'business',
        (newAlerts) => {
          setRealtimeAlerts(newAlerts.filter(alert => alert.status === 'active'));
        }
      );
      
      // Load alert statistics
      loadAlertStatistics();
      
      return unsubscribe;
    }
  }, [user]);

  // Load alert statistics
  const loadAlertStatistics = async () => {
    try {
      const stats = await alertService.getAlertStatistics(user?.userType);
      setAlertStats(stats || {});
  } catch (error) {
  }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [autoRefresh]);

  const startAutoRefresh = () => {
    refreshInterval.current = setInterval(() => {
      fetchDashboardData(false); // Silent refresh
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  };

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Get business UID for filtering if user is a business
      const businessUid = user?.userType === 'business' ? user?.uid : null;
      
      // Fetch real truck data from database using the same API as trackTruck
      // Pass businessUid to filter trucks for this specific business
      const fleetResponse = await fetchEnhancedFleet(true, true, businessUid);
      
      let truckData = fleetResponse.trucks || [];
      
      // Enrich trucks missing coordinates by geocoding best available address
      const enrichTrucksWithCoordinates = async (trucks) => {
        const getBestAddress = (t) => {
          return (
            t.currentLocation?.address ||
            t.reservationSummary?.checkpoints?.find(cp => cp?.locationData?.address)?.locationData?.address ||
            t.reservationSummary?.pickupLocationData?.address ||
            t.reservationSummary?.pickupLocation ||
            t.reservationSummary?.dropLocationData?.address ||
            t.reservationSummary?.dropLocation ||
            t.reservationDetails?.route?.pickupLocation ||
            t.reservationDetails?.route?.dropLocation ||
            t.pickupLocationData?.address ||
            t.dropLocationData?.address ||
            null
          );
        };

        const hasCoordinates = (t) => {
          const cl = t.currentLocation;
          const coords = cl?.coordinates;
          const lat = coords?.lat ?? coords?.latitude;
          const lng = coords?.lng ?? coords?.longitude;
          return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
        };

        const tasks = trucks.map(async (t) => {
          if (hasCoordinates(t)) return t;
          const address = getBestAddress(t);
          if (!address) return t;
          try {
            const result = await locationService.geocodeAddress(address);
            if (result?.coordinates) {
              t.currentLocation = {
                address: result.address || address,
                coordinates: { lat: result.coordinates.lat, lng: result.coordinates.lng }
              };
            }
          } catch (_) {
            // ignore geocode errors
          }
          return t;
        });

        await Promise.all(tasks);
        return trucks;
      };

      try {
        truckData = await enrichTrucksWithCoordinates(truckData);
      } catch (_) {}

      // Transform truck data to vehicle format for map display
      let vehicleData = truckData
        .map(truck => transformTruckToVehicle(truck))
        .filter(v => !!v);
      
      // No need for additional client-side filtering since backend now filters by businessUid
      // The API call already includes businessUid parameter when user is a business
      
      // Always prefer database data over fallback - set data source accordingly
      if (truckData.length > 0) {
        setDataSource('database');
        
      } else {
        // Only try fallback if we got empty results from the database
        try {
          // Try the tracking API as fallback
          const companyParam = user?.userType === 'business' && user?.companyId ? 
            `?companyId=${user.companyId}` : '';
          
          const vehiclesResponse = await axios.get(`${API_BASE}/api/tracking/vehicles/locations${companyParam}`);
          const fallbackVehicleData = vehiclesResponse.data.vehicles || [];
          
          if (fallbackVehicleData.length > 0) {
            vehicleData = fallbackVehicleData;
            setDataSource('fallback');
          } else if (user?.userType === 'business') {
            // No data available
            setDataSource('demo');
          }
        } catch (fallbackError) {
          if (user?.userType === 'business') {
            setDataSource('demo');
          }
        }
      }

      // Don't fetch alerts here, we'll use real-time subscription only
      // The realtimeAlerts state will be updated by the subscription
      
      setVehicles(vehicleData);
      setLastUpdate(new Date().toISOString());
      setError(null);
      
    } catch (err) {
      
      if (user?.userType === 'business') {
        setVehicles([]);
        setAlerts([]);
        setDataSource('demo');
      }
      
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Enhanced alert acknowledgment with SOS response capability
  const handleAcknowledgeAlert = async (alertId, alertType) => {
    try {
      // For SOS alerts, show confirmation before acknowledging
      if (alertType === 'SOS') {
        const shouldAcknowledge = window.confirm(
          'Are you sure you want to acknowledge this SOS emergency alert?\n\n' +
          'This will mark the emergency as being handled. Please ensure appropriate action has been taken.'
        );
        
        if (!shouldAcknowledge) {
          return;
        }
      }
      
      const result = await alertService.acknowledgeAlert(
        alertId, 
        user?.businessDetails?.companyName || user?.email || 'Fleet Manager'
      );
      
      if (result.success) {
        // Refresh alerts
        loadAlertStatistics();
        
        // Show success notification for SOS
        if (alertType === 'SOS') {
          showNotification(
            'SOS Alert Acknowledged',
            'Emergency alert has been acknowledged. Ensure emergency response is in progress.',
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      showNotification(
        'Error',
        'Failed to acknowledge alert. Please try again.',
        'error'
      );
    }
  };

  // Enhanced alert resolution with SOS tracking
  const handleResolveAlert = async (alertId, alertType) => {
    try {
      // For SOS alerts, require confirmation and resolution note
      if (alertType === 'SOS') {
        const resolutionNote = window.prompt(
          'SOS Emergency Resolution\n\n' +
          'Please provide details about how this emergency was resolved:'
        );
        
        if (!resolutionNote || resolutionNote.trim() === '') {
          alert('Resolution note is required for SOS alerts.');
          return;
        }
        
        const shouldResolve = window.confirm(
          `Confirm SOS Emergency Resolution\n\n` +
          `Resolution: ${resolutionNote}\n\n` +
          'This will mark the emergency as fully resolved. Are you sure?'
        );
        
        if (!shouldResolve) {
          return;
        }
      }
      
      const result = await alertService.resolveAlert(
        alertId,
        user?.businessDetails?.companyName || user?.email || 'Fleet Manager',
        alertType === 'SOS' ? 'Emergency resolved by fleet management' : 'Resolved from Fleet Dashboard'
      );
      
      if (result.success) {
        loadAlertStatistics();
        
        // Show success notification
        if (alertType === 'SOS') {
          showNotification(
            'SOS Emergency Resolved',
            'Emergency has been marked as resolved. All parties will be notified.',
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      showNotification(
        'Error',
        'Failed to resolve alert. Please try again.',
        'error'
      );
    }
  };

  // Notification system for better user feedback
  const showNotification = (title, message, type = 'info') => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <div class="font-semibold">${title}</div>
          <div class="text-sm opacity-90">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white opacity-70 hover:opacity-100">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  };

  // Send emergency response to driver
  const sendEmergencyResponse = async (alert) => {
    const responseMessage = window.prompt(
      `Emergency Response to ${alert.source?.userType === 'driver' ? 'Driver' : 'Vehicle'}\n\n` +
      `Alert: ${alert.message}\n\n` +
      'Please provide emergency response instructions:'
    );
    
    if (!responseMessage || responseMessage.trim() === '') {
      return;
    }
    
    try {
      const result = await alertService.sendDispatchInstructions(
        user?.id,
        alert.source.userId,
        alert.vehicleId,
        `EMERGENCY RESPONSE: ${responseMessage}`,
        'critical'
      );
      
      if (result.success) {
        showNotification(
          'Emergency Response Sent',
          'Your emergency response has been sent to the driver.',
          'success'
        );
      }
    } catch (error) {
      console.error('Error sending emergency response:', error);
      showNotification(
        'Error',
        'Failed to send emergency response. Please try again.',
        'error'
      );
    }
  };

  // Send route update to driver
  const sendRouteUpdate = async (driverId, vehicleId, updateMessage) => {
    try {
      const result = await alertService.sendRouteUpdate(
        user?.id,
        driverId,
        vehicleId,
        updateMessage
      );
      
      if (result.success) {
        alert('Route update sent to driver successfully!');
      }
  } catch (error) {
  }
  };

  // Handle location search
  const handleLocationSearch = (locationData) => {
    if (locationData) {
      setSearchLocation(locationData);
      
      // Find nearby vehicles
      const nearbyVehicles = vehicles.filter(vehicle => {
        if (!vehicle.location) return false;
        
        const distance = locationService.calculateDistance(
          locationData.coordinates,
          {
            lat: vehicle.location.latitude,
            lng: vehicle.location.longitude
          }
        );
        
        return distance <= 10; // Within 10km
      });
      
      
    } else {
      setSearchLocation(null);
    }
  };

  // Find vehicles near a location
  const findNearbyVehicles = async (location, radiusKm = 5) => {
    try {
      const response = await axios.get(`${API_BASE}/api/vehicles/nearby`, {
        params: {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
          radius: radiusKm
        }
      });
      
      return response.data.vehicles || [];
  } catch (err) {
      return [];
    }
  };

  // Clear location search
  const clearLocationSearch = () => {
    setSearchLocation(null);
    setShowLocationSearch(false);
  };

  const getVehicleStatusColor = (status, alerts) => {
    if (alerts.length > 0) {
      const hasCritical = alerts.some(alert => ['breakdown', 'emergency'].includes(alert));
      const hasHigh = alerts.some(alert => ['delay', 'detour', 'speed'].includes(alert));
      
      if (hasCritical) return 'text-red-600 bg-red-100';
      if (hasHigh) return 'text-orange-600 bg-orange-100';
      return 'text-blue-600 bg-blue-100';
    }
    
    switch (status) {
      case 'in_transit': return 'text-green-600 bg-green-100';
      case 'connection_lost': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertSeverityColor = (severity, alertType) => {
    // Special styling for SOS alerts
    if (alertType === 'SOS') {
      return 'text-red-800 bg-red-100 border-red-500';
    }
    
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'alerts') return vehicle.alerts.length > 0;
    return vehicle.status === filterStatus;
  });

  const mapCenter = searchLocation ? 
    searchLocation.coordinates : 
    (vehicles.length > 0 ? { 
        lat: vehicles.reduce((sum, v) => sum + v.location.latitude, 0) / vehicles.length,
        lng: vehicles.reduce((sum, v) => sum + v.location.longitude, 0) / vehicles.length
      } : { lat: 28.7041, lng: 77.1025 }); // Default to Delhi

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800">Google Maps API Key Required</h3>
        <p className="text-yellow-700 mt-2">
          Please add your Google Maps API key to the .env file as VITE_GOOGLE_MAPS_API_KEY to enable the map view.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.userType === 'business' ? 
                `${user?.businessDetails?.companyName || 'Company'} Fleet Dashboard` : 
                'Fleet Dashboard'
              }
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 flex-wrap">
              <span>Real-time tracking • {vehicles.length} vehicles • {realtimeAlerts.length} active alerts</span>
              {user?.userType === 'business' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  Business View
                </span>
              )}
              {dataSource === 'database' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Data
                </span>
              )}
              {dataSource === 'demo' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                  Demo Data
                </span>
              )}
              {dataSource === 'fallback' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                  Fallback API
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Alert Panel Toggle */}
            <button
              onClick={() => setShowAlertPanel(!showAlertPanel)}
              className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
                realtimeAlerts.length > 0 
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="font-medium">{realtimeAlerts.length} Alerts</span>
              {realtimeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {realtimeAlerts.length}
                </span>
              )}
            </button>
            
            {/* Location Search Toggle */}
            <button
              onClick={() => setShowLocationSearch(!showLocationSearch)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition ${
                showLocationSearch 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              Location Search
            </button>

            {/* Map Controls */}
            {viewMode === 'map' && (
              <>
                {/* Traffic Toggle */}
                <button
                  onClick={() => setShowTraffic(!showTraffic)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border transition ${
                    showTraffic 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Traffic
                </button>

                {/* Clustering Toggle */}
                <button
                  onClick={() => setShowClustering(!showClustering)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border transition ${
                    showClustering 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Cluster
                </button>

                {/* Routes Toggle */}
                <button
                  onClick={() => setShowRoutes(!showRoutes)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border transition ${
                    showRoutes 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Routes
                </button>

                {/* Map Type Selector */}
                <select
                  value={mapType}
                  onChange={(e) => setMapType(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="roadmap">Road</option>
                  <option value="satellite">Satellite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="terrain">Terrain</option>
                </select>
              </>
            )}

            {/* View Toggle */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'map' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium transition border-l border-gray-200 ${
                  viewMode === 'list' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                List View
              </button>
            </div>

            {/* Auto Refresh Toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Auto refresh</span>
            </label>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Status and Filters */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Vehicles ({vehicles.length})</option>
              <option value="in_transit">In Transit ({vehicles.filter(v => v.status === 'in_transit').length})</option>
              <option value="connection_lost">Connection Lost ({vehicles.filter(v => v.status === 'connection_lost').length})</option>
              <option value="alerts">With Alerts ({vehicles.filter(v => v.alerts.length > 0).length})</option>
            </select>
          </div>

          {lastUpdate && (
            <p className="text-xs text-gray-500">
              Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map/List View */}
        <div className="flex-1 relative">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Connection Error</h3>
                <p className="text-gray-500 mt-1">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading fleet data...</p>
              </div>
            </div>
          ) : viewMode === 'map' ? (
            <Wrapper apiKey={GOOGLE_MAPS_API_KEY}>
              <MapComponent
                vehicles={filteredVehicles}
                alerts={alerts}
                onVehicleSelect={setSelectedVehicle}
                selectedVehicle={selectedVehicle}
                center={mapCenter}
                zoom={searchLocation ? 12 : 10}
                showTraffic={showTraffic}
                showClustering={showClustering}
                showRoutes={showRoutes}
                searchLocation={searchLocation}
                mapType={mapType}
              />
            </Wrapper>
          ) : (
            <div className="p-6 space-y-4 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    {dataSource === 'database' && vehicles.length === 0 ? 'No vehicles in your fleet' : 'No vehicles found'}
                  </h3>
                  <p className="text-gray-500">
                    {dataSource === 'database' && vehicles.length === 0 
                      ? 'Create truck reservations or add vehicles to see them on the dashboard.' 
                      : 'No vehicles match the current filter.'}
                  </p>
                  {dataSource === 'database' && vehicles.length === 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => window.location.href = '/business/truck-reservation'}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Truck Reservation
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredVehicles.map(vehicle => {
                    const showCapacity = vehicle.truckDetails?.capacity && vehicle.truckDetails.capacity !== 'Unknown';
                    const showModel = vehicle.truckDetails?.model && vehicle.truckDetails.model !== 'Unknown Model';
                    return (
                      <div
                        key={vehicle.vehicleId}
                        className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer ${
                          selectedVehicle?.vehicleId === vehicle.vehicleId ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        <div className="p-4 border-b flex items-center justify-between">
                          <div>
                            <div className="text-base font-semibold text-gray-900">{vehicle.truckDetails?.number || vehicle.vehicleId}</div>
                            <div className="text-xs text-gray-500">Last updated {new Date(vehicle.lastUpdate).toLocaleTimeString()}</div>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${getVehicleStatusColor(vehicle.status, vehicle.alerts)}`}>
                            {vehicle.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          {vehicle.driver !== 'Unassigned' && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Driver</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900">{vehicle.driver}</span>
                                {vehicle.truckDetails?.sentimentScore && (
                                  <span className={`px-2 py-0.5 text-[10px] rounded-full text-white ${
                                    vehicle.truckDetails.sentimentScore >= 70 ? 'bg-green-500' : 
                                    vehicle.truckDetails.sentimentScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}>
                                    {vehicle.truckDetails.sentimentLabel || `${vehicle.truckDetails.sentimentScore}%`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {vehicle.route !== 'No route assigned' && (
                            <div className="">
                              <div className="text-sm text-gray-600 mb-1">Route</div>
                              <div className="text-sm text-gray-900">{vehicle.route}</div>
                              {vehicle.routeData?.hasCompleteRoute && (
                                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <div className="text-xs font-medium text-blue-800 mb-1">Stops</div>
                                  <div className="space-y-1 text-xs text-blue-800">
                                    {vehicle.routeData.pickupLocation && (
                                      <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>Pickup: {vehicle.routeData.pickupLocation.address}</div>
                                    )}
                                    {vehicle.routeData.waypoints.filter(wp => wp.type === 'checkpoint').map((checkpoint, idx) => (
                                      <div key={idx} className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>Stop {idx + 1}: {checkpoint.address}</div>
                                    ))}
                                    {vehicle.routeData.dropLocation && (
                                      <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>Drop: {vehicle.routeData.dropLocation.address}</div>
                                    )}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-blue-200 text-[11px] text-blue-700">Total waypoints: {vehicle.routeData.waypoints.length}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {vehicle.truckDetails?.customerName && vehicle.truckDetails.customerName !== 'No customer assigned' && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Customer</span>
                              <span className="text-sm text-gray-900">{vehicle.truckDetails.customerName}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-gray-500">Location</div>
                              <div className="text-gray-900">{vehicle.location.address || `${vehicle.location.latitude.toFixed(4)}, ${vehicle.location.longitude.toFixed(4)}`}</div>
                            </div>
                            {showCapacity && (
                              <div>
                                <div className="text-gray-500">Capacity</div>
                                <div className="text-gray-900">{vehicle.truckDetails.capacity} kg</div>
                              </div>
                            )}
                            {showModel && (
                              <div>
                                <div className="text-gray-500">Model</div>
                                <div className="text-gray-900">{vehicle.truckDetails.model}</div>
                              </div>
                            )}
                          </div>

                          {vehicle.alerts.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-sm font-medium text-red-600 mb-1">Active Alerts</div>
                              <div className="flex flex-wrap gap-1">
                                {vehicle.alerts.map((alert, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                    {alert.replace('_', ' ').toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alerts Sidebar */}
        <div className="w-80 min-w-80 max-w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <p className="text-sm text-gray-500">{realtimeAlerts.length} alerts require attention</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {realtimeAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                <p className="text-gray-500">No active alerts at this time.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3 overflow-hidden">
                {realtimeAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity, alert.type)} break-words`}
                  >
                    {/* Header with alert type and vehicle */}
                    <div className="mb-2">
                      <div className="flex items-center mb-1 flex-wrap">
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {alert.type === 'SOS' ? '🚨 SOS EMERGENCY' : alert.type.replace('_', ' ')}
                        </span>
                        {alert.type === 'SOS' && (
                          <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate" title={`Vehicle ${alert.vehicleId}`}>
                        Vehicle {alert.vehicleId}
                      </span>
                    </div>
                    
                    {/* Message content */}
                    <p className="text-sm text-gray-800 break-words mb-2">{alert.message}</p>
                    
                    {/* Emergency details */}
                    {alert.metadata?.emergencyType && (
                      <p className="text-xs text-red-600 font-medium mb-1">
                        Emergency Type: {alert.metadata.emergencyType.toUpperCase()}
                      </p>
                    )}
                    {alert.metadata?.urgencyLevel && (
                      <p className="text-xs text-orange-600 font-medium mb-2">
                        Urgency: {alert.metadata.urgencyLevel.toUpperCase()}
                      </p>
                    )}
                    
                    {/* Timestamp */}
                    <p className="text-xs text-gray-500 mb-3">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                    
                    {/* Action buttons - arranged horizontally but constrained */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id, alert.type)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                        title="Acknowledge alert"
                      >
                        ACK
                      </button>
                      <button
                        onClick={() => handleResolveAlert(alert.id, alert.type)}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                        title="Resolve alert"
                      >
                        RESOLVE
                      </button>
                      {alert.type === 'SOS' && (
                        <button
                          onClick={() => sendEmergencyResponse(alert)}
                          className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
                          title="Send emergency response"
                        >
                          RESPOND
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Alert Panel Overlay */}
      {showAlertPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md h-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-red-600" />
                Active Alerts ({realtimeAlerts.length})
              </h3>
              <button
                onClick={() => setShowAlertPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {realtimeAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">No active alerts</p>
                  <p className="text-sm text-gray-500">All systems operating normally</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-hidden">
                  {realtimeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)} break-words`}
                    >
                      {/* Header with alert type and vehicle */}
                      <div className="mb-2">
                        <div className="flex items-center mb-1 flex-wrap">
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {alert.type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate" title={`Vehicle ${alert.vehicleId}`}>
                          Vehicle {alert.vehicleId}
                        </span>
                      </div>
                      
                      {/* Message content */}
                      <p className="text-sm text-gray-800 break-words mb-2">{alert.message}</p>
                      
                      {/* Timestamp */}
                      <p className="text-xs text-gray-500 mb-3">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                      
                      {/* Action buttons - arranged horizontally but constrained */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id, alert.type)}
                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                          title="Acknowledge alert"
                        >
                          ACK
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id, alert.type)}
                          className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                          title="Resolve alert"
                        >
                          RESOLVE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Critical: {alertStats.critical || 0}</span>
                  <span>High: {alertStats.high || 0}</span>
                  <span>Medium: {alertStats.medium || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetDashboard;