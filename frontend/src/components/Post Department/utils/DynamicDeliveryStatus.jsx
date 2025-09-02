import React, { useState, useEffect } from 'react';
import { Package, Truck, MapPin, CheckCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';

const DynamicDeliveryStatus = ({ businessUid, companyName }) => {
    const [deliveryData, setDeliveryData] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        'in-progress': 0,
        completed: 0,
        cancelled: 0
    });
    const [activeReservations, setActiveReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (businessUid) {
            fetchDeliveryData();
        }
    }, [businessUid]);

    const fetchDeliveryData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch delivery status from the API
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE || 'http://localhost:4001'}/api/business/${businessUid}/delivery-status`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch delivery data');
            }

            const data = await response.json();
            setDeliveryData(data.deliveryStatus || deliveryData);
            setActiveReservations(data.activeReservations || []);
        } catch (error) {
            console.error('Error fetching delivery data:', error);
            setError('Failed to load delivery status');
            
            // Fallback to mock data for demo purposes
            setDeliveryData({
                total: 12,
                pending: 2,
                confirmed: 4,
                'in-progress': 3,
                completed: 2,
                cancelled: 1
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'confirmed':
                return <CheckCircle className="w-5 h-5 text-blue-500" />;
            case 'in-progress':
                return <Truck className="w-5 h-5 text-orange-500" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default:
                return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'in-progress':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatStatusLabel = (status) => {
        return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const calculateCompletionRate = () => {
        if (deliveryData.total === 0) return 0;
        return Math.round((deliveryData.completed / deliveryData.total) * 100);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Delivery Status</h2>
                            <p className="text-sm text-gray-600">
                                {companyName} - Live delivery tracking
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-800">{deliveryData.total}</div>
                        <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-yellow-800 text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* Status Overview */}
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(deliveryData)
                        .filter(([key]) => key !== 'total')
                        .map(([status, count]) => (
                            <div 
                                key={status}
                                className={`p-4 rounded-lg border ${getStatusColor(status)}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusIcon(status)}
                                            <span className="text-sm font-medium">
                                                {formatStatusLabel(status)}
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold">{count}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>

                {/* Completion Rate */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                        <span className="text-sm font-bold text-gray-900">{calculateCompletionRate()}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${calculateCompletionRate()}%` }}
                        ></div>
                    </div>
                </div>

                {/* Active Reservations */}
                {activeReservations.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Active Reservations ({activeReservations.length})
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {activeReservations.slice(0, 5).map((reservation, index) => (
                                <div 
                                    key={reservation.id || index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Truck className="w-4 h-4 text-gray-600" />
                                        <div>
                                            <div className="font-medium text-sm text-gray-800">
                                                Order #{reservation.reservationId?.slice(-8) || `ORD${index + 1}`}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {reservation.trucks?.length || 1} truck(s) assigned
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                                        {formatStatusLabel(reservation.status)}
                                    </div>
                                </div>
                            ))}
                            {activeReservations.length > 5 && (
                                <div className="text-center text-sm text-gray-600 py-2">
                                    +{activeReservations.length - 5} more reservations
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {deliveryData.total === 0 && !loading && (
                    <div className="text-center py-8">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
                        <p className="text-gray-600">
                            This company hasn't placed any truck reservations yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicDeliveryStatus;