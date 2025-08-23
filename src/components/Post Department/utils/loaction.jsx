import React, { useState, useEffect } from 'react';

const VerticalProgressBar = () => {
    const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
    const [animationStopped, setAnimationStopped] = useState(false);

    useEffect(() => {
        if (!animationStopped) {
            const interval = setInterval(() => {
                setCurrentCheckpointIndex((prevIndex) => {
                    if (prevIndex < checkpoints.length - 1) {
                        if (prevIndex === 2) {
                            // Stop the animation between the 3rd and 4th checkpoint
                            setAnimationStopped(true);
                            clearInterval(interval);
                            return prevIndex;
                        }
                        return prevIndex + 1;
                    }
                    return prevIndex;
                });
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [animationStopped]);

    const checkpoints = [
        { top: '100%', name: 'Start', arrivalTime: '12:00 PM', departureTime: '-' },
        { top: '75%', name: 'Checkpoint 3', arrivalTime: '11:00 AM', departureTime: '11:15 AM' },
        { top: '50%', name: 'Checkpoint 2', arrivalTime: '10:00 AM', departureTime: '10:15 AM' },
        { top: '25%', name: 'Checkpoint 1', arrivalTime: '09:00 AM', departureTime: '09:15 AM' },
        { top: '0%', name: 'Finish', arrivalTime: '08:00 AM', departureTime: '08:15 AM' }
    ];

    return (
        <div className="flex items-center pl-4 h-full bg-white rounded-sm">
            <div className="relative w-3 h-[70vh] bg-gray-300 rounded-lg">
                {/* Progress Bar Filler */}
                <div
                    className="absolute bottom-0 left-0 w-3 bg-blue-500 rounded-lg"
                    style={{
                        height: `${((currentCheckpointIndex + 1) / checkpoints.length) * 100}%`,
                        transition: 'height 1s linear'
                    }}
                />

                {/* Checkpoints */}
                {checkpoints.map((checkpoint, index) => (
                    <div
                        key={index}
                        className={`rounded-full absolute flex items-center justify-center w-6 h-6 
                        ${index <= currentCheckpointIndex ? 'bg-orange-500' : 'bg-white'} 
                        border border-gray-400`}
                        style={{ top: checkpoint.top, left: '50%', transform: 'translateX(-50%)' }}
                    >
                        {/* Tick Mark inside the circle */}
                        {index <= currentCheckpointIndex && (
                            <svg
                                className="w-4 h-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}

                        <div
                            className={`absolute left-full ml-2 text-gray-700 flex flex-col items-start`}
                        >
                            <span className="text-sm font-bold">{checkpoint.name}</span>
                            <div className="flex gap-4 w-full">
                                <span className="text-[0.9vw] w-[3vw]">
                                    Arrival: {checkpoint.arrivalTime}
                                </span>
                                <span className="text-[0.9vw]">Departure: {checkpoint.departureTime}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Car Icon */}
                <div
                    className="w-5 h-5  rounded-full absolute -left-2 transition-transform"
                    style={{
                        top: checkpoints[currentCheckpointIndex]?.top,
                        transition: 'top 1s linear'
                    }}
                />
            </div>
        </div>
    );
};

export default VerticalProgressBar;
