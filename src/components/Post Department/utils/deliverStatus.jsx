"use client"

import React, { useEffect, useState } from 'react'
import { Check, Package, Truck, Home } from 'lucide-react'

export default function Component({ currentStage, orderDetails }) {
    const [animationProgress, setAnimationProgress] = useState(0)

    const stages = [
        {
            label: 'Order Placed',
            icon: <Package className="w-6 h-6" />,
            completed: ['order_placed', 'shipped', 'out_for_delivery', 'delivered'].includes(currentStage)
        },
        {
            label: 'Shipped',
            icon: <Truck className="w-6 h-6" />,
            completed: ['shipped', 'out_for_delivery', 'delivered'].includes(currentStage)
        },
        {
            label: 'Out for Delivery',
            icon: <Truck className="w-6 h-6" />,
            completed: ['out_for_delivery', 'delivered'].includes(currentStage)
        },
        {
            label: 'Delivered',
            icon: <Home className="w-6 h-6" />,
            completed: ['delivered'].includes(currentStage)
        }
    ]

    useEffect(() => {
        const animationDuration = 2000 // 2 seconds
        const interval = 20 // Update every 20ms
        const steps = animationDuration / interval
        let currentStep = 0

        const timer = setInterval(() => {
            currentStep++
            setAnimationProgress(currentStep / steps)

            if (currentStep >= steps) {
                clearInterval(timer)
            }
        }, interval)

        return () => clearInterval(timer)
    }, [])

    const currentStageIndex = stages.findIndex(stage => stage.completed) + 1

    return (
        <div>
            {/* Delivery status timeline */}
            <div className="w-[55vw] mx-auto  p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Delivery Status</h2>
                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 transform -translate-y-1/2"></div>
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-green-500 transform -translate-y-1/2 transition-all duration-1000 ease-out"
                        style={{ width: `${animationProgress * 100}%` }}
                    ></div>
                    <div className="relative flex justify-between">
                        {stages.map((stage, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${animationProgress > index / (stages.length - 1)
                                            ? 'bg-green-500'
                                            : index < currentStageIndex
                                                ? 'bg-blue-500'
                                                : 'bg-gray-300'
                                            }`}
                                    >
                                        {animationProgress > index / (stages.length - 1) ? (
                                            <Check className="w-6 h-6 text-white" />
                                        ) : (
                                            React.cloneElement(stage.icon, {
                                                className: `w-6 h-6 ${index < currentStageIndex ? 'text-white' : 'text-gray-500'}`
                                            })
                                        )}
                                    </div>
                                </div>
                                <p className={`mt-2 text-sm font-semibold text-center ${index < currentStageIndex ? 'text-gray-800' : 'text-gray-500'}`}>
                                    {stage.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Delivery details */}
            <div className="w-[60vw] mx-auto mt-3 p-6 bg-white rounded-lg shadow-md flex gap-8">


                <div>
                    <h2 className="text-xl font-semibold">Order Information</h2>
                    <p className="mb-2"><strong>Order ID:</strong> {orderDetails.orderId}</p>
                    <p className="mb-2"><strong>Pick Date:</strong> {orderDetails.pickDate}</p>
                    <p className="mb-2"><strong>Drop off Estimation:</strong> {orderDetails.dropOffEstimation}</p>
                    <h2 className="text-xl font-semibold mt-2 mb-2">Insurance</h2>
                    <p className="mb-2"><strong>Insurance Status:</strong> {orderDetails.insuranceStatus}</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold">Location</h2>
                    <p className="mb-2"><strong>Pick up Location:</strong> {orderDetails.pickUpLocation}</p>
                    <p className="mb-2"><strong>Drop off Location:</strong> {orderDetails.dropOffLocation}</p>

                </div>
            </div>
        </div>
    )
}
