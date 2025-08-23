import { useState, useEffect } from 'react';
import './sideBar.css';  // Import custom CSS for the scrollbar


// assets

import searchIcon from "../../assets/search-icon.svg"

function SideBar({ trucks, selectedId, onSelect }) {
    const [filter, setFilter] = useState('All Shipping');
    const [selectedTruck, setSelectedTruck] = useState(null);

    // If parent doesn't control selection, initialize local selected truck
    useEffect(() => {
        if (!selectedId && trucks.length > 0) {
            setSelectedTruck(trucks[0].id);
        }
    }, [trucks, selectedId]);

    const filteredTrucks = trucks.filter((truck) => filter === 'All Shipping' || truck.status === filter);
    const activeId = selectedId ?? selectedTruck;

    return (
        <div>
            <div className="fixed left-0 top-[64px] h-[calc(100vh-64px)] w-[20%] shadow-xl mt-1">
                {/* Dropdown Filter */}
                <div className="pl-4 pt-4 flex gap-10">
                    <select
                        className=" p-2 bg-white border rounded-md w-[60%] text-sm font-bold"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option>All Shipping</option>
                        <option>In Transit</option>
                        <option>Delivered</option>
                    </select>


                    {/* button to add */}
                    <button className='px-3 font-semibold text-white text-xl bg-[#020073] rounded-full hover:bg-white hover:text-black transition 
                    duration-300 hover:border hover:border-[#020073] '>
                    +</button>
                </div>

                {/* Search Input */}
                <div className="p-4">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-md border border-[#E1E1E1] shadow-lg">
                        <img src={searchIcon} alt="Search Icon" className="w-6 h-6" />
                        <input
                            type="text"
                            placeholder="Search Trucks"
                            className="flex-grow bg-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Scrollable Truck List */}
                <div className="truck-list overflow-y-auto h-[calc(100%-160px)] p-2">
                    {filteredTrucks.map((truck) => (
                        <div
                            key={truck.id}
                            onClick={() => {
                                if (onSelect) onSelect(truck.id);
                                else setSelectedTruck(truck.id);
                            }}
                            className={`cursor-pointer p-4 mb-4 rounded-md shadow-md ${activeId === truck.id ? 'bg-[#020073] text-white' : 'bg-white text-black'}`}
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
                                        <p className="font-bold text-sm">{truck.number}</p>
                                        <p className='text-sm'>{truck.driver}</p>
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
