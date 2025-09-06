import axios from 'axios';
import polyline from '@mapbox/polyline';
import dotenv from 'dotenv';

dotenv.config();

// Retrieve route details with toll cost and decoded GeoJSON coordinates
const getRouteDetails = async ({ origin, destination, intermediates }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  // 1) Filter and geocode origin, intermediates, destination
  const validIntermediates = Array.isArray(intermediates)
    ? intermediates.filter(addr => typeof addr === 'string' && addr.trim().length > 0)
    : [];
  const allAddrs = [origin, ...validIntermediates, destination];
  const points = await Promise.all(
    allAddrs.map(addr =>
      axios.get(geocodeUrl, { params: { address: addr, key: apiKey } })
        .then(r => r.data.results[0].geometry.location)
        .then(loc => ({ latitude: loc.lat, longitude: loc.lng }))
    )
  );
  const originPt = points[0];
  const destPt = points[points.length - 1];
  const interPts = points.slice(1, points.length - 1);

  // 2) Compute routes via Routes API v2
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    // Include travelAdvisory to ensure tollInfo data is fetched
    'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.legs,routes.legs.steps.startLocation,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo.estimatedPrice,routes.travelAdvisory'
  };
  const body = {
    origin: { location: { latLng: originPt } },
    destination: { location: { latLng: destPt } },
    intermediates: interPts.map(pt => ({ location: { latLng: pt } })),
    travelMode: 'DRIVE',
    computeAlternativeRoutes: true,
  };
  try {
    const res = await axios.post(routesUrl, body, { headers });
    const routes = res.data.routes;
    if (!routes?.length) throw new Error('No routes returned');

    const alternatives = routes.map((r, i) => {
      const dist = r.distanceMeters;
      const dur = r.duration; // e.g. 'PT15M'
      const tollPrices = r.travelAdvisory?.tollInfo?.estimatedPrice || [];
      // Sum estimated toll prices (units + nanos)
      let tollCost = tollPrices.reduce(
        (sum, p) => sum + (p.units || 0) + (p.nanos || 0) / 1e9,
        0
      );
      // If there are no price entries, treat tollCost as 'no data'
      if (tollPrices.length === 0) {
        tollCost = null;
      }
      // Currency code from first price entry (or null)
      const tollCurrency = tollPrices.length > 0 ? tollPrices[0].currencyCode : null;
      // Extract turn points: each step's start location
      const turns = Array.isArray(r.legs)
        ? r.legs.flatMap(leg =>
            Array.isArray(leg.steps)
              ? leg.steps.map(step => ({
                  lat: step.startLocation?.latLng?.latitude,
                  lng: step.startLocation?.latLng?.longitude
                }))
              : []
          )
        : [];
      return {
        route_id: `r${i+1}`,
        summary: Array.isArray(r.routeLabels) ? r.routeLabels.join(', ') : '',
        distance_km: dist/1000,
        duration_min: Math.round((parseInt(dur.match(/\d+/)?.[0]||0,10))/60),
        toll_cost: tollCost,
        toll_currency: tollCurrency,
        turns // array of {lat, lng} at each maneuver
      };
    });
    const primary = alternatives[0];
    return {
      from: origin,
      to: destination,
      distance_km: primary.distance_km,
      duration_min: primary.duration_min,
      duration_in_traffic_min: 0,
      traffic_model: 'best_guess',
      toll_cost: primary.toll_cost,
      same_corridor: [],
      alternatives
    };
  } catch (err) {
    console.error('Error fetching route details:', err.response ? JSON.stringify(err.response.data, null,2) : err.message);
    throw new Error('Failed to fetch route details.');
  }
};

export { getRouteDetails };