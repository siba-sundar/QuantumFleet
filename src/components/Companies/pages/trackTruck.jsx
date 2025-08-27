import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Map from "../../Post Department/utils/map.jsx"
import TruckLoad from "../../Post Department/utils/loadDetails.jsx"
import Location from "../../Post Department/utils/loaction.jsx"
import Graph from "../../Post Department/utils/graphComp.jsx"
import EnhancedDriverCard from '../../Global/EnhancedDriverCard.jsx'
import DriverInfoDisplay from '../../Global/DriverInfoDisplay.jsx'
import SideBar from "../../Global/sideBar.jsx"
import QR from "../../../assets/QR.svg"
import { fetchEnhancedFleet } from '../../../utils/api.js'

function TruckDetails() {
    const navigate = useNavigate();
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDriverInfo, setShowDriverInfo] = useState(false);
    const [selectedDriverInfo, setSelectedDriverInfo] = useState(null);

    // Load enhanced fleet data including reservations
    useEffect(() => {
        loadFleetData();
    }, []);

    const loadFleetData = async () => {
        try {
            setLoading(true);
            const response = await fetchEnhancedFleet(true, true); // Include reserved trucks and sentiment
            console.log('Enhanced fleet response:', response);
            setTrucks(response.trucks || []);
        } catch (error) {
            console.error('Error loading fleet data:', error);
            setError('Failed to load fleet data: ' + error.message);
            // Fallback to static data if API fails
            setTrucks([
                { 
                    id: 'fallback_1', 
                    number: 'HP06B4587', 
                    driver: { name: 'Shyan Lal', id: 'driver_1' }, 
                    status: 'In Transit',
                    isReserved: false
                },
                { 
                    id: 'fallback_2', 
                    number: 'PB08N1234', 
                    driver: { name: 'Raj Kumar', id: 'driver_2' }, 
                    status: 'Delivered',
                    isReserved: false
                },
                { 
                    id: 'fallback_3', 
                    number: 'DL05G6789', 
                    driver: { name: 'Mohit Singh', id: 'driver_3' }, 
                    status: 'In Transit',
                    isReserved: true,
                    reservationSummary: {
                        customerName: 'ABC Company',
                        route: 'Delhi → Mumbai',
                        pickupDate: new Date(),
                        assignedDriver: { name: 'Mohit Singh', id: 'driver_3' }
                    }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Refresh data periodically
    useEffect(() => {
        const interval = setInterval(() => {
            loadFleetData();
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    // Use the enhanced trucks data from state instead of static array
    const [selectedTruckId, setSelectedTruckId] = useState(null);
    const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0];
    
    // Update selected truck when trucks data changes
    useEffect(() => {
        if (trucks.length > 0 && !selectedTruckId) {
            setSelectedTruckId(trucks[0].id);
        }
    }, [trucks, selectedTruckId]);

    // Handle truck selection and show driver info for reserved trucks
    const handleTruckSelect = (truckId) => {
        setSelectedTruckId(truckId);
        
        const truck = trucks.find(t => t.id === truckId);
        if (truck && truck.isReserved && truck.reservationSummary?.assignedDriver) {
            setSelectedDriverInfo({
                driver: truck.reservationSummary.assignedDriver,
                truck: truck,
                reservation: truck.reservationSummary
            });
            setShowDriverInfo(true);
        } else {
            setShowDriverInfo(false);
            setSelectedDriverInfo(null);
        }
    };

    // Close driver info display
    const closeDriverInfo = () => {
        setShowDriverInfo(false);
        setSelectedDriverInfo(null);
    };

    // Dynamic data based on selected truck
    const truckData = selectedTruck ? [{
        id: selectedTruck.id,
        number: selectedTruck.number,
        driver: selectedTruck.driver?.name || selectedTruck.driver || 'Unknown Driver',
        status: selectedTruck.status,
        location: { lat: 28.7041, lng: 77.1025 },  // Example coordinates, would come from API in real implementation
        distanceCovered: 150,
        avgSpeed: 60,
        timeToDestination: "45"
    }] : [];

    const truckLoadPercentage = 80;
    const truckDetails = {
        number: selectedTruck?.number || 'N/A',
        deliveryStatus: selectedTruck?.status || 'Unknown',
        maxLoad: 10000, // Max load in kg
        currentLoad: 8600,
        maintenance: "12-Dec-03", // Current load in kg
    };

    const sampleCheckpoints = [
        { name: 'Checkpoint 1', position: '5%' },
        { name: 'Checkpoint 2', position: '25%' },
        { name: 'Checkpoint 3', position: '45%' },
        { name: 'Checkpoint 4', position: '65%' },
        { name: 'Checkpoint 5', position: '85%' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-lg text-gray-600">Loading Fleet Data...</p>
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

    // Show a message if no trucks are available
    if (trucks.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg text-gray-600">No trucks found in the fleet.</p>
                    <p className="text-sm text-gray-500 mt-2">Create a reservation to see trucks here.</p>
                    <button 
                        onClick={() => navigate('/business/reservation')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Create Reservation
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className='grid grid-cols-[20%_80%]'>
                <SideBar trucks={trucks} selectedId={selectedTruckId} onSelect={handleTruckSelect} />

                <div className="relative">
                    {/* Driver Info Display Modal/Overlay */}
                    {showDriverInfo && selectedDriverInfo && (
                        <div className="absolute top-4 right-4 z-50 w-96">
                            <DriverInfoDisplay
                                driver={selectedDriverInfo.driver}
                                truck={selectedDriverInfo.truck}
                                reservation={selectedDriverInfo.reservation}
                                onClose={closeDriverInfo}
                                className="shadow-2xl"
                            />
                        </div>
                    )}
                    
                    <div>
                        <div className="flex gap-4">
                            <Map trucks={truckData} selectedTruck={selectedTruck} />
                            <div>
                                <TruckLoad loadPercentage={truckLoadPercentage} truckDetails={truckDetails} selectedTruck={selectedTruck} />
                                <div className="w-[20%]">
                                    <div className="bg-[#020073] mt-4 rounde-sm w-[18vw] h-[40vh] p-4 rounded-md">
                                        <p className="text-lg text-white font-semibold">Truck QR</p>
                                        <img className="w-full h-full p-8" src={QR} alt="Truck QR Code" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex">
                            <div className="w-[70%]">
                                <div
                                 className="w-full"
                                 onClick={() => navigate('/driver-details')}
                                >
                                    <EnhancedDriverCard 
                                        driverId={selectedTruck?.driver?.id || 'driver_001'}
                                        driverName={selectedTruck?.driver?.name || selectedTruck?.driver || 'Unknown Driver'}
                                        driverData={{
                                            name: selectedTruck?.driver?.name || selectedTruck?.driver || 'Unknown Driver',
                                            age: selectedTruck?.driver?.age || 35,
                                            licenseNumber: selectedTruck?.driver?.licenseNumber || '123456789',
                                            phone: selectedTruck?.driver?.phone || '7013456872',
                                            employeeId: selectedTruck?.driver?.employeeId || 'EMP001',
                                            experience: selectedTruck?.driver?.experience || 8,
                                            department: selectedTruck?.driver?.department || 'Transport',
                                            currentTruck: selectedTruck?.number || 'N/A'
                                        }}
                                        showHistory={true}
                                        className="cursor-pointer hover:shadow-xl transition-shadow duration-300"
                                    />
                                </div>

                                <div className="w-full">
                                    <Graph />
                                </div>

                            </div>


                            <div className="ml-8 mt-4 pl-8">
                                <Location checkpoints={sampleCheckpoints} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default TruckDetails