import { useState, useEffect } from 'react';
import './style.css';  // Import custom CSS for the scrollbar


// assets



function SideBar({ trucks }) {
    const [filter, setFilter] = useState('All Shipping');
    const [selectedTruck, setSelectedTruck] = useState(null);

    // Set the first truck as selected by default
    useEffect(() => {
        if (trucks.length > 0) {
            setSelectedTruck(trucks[0].id);
        }
    }, [trucks]);

    const filteredTrucks = trucks.filter((truck) => filter === 'All Shipping' || truck.status === filter);

    return (
        <div>
            <div className=" h-[calc(100vh)] w-[20vw] shadow-xl mt-1">

                {/* Scrollable Truck List */}
                <div className="truck-list overflow-y-auto h-[calc(100%-160px)] p-2">
                    {filteredTrucks.map((truck) => (
                        <div
                            key={truck.id}
                            onClick={() => setSelectedTruck(truck.id)} // Set selected truck on click
                            className={`cursor-pointer p-4 mb-4 rounded-md shadow-md ${selectedTruck === truck.id ? 'bg-[#020073] text-white' : 'bg-white text-black'}`}
                        >
                            <div className="flex gap-4">
                                {/* Truck Image */}
                                <img
                                    src={truck.image}  // Dynamically render the truck image from the data
                                    alt="Truck Icon"
                                    className="w-10 h-10 object-cover"  // Adjust size and appearance of the image
                                />
                                <div className="flex">
                                    {/* Truck Details */}
                                    <div>
                                        <p className="font-bold text-xs">{truck.number}</p>
                                        <p className='text-xs'>{truck.driver}</p>
                                    </div>
                                    {/* Truck Status */}
                                    <div className='pl-2'>
                                        <p className={`text-xs font-semibold ${truck.status === 'In Transit' ? 'text-yellow-500' : 'text-green-500'}`}>
                                            {truck.status}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SideBar;
