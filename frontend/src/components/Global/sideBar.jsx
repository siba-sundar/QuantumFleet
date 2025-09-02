import { useState, useEffect } from 'react';
import './sideBar.css';  // Import custom CSS for the scrollbar
import { fetchEnhancedFleet } from '../../utils/api.js';

// assets
import searchIcon from "../../assets/search-icon.svg"

function SideBar({ trucks: propTrucks, selectedId, onSelect, businessUid }) {
    const [filter, setFilter] = useState('All Shipping');
    const [selectedTruck, setSelectedTruck] = useState(null);
    const [enhancedTrucks, setEnhancedTrucks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Load enhanced fleet data on component mount and set up auto-refresh
    useEffect(() => {
        loadEnhancedFleet();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadEnhancedFleet();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [businessUid]); // Reload when businessUid changes

    // If parent doesn't control selection, initialize local selected truck
    useEffect(() => {
        if (!selectedId && enhancedTrucks.length > 0) {
            setSelectedTruck(enhancedTrucks[0].id);
        }
    }, [enhancedTrucks, selectedId]);

    const loadEnhancedFleet = async () => {
        try {
            // Pass businessUid to filter trucks by business context
            const fleetData = await fetchEnhancedFleet(true, true, businessUid);
            
            // Combine enhanced fleet data with any prop trucks
            const allTrucks = [...(fleetData.trucks || []), ...(propTrucks || [])];
            
            // Remove duplicates based on ID
            const uniqueTrucks = allTrucks.filter((truck, index, self) => 
                index === self.findIndex(t => t.id === truck.id)
            );
            
            setEnhancedTrucks(uniqueTrucks);
        } catch (error) {
            console.error('Error loading enhanced fleet:', error);
            // Fallback to prop trucks if API fails
            setEnhancedTrucks(propTrucks || []);
        }
    };

    // Filter trucks based on search term and filter
    const getFilteredTrucks = () => {
        let filtered = enhancedTrucks;
        
        // Apply status filter
        if (filter !== 'All Shipping') {
            filtered = filtered.filter(truck => {
                if (filter === 'Reserved') return truck.isReserved;
                return truck.status === filter;
            });
        }
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(truck => 
                truck.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                truck.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                truck.reservationSummary?.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    };
    
    const filteredTrucks = getFilteredTrucks();
    const activeId = selectedId ?? selectedTruck;

    const getStatusColor = (status, isReserved) => {
        if (isReserved) return 'text-purple-500';
        if (status === 'In Transit') return 'text-yellow-500';
        if (status === 'Delivered') return 'text-green-500';
        if (status === 'Maintenance') return 'text-red-500';
        return 'text-gray-500';
    };

    const getSentimentIndicator = (sentimentScore) => {
        if (!sentimentScore) return null;
        
        let bgColor = 'bg-gray-400';
        if (sentimentScore >= 81) bgColor = 'bg-green-500';
        else if (sentimentScore >= 61) bgColor = 'bg-blue-500';
        else if (sentimentScore >= 41) bgColor = 'bg-yellow-500';
        else if (sentimentScore >= 21) bgColor = 'bg-orange-500';
        else bgColor = 'bg-red-500';
        
        return (
            <div className={`w-3 h-3 rounded-full ${bgColor} flex items-center justify-center`} title={`Sentiment: ${sentimentScore}/100`}>
                <span className="text-xs text-white font-bold">{Math.round(sentimentScore/10)}</span>
            </div>
        );
    };

    return (
        <div>
            <div className="fixed left-0 top-[80px] h-[calc(100vh-80px)] w-[20%] shadow-xl mt-1 bg-white z-40">
                {/* Dropdown Filter */}
                <div className="px-4 pt-4">
                    <select
                        className="p-3 bg-white border border-gray-300 rounded-lg w-full text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option>All Shipping</option>
                        <option>Reserved</option>
                        <option>In Transit</option>
                        <option>Delivered</option>
                        <option>Available</option>
                        <option>Maintenance</option>
                    </select>
                </div>

                {/* Search Input */}
                <div className="px-4 pb-2">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200">
                        <img src={searchIcon} alt="Search Icon" className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Trucks, Drivers, Customers"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow bg-transparent outline-none text-sm placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Scrollable Truck List */}
                <div className="truck-list overflow-y-auto h-[calc(100%-140px)] px-2 pb-2">
                    {filteredTrucks.length === 0 ? (
                        <div className="text-center p-4">
                            <p className="text-sm text-gray-500">No trucks found matching your criteria</p>
                        </div>
                    ) : (
                        filteredTrucks.map((truck) => (
                            <div
                                key={truck.id}
                                onClick={() => {
                                    // Prefer driver UID when available; fallback to truck id
                                    const driverUid = truck?.driver?.id || truck?.reservationSummary?.assignedDriver?.id;
                                    const selectionId = driverUid || truck.id;
                                    if (onSelect) onSelect(selectionId);
                                    else setSelectedTruck(truck.id);
                                }}
                                className={`cursor-pointer p-4 mb-4 rounded-md shadow-md transition-all duration-200 ${
                                    (activeId === truck.id) || (selectedId && (selectedId === (truck?.driver?.id) || selectedId === (truck?.reservationSummary?.assignedDriver?.id)))
                                        ? 'bg-[#020073] text-white'
                                        : 'bg-white text-black hover:shadow-lg'
                                }`}
                            >
                                <div className="flex gap-3">
                                    {/* Truck Image */}
                                    <div className="flex-shrink-0">
                                        <img
                                            src={truck.image || '/default-truck.png'}
                                            alt="Truck Icon"
                                            className="w-12 h-12 object-cover rounded"
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBmaWxsPSIjOTRBM0I4Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5UPC90ZXh0Pgo8L3N2Zz4K';
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="flex-grow min-w-0">
                                        {/* Truck Details */}
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-sm truncate">{truck.number}</p>
                                                <p className="text-sm truncate">{truck.driver?.name || truck.driver || 'Unassigned'}</p>
                                            </div>
                                            
                                            {/* Status and Sentiment */}
                                            <div className="flex flex-col items-end ml-2">
                                                <div className="flex items-center gap-1">
                                                    <p className={`text-xs font-semibold ${
                                                        getStatusColor(truck.status, truck.isReserved)
                                                    }`}>
                                                        {truck.isReserved ? 'Reserved' : truck.status}
                                                    </p>
                                                    {getSentimentIndicator(truck.driver?.sentimentScore)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Reservation Details */}
                                        {truck.isReserved && truck.reservationSummary && (
                                            <div className={`text-xs mt-2 p-2 rounded ${
                                                activeId === truck.id ? 'bg-white/20' : 'bg-purple-50'
                                            }`}>
                                                {/* Customer Information */}
                                                <p className={`font-medium ${
                                                    activeId === truck.id ? 'text-white' : 'text-purple-700'
                                                }`}>
                                                    Customer: {truck.reservationSummary.customerName}
                                                </p>
                                                
                                                {/* Assigned Driver Information */}
                                                {truck.reservationSummary.assignedDriver && (
                                                    <div className={`mt-1 ${activeId === truck.id ? 'text-white/90' : 'text-purple-600'}`}>
                                                        <p className="font-medium text-xs">
                                                            Driver: {truck.reservationSummary.assignedDriver.name}
                                                        </p>
                                                        {truck.reservationSummary.assignedDriver.phone && (
                                                            <p className={`text-xs ${activeId === truck.id ? 'text-white/70' : 'text-purple-500'}`}>
                                                                📞 {truck.reservationSummary.assignedDriver.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Route Information */}
                                                <p className={`text-xs mt-1 ${
                                                    activeId === truck.id ? 'text-white/80' : 'text-purple-600'
                                                }`}>
                                                    Route: {truck.reservationSummary.route}
                                                </p>
                                                
                                                {/* Pickup Date */}
                                                {truck.reservationSummary.pickupDate && (
                                                    <p className={`text-xs ${
                                                        activeId === truck.id ? 'text-white/80' : 'text-purple-600'
                                                    }`}>
                                                        Pickup: {new Date(truck.reservationSummary.pickupDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Indicators */}
                                        {truck.indicators && (
                                            <div className="flex gap-1 mt-2">
                                                {truck.indicators.hasAlerts && (
                                                    <span className="w-2 h-2 bg-red-500 rounded-full" title="Has alerts"></span>
                                                )}
                                                {truck.indicators.lowFuel && (
                                                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="Low fuel"></span>
                                                )}
                                                {truck.indicators.maintenanceDue && (
                                                    <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Maintenance due"></span>
                                                )}
                                                {truck.indicators.lowSentiment && (
                                                    <span className="w-2 h-2 bg-red-600 rounded-full" title="Driver sentiment below 40"></span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default SideBar;
