import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DriverSummaryCard from "../../Post Department/utils/DriverSummaryCard.jsx"
import SideBar from "../../Global/sideBar.jsx"
import { fetchEnhancedFleet } from '../../../utils/api.js'
import { DriverRepository } from '../../../repositories/DriverRepository.js'
import { useAuth } from '../../../hooks/useAuth.jsx';
import alertService from '../../../services/AlertManagementService.js'
import { MapPin, Clock, Navigation, Bell, Truck, CheckCircle } from 'lucide-react'

function TruckDetails() {
    const navigate = useNavigate();
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const { user } = useAuth();

    // Load enhanced fleet data including reservations
    useEffect(() => {
        loadFleetData();
    }, []);

    const loadFleetData = async () => {
        try {
            setLoading(true);
            
            // Get business UID for filtering if user is a business
            const businessUid = user?.userType === 'business' ? user?.uid : null;
            
            // Fetch enhanced fleet data filtered by business
            const response = await fetchEnhancedFleet(true, true, businessUid);
            console.log('Enhanced fleet response:', response);
            
            // Enhance trucks with reservation data if available
            let enhancedTrucks = response.trucks || [];
            
            // For each truck, try to get complete reservation data
            if (enhancedTrucks.length > 0) {
                for (const truck of enhancedTrucks) {
                    if (truck.reservationSummary?.assignedDriver?.id) {
                        try {
                            const reservationResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4001'}/api/reservations/driver/${truck.reservationSummary.assignedDriver.id}`);
                            if (reservationResponse.ok) {
                                const resData = await reservationResponse.json();
                                const reservation = resData.reservation;
                                
                                if (reservation && reservation.trucks?.[0]) {
                                    // Enhance truck with complete reservation data
                                    Object.assign(truck, {
                                        reservationDetails: {
                                            ...truck.reservationDetails,
                                            checkpoints: reservation.trucks[0].checkpoints || [],
                                            route: {
                                                pickupLocation: reservation.trucks[0].pickupLocation,
                                                dropLocation: reservation.trucks[0].dropLocation,
                                                pickupDate: reservation.trucks[0].pickupDate,
                                                dropDate: reservation.trucks[0].dropDate,
                                            },
                                            pickupLocationData: reservation.trucks[0].pickupLocationData,
                                            dropLocationData: reservation.trucks[0].dropLocationData,
                                            customerInfo: reservation.customerInfo,
                                            totalCost: reservation.totalCost,
                                            paymentStatus: reservation.paymentStatus
                                        },
                                        pickupLocationData: reservation.trucks[0].pickupLocationData,
                                        dropLocationData: reservation.trucks[0].dropLocationData
                                    });
                                }
                            }
                        } catch (error) {
                            console.warn(`Error loading reservation data for truck ${truck.id}:`, error);
                        }
                    }
                }
            }
            
            setTrucks(enhancedTrucks);
        } catch (error) {
            console.error('Error loading fleet data:', error);
            setError('Failed to load fleet data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Subscribe to real-time alerts
    useEffect(() => {
        if (user?.id) {
            const unsubscribe = alertService.subscribeToAlerts(
                user.id,
                user.userType || 'business',
                (newAlerts) => {
                    setAlerts(newAlerts.filter(alert => alert.status === 'active'));
                }
            );
            
            return unsubscribe;
        }
    }, [user]);

    // Refresh data periodically
    useEffect(() => {
        const interval = setInterval(() => {
            loadFleetData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const [selectedTruckId, setSelectedTruckId] = useState(null);
    const selectedTruck = useMemo(() => trucks.find(t => t.id === selectedTruckId) || trucks[0], [trucks, selectedTruckId]);
    const driverRepo = new DriverRepository();

    // Resolve and set driver UID for a given truck
    const resolveDriverForTruck = async (truck) => {
        if (!truck) return;
        
        // Only get driver ID from the truck data (which is already business-filtered)
        const directUid = truck?.driver?.id || truck?.reservationSummary?.assignedDriver?.id;
        if (directUid) {
            setSelectedDriverId(String(directUid));
        } else {
            // Clear driver selection if no driver is assigned to this truck
            setSelectedDriverId(null);
        }
    };
    
    // Initialize with first truck
    useEffect(() => {
        if (trucks.length > 0 && !selectedTruckId) {
            const firstTruck = trucks[0];
            setSelectedTruckId(firstTruck.id);
            resolveDriverForTruck(firstTruck);
        }
    }, [trucks, selectedTruckId]);

    // Generate route information from database data
    const routeInfo = useMemo(() => {
        if (!selectedTruck) return null;
        
        const reservationDetails = selectedTruck.reservationDetails || selectedTruck.reservationSummary;
        
        if (!reservationDetails) return null;
        
        return {
            pickupLocation: reservationDetails.route?.pickupLocation || reservationDetails.pickupLocation || 'Unknown Pickup',
            dropLocation: reservationDetails.route?.dropLocation || reservationDetails.dropLocation || 'Unknown Drop',
            customerName: reservationDetails.customerInfo?.name || reservationDetails.customerName || 'Unknown Customer',
            checkpoints: reservationDetails.checkpoints || [],
            currentCheckpoint: 0, // This could be tracked in real-time
            pickupLocationData: selectedTruck.pickupLocationData || reservationDetails.pickupLocationData,
            dropLocationData: selectedTruck.dropLocationData || reservationDetails.dropLocationData
        };
    }, [selectedTruck]);

    // Create checkpoints array for display
    const routeCheckpoints = useMemo(() => {
        if (!routeInfo || !routeInfo.checkpoints) return [];
        
        const checkpoints = [];
        
        // Add pickup as first checkpoint
        if (routeInfo.pickupLocationData?.coordinates) {
            checkpoints.push({
                id: 'pickup',
                name: `Origin - ${routeInfo.pickupLocation}`,
                status: 'completed',
                arrivalTime: '—',
                departureTime: 'Started',
                type: 'start',
                location: routeInfo.pickupLocationData.coordinates
            });
        }
        
        // Add intermediate checkpoints from database
        routeInfo.checkpoints.forEach((cp, index) => {
            if (cp?.locationData?.coordinates) {
                checkpoints.push({
                    id: `checkpoint_${index}`,
                    name: cp.location || cp.locationData.address || `Checkpoint ${index + 1}`,
                    status: index === 0 ? 'current' : 'pending',
                    arrivalTime: cp.date ? new Date(cp.date).toLocaleTimeString() : 'Expected',
                    departureTime: cp.dropDate ? new Date(cp.dropDate).toLocaleTimeString() : 'TBD',
                    type: 'checkpoint',
                    location: cp.locationData.coordinates,
                    details: {
                        goodsType: cp.goodsType,
                        weight: cp.weight,
                        handlingInstructions: cp.handlingInstructions
                    }
                });
            }
        });
        
        // Add drop as final checkpoint
        if (routeInfo.dropLocationData?.coordinates) {
            checkpoints.push({
                id: 'drop',
                name: `Destination - ${routeInfo.dropLocation}`,
                status: 'pending',
                arrivalTime: 'Expected',
                departureTime: 'Final Destination',
                type: 'end',
                location: routeInfo.dropLocationData.coordinates
            });
        }
        
        return checkpoints;
    }, [routeInfo]);

    // Generate Google Maps Embed URL with directions and waypoints
    const googleMapsEmbedData = useMemo(() => {
        if (!routeInfo) return null;
        
        // Get pickup location coordinates
        let pickup = null;
        if (routeInfo?.pickupLocationData?.coordinates) {
            pickup = routeInfo.pickupLocationData.coordinates;
        } else if (selectedTruck?.pickupLocationData?.coordinates) {
            pickup = selectedTruck.pickupLocationData.coordinates;
        }
        
        // Get drop location coordinates
        let drop = null;
        if (routeInfo?.dropLocationData?.coordinates) {
            drop = routeInfo.dropLocationData.coordinates;
        } else if (selectedTruck?.dropLocationData?.coordinates) {
            drop = selectedTruck.dropLocationData.coordinates;
        }
        
        // Get checkpoint coordinates
        const checkpoints = routeInfo?.checkpoints || [];
        
        // Create waypoints array for map display
        const waypoints = [];
        
        // Add pickup location
        if (pickup) {
            waypoints.push({
                lat: pickup.lat,
                lng: pickup.lng,
                name: routeInfo.pickupLocation || 'Pickup Location',
                type: 'pickup'
            });
        }
        
        // Add all checkpoints
        checkpoints.forEach((cp, index) => {
            if (cp?.locationData?.coordinates) {
                waypoints.push({
                    lat: cp.locationData.coordinates.lat,
                    lng: cp.locationData.coordinates.lng,
                    name: cp.location || cp.locationData.address || `Checkpoint ${index + 1}`,
                    type: 'checkpoint',
                    details: {
                        goodsType: cp.goodsType,
                        weight: cp.weight,
                        handlingInstructions: cp.handlingInstructions,
                        date: cp.date
                    }
                });
            }
        });
        
        // Add drop location
        if (drop) {
            waypoints.push({
                lat: drop.lat,
                lng: drop.lng,
                name: routeInfo.dropLocation || 'Drop Location',
                type: 'drop'
            });
        }
        
        if (waypoints.length === 0) {
            return null;
        }
        
        // Calculate center point for the map
        const center = {
            lat: waypoints.reduce((sum, wp) => sum + wp.lat, 0) / waypoints.length,
            lng: waypoints.reduce((sum, wp) => sum + wp.lng, 0) / waypoints.length
        };
        
        // Generate Google Maps Embed URL
        const embedBaseUrl = 'https://www.google.com/maps/embed/v1/directions';
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
        
        let embedUrl = null;
        let externalUrl = null;
        
        if (pickup && drop && apiKey !== 'YOUR_API_KEY_HERE') {
            embedUrl = `${embedBaseUrl}?key=${apiKey}`;
            embedUrl += `&origin=${pickup.lat},${pickup.lng}`;
            embedUrl += `&destination=${drop.lat},${drop.lng}`;
            
            // Add waypoints (checkpoints)
            const checkpointCoords = checkpoints
                .map(cp => cp?.locationData?.coordinates)
                .filter(Boolean)
                .map(coord => `${coord.lat},${coord.lng}`)
                .slice(0, 23);
            
            if (checkpointCoords.length > 0) {
                embedUrl += `&waypoints=${checkpointCoords.join('|')}`;
            }
            
            embedUrl += '&mode=driving&language=en&region=in';
            
            const coords = waypoints.map(wp => `${wp.lat},${wp.lng}`);
            externalUrl = `https://www.google.com/maps/dir/${coords.join('/')}?hl=en&gl=in`;
        } else if (pickup && drop) {
            const locations = waypoints.map(wp => encodeURIComponent(wp.name));
            externalUrl = `https://www.google.com/maps/dir/${locations.join('/')}?hl=en&gl=in`;
            embedUrl = `https://www.google.com/maps?q=${pickup.lat},${pickup.lng}&output=embed&zoom=10`;
        }
        
        return {
            embedUrl,
            externalUrl,
            waypoints,
            center,
            hasValidData: waypoints.length >= 2
        };
    }, [routeInfo, selectedTruck]);

    // Handle truck selection
    const handleTruckSelect = async (id) => {
        const value = String(id || '');
        const asTruck = trucks.find(t => t.id === value);
        if (asTruck) {
            setSelectedTruckId(value);
            await resolveDriverForTruck(asTruck);
        } else {
            setSelectedDriverId(value);
        }
    };

    // Truck details for display
    const truckDetails = useMemo(() => {
        if (!selectedTruck) return null;
        
        return {
            deliveryStatus: selectedTruck.status || 'Unknown',
            truckNumber: selectedTruck.number || 'N/A',
            currentSpeed: selectedTruck.currentSpeed || 0,
            distanceCovered: selectedTruck.distanceCovered || 0,
            timeToDestination: selectedTruck.timeToDestination || 'Calculating...'
        };
    }, [selectedTruck]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading fleet information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 text-lg">{error}</p>
                    <button 
                        onClick={loadFleetData}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (trucks.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg text-gray-600">No trucks found in the fleet.</p>
                    <p className="text-sm text-gray-500 mt-2">Create a reservation to see trucks here.</p>
                    <button 
                        onClick={() => navigate('/business/truck-reservation')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Create Reservation
                    </button>
                </div>
            </div>
        );
    }

    if (!selectedTruck) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center max-w-4xl mx-auto p-6">
                    <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No truck selected</h2>
                    <p className="text-gray-600 text-lg mb-6">Please select a truck from the sidebar to view tracking details.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="grid grid-cols-[20%_80%] h-screen">
                {/* Sidebar */}
                <SideBar trucks={trucks} selectedId={selectedDriverId ?? selectedTruckId} onSelect={handleTruckSelect} businessUid={user?.userType === 'business' ? user?.uid : null} />

                {/* Main Content */}
                <div className="p-6 overflow-auto">
                    {/* Modern Header */}
                    <div className="mb-6">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <Truck className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">Fleet Tracking</h1>
                                        <p className="text-gray-600">Monitor your trucks in real-time</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center text-gray-600">
                                        <Truck className="w-4 h-4 mr-2" />
                                        <span className="font-medium">Truck:</span> {truckDetails?.truckNumber}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        truckDetails?.deliveryStatus === 'Reserved' ? 'bg-blue-100 text-blue-800' :
                                        truckDetails?.deliveryStatus === 'In Transit' ? 'bg-green-100 text-green-800' :
                                        truckDetails?.deliveryStatus === 'Delivered' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {truckDetails?.deliveryStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Two Column Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Left Column - Map (2/3 width on large screens) */}
                        <div className="xl:col-span-2">
                            <div className="bg-white rounded-xl shadow-lg p-6 h-[800px]">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <MapPin className="w-6 h-6 text-green-600 mr-3" />
                                        <h2 className="text-xl font-bold text-gray-900">Live Location Tracking</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm text-gray-500">
                                            {selectedTruck?.location ? 
                                                `${selectedTruck.location.lat?.toFixed(4)}, ${selectedTruck.location.lng?.toFixed(4)}` : 
                                                'Location unavailable'
                                            }
                                        </div>
                                        {googleMapsEmbedData?.externalUrl && (
                                            <button
                                                onClick={() => window.open(googleMapsEmbedData.externalUrl, '_blank')}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center"
                                            >
                                                <Navigation className="w-4 h-4 mr-2" />
                                                Open in Maps
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Route Info Banner */}
                                {routeInfo && (
                                    <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-600 font-medium mb-1">📍 From</p>
                                                <p className="text-gray-900 font-semibold text-xs leading-tight">{routeInfo.pickupLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 font-medium mb-1">🎯 To</p>
                                                <p className="text-gray-900 font-semibold text-xs leading-tight">{routeInfo.dropLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 font-medium mb-1">👤 Customer</p>
                                                <p className="text-gray-900 font-semibold text-xs">{routeInfo.customerName}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Map Container */}
                                <div className="h-[calc(100%-140px)] rounded-lg overflow-hidden">
                                    {googleMapsEmbedData?.hasValidData ? (
                                        <div className="h-full relative">
                                            {googleMapsEmbedData.embedUrl && !googleMapsEmbedData.embedUrl.includes('YOUR_API_KEY_HERE') ? (
                                                // Google Maps Embed iframe when API key is available
                                                <iframe
                                                    title="Route with Checkpoints"
                                                    src={googleMapsEmbedData.embedUrl}
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0 }}
                                                    allowFullScreen=""
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                ></iframe>
                                            ) : (
                                                // Custom route visualization when no API key
                                                <div className="h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 flex flex-col">
                                                    <div className="flex-1 flex items-center justify-center">
                                                        <div className="text-center max-w-md">
                                                            <Navigation className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                                                            <h3 className="text-xl font-bold text-gray-800 mb-4">Route Overview</h3>
                                                            
                                                            {/* Route Visualization */}
                                                            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                                                                <div className="space-y-3">
                                                                    {googleMapsEmbedData.waypoints.map((waypoint, index) => (
                                                                        <div key={index} className="flex items-center">
                                                                            <div className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${
                                                                                waypoint.type === 'pickup' ? 'bg-green-500' :
                                                                                waypoint.type === 'drop' ? 'bg-red-500' :
                                                                                'bg-blue-500'
                                                                            }`}></div>
                                                                            <div className="text-left flex-1">
                                                                                <p className="text-sm font-medium text-gray-800">
                                                                                    {waypoint.type === 'pickup' ? '📍 Start' :
                                                                                     waypoint.type === 'drop' ? '🎯 End' :
                                                                                     `🛑 Stop ${index}`}
                                                                                </p>
                                                                                <p className="text-xs text-gray-600 leading-tight">{waypoint.name}</p>
                                                                                {waypoint.details && (
                                                                                    <div className="mt-1 flex gap-1">
                                                                                        {waypoint.details.goodsType && (
                                                                                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                                                                                {waypoint.details.goodsType}
                                                                                            </span>
                                                                                        )}
                                                                                        {waypoint.details.weight && (
                                                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                                                                {waypoint.details.weight} kg
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            
                                                            <p className="text-sm text-gray-600 mb-4">
                                                                Complete route with {googleMapsEmbedData.waypoints.length} waypoints
                                                            </p>
                                                            
                                                            <button
                                                                onClick={() => window.open(googleMapsEmbedData.externalUrl, '_blank')}
                                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center"
                                                            >
                                                                <Navigation className="w-4 h-4 mr-2" />
                                                                Open Full Route in Google Maps
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                                            <div className="text-center">
                                                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <p className="text-gray-600 text-lg">No route data available</p>
                                                <p className="text-gray-500 text-sm">Route will appear when pickup and drop locations are set</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Sidebar (1/3 width on large screens) */}
                        <div className="space-y-6">
                            {/* Driver Information Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center mb-4">
                                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Driver Information</h2>
                                </div>
                                
                                {selectedDriverId ? (
                                    <DriverSummaryCard driverId={selectedDriverId} truck={selectedTruck} />
                                ) : (
                                    <div className="flex items-center justify-center h-32">
                                        <p className="text-gray-500">No driver assigned</p>
                                    </div>
                                )}
                            </div>

                            {/* Route Checkpoints Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex items-center mb-4">
                                    <CheckCircle className="w-6 h-6 text-purple-600 mr-3" />
                                    <h2 className="text-lg font-bold text-gray-900">Route Checkpoints</h2>
                                </div>
                                
                                {routeCheckpoints.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Progress Overview */}
                                        <div className="bg-purple-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-purple-700">Progress</span>
                                                <span className="text-sm text-purple-600">
                                                    {routeCheckpoints.filter(cp => cp.status === 'completed').length}/{routeCheckpoints.length}
                                                </span>
                                            </div>
                                            <div className="w-full bg-purple-200 rounded-full h-2">
                                                <div 
                                                    className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                                                    style={{ 
                                                        width: `${(routeCheckpoints.filter(cp => cp.status === 'completed').length / routeCheckpoints.length) * 100}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        {/* Checkpoint List */}
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {routeCheckpoints.map((checkpoint, index) => (
                                                <div key={checkpoint.id} className="flex items-start space-x-3">
                                                    <div className="flex-shrink-0 flex flex-col items-center">
                                                        <div className={`w-4 h-4 rounded-full ${
                                                            checkpoint.status === 'completed' ? 'bg-green-500' :
                                                            checkpoint.status === 'current' ? 'bg-yellow-500' :
                                                            'bg-gray-300'
                                                        } ${checkpoint.status === 'current' ? 'animate-pulse' : ''}`}></div>
                                                        {index < routeCheckpoints.length - 1 && (
                                                            <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <h4 className={`text-sm font-medium ${
                                                                checkpoint.status === 'current' ? 'text-yellow-700' :
                                                                checkpoint.status === 'completed' ? 'text-green-700' :
                                                                'text-gray-700'
                                                            }`}>
                                                                {checkpoint.name}
                                                            </h4>
                                                            {checkpoint.type === 'start' && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Start</span>}
                                                            {checkpoint.type === 'end' && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">End</span>}
                                                            {checkpoint.type === 'checkpoint' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Stop</span>}
                                                        </div>
                                                        <div className="flex items-center space-x-4 mb-2">
                                                            <div className="flex items-center space-x-1">
                                                                <Clock className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs text-gray-600">Arrival: {checkpoint.arrivalTime}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <Clock className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs text-gray-600">Departure: {checkpoint.departureTime}</span>
                                                            </div>
                                                        </div>
                                                        {checkpoint.details && (
                                                            <div className="flex gap-1 mt-1">
                                                                {checkpoint.details.goodsType && (
                                                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                                                        {checkpoint.details.goodsType}
                                                                    </span>
                                                                )}
                                                                {checkpoint.details.weight && (
                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                                        {checkpoint.details.weight} kg
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600">No route checkpoints available</p>
                                        <p className="text-gray-500 text-sm mt-1">Checkpoints will appear when a route is assigned</p>
                                    </div>
                                )}
                            </div>

                            {/* Truck Statistics Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Truck Statistics</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Current Speed</span>
                                        <span className="font-semibold text-gray-900">{truckDetails?.currentSpeed || 0} km/h</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Distance Covered</span>
                                        <span className="font-semibold text-gray-900">{truckDetails?.distanceCovered || 0} km</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">ETA</span>
                                        <span className="font-semibold text-gray-900">{truckDetails?.timeToDestination}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            truckDetails?.deliveryStatus === 'In Transit' ? 'bg-green-100 text-green-800' :
                                            truckDetails?.deliveryStatus === 'Delivered' ? 'bg-purple-100 text-purple-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {truckDetails?.deliveryStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Alerts Card */}
                            {alerts.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <div className="flex items-center mb-4">
                                        <Bell className="w-6 h-6 text-yellow-600 mr-3" />
                                        <h2 className="text-lg font-bold text-gray-900">Active Alerts</h2>
                                        <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                            {alerts.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {alerts.slice(0, 3).map((alert, index) => (
                                            <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <p className="text-sm font-medium text-yellow-800">{alert.type}</p>
                                                <p className="text-xs text-yellow-700 mt-1">{alert.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TruckDetails
