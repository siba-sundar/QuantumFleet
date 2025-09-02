import React from 'react';
import GoogleMapComponent from '../common/GoogleMapComponent.jsx';

function MapComponent() {
  return (
    <GoogleMapComponent
      center={{ lat: 16.4649, lng: 80.5083 }}
      zoom={10}
      markers={[
        {
          position: { lat: 16.4649, lng: 80.5083 },
          title: "Current location",
          icon: {
            url: '/locationpoi.svg',
            scaledSize: window.google?.maps ? new window.google.maps.Size(25, 41) : { width: 25, height: 41 }
          }
        }
      ]}
      className="w-full h-80"
    />
  );
}

export default MapComponent;