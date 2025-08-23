import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import the marker icon image
import markerIconPng from '../../assets/locationpoi.svg';

// Create a custom icon
const markerIcon = new L.Icon({
  iconUrl: markerIconPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: null, // Optional: You can add a shadow icon if needed
});

function MapComponent() {
  return (
    <MapContainer center={[16.4649, 80.5083]} zoom={10} style={{ height: '300px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[16.4649, 80.5083]} icon={markerIcon}>
        <Popup>Current location</Popup>
      </Marker>
    </MapContainer>
  );
}

export default MapComponent;