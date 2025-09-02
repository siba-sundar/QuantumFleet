import React, { useState, useEffect } from 'react';

// assets
import truckFront from "../../../assets/truck-front.svg"

function LoadDetails({ loadPercentage, truckDetails }) {
    const [animationStarted, setAnimationStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimationStarted(true);
        }, 1000); // 1-second delay

        return () => clearTimeout(timer); // Clean up the timer
    }, []);

    return (
        <div className="shadow-lg py-2 px-3 w-[18vw] h-[40vh] bg-white rounded-md">
            <div className='flex bg-[#E6E6E6]  ronded-sm pt-3 pr-2'>
                {/* Truck Image */}
                <div className="mb-1">
                    <img src={truckFront} alt="Truck Front" className="w-32" />
                </div>


                {/* Truck Load Animation */}
                <div className="relative bg-white w-full h-12 rounded-lg overflow-hidden">
                    <div
                        className={`absolute h-full bg-[#020073] transition-all  duration-1000 ${animationStarted ? 'w-[86%]' : 'w-0'}`}
                        style={{ width: animationStarted ? `${loadPercentage}%` : '0%' }}
                    ></div>
                    <div className="absolute inset-0 flex justify-center items-center text-2xl text-white font-bold">
                        {animationStarted ? `${loadPercentage}%` : '0%'}
                    </div>
                </div>
            </div>

            {/* Truck Details (Placeholder) */}
            <div className="mt-1">
                <div className='flex gap-[10%]'>
                    <p className="text-sm font-semibold mb-2 flex">TRUCK DETAILS</p>
                    <div className="mb-2 ">
                        <p className='text-xs text-orange-400 font-semibold'>{truckDetails.deliveryStatus}</p>
                    </div>
                </div>
                <div className='flex flex-col '>
                    <div className='flex text-[1vw] gap-1'>
                        <p className="font-semibold">Truck Number:</p>
                        <p>{truckDetails.number}</p>
                    </div>
                    <div className='flex text-[1vw] gap-1'>
                        <p className="font-semibold">Max Load:</p>
                        <p>{truckDetails.maxLoad} kg</p>
                    </div>
                    <div className="flex text-[1vw] gap-1">
                        <p className="font-semibold">Current Load:</p>
                        <p>{truckDetails.currentLoad} kg</p>
                    </div>
                    <div className="flex text-[1vw] gap-1">
                        <p className="font-semibold">Last Maintenance:</p>
                        <p>{truckDetails.maintenance}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoadDetails;
