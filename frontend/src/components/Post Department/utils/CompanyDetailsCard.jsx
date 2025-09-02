import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Truck, 
    MapPin, 
    Phone, 
    Mail, 
    Calendar,
    Users,
    Package
} from 'lucide-react';

const CompanyDetailsCard = ({ company, businessUid }) => {
    const [dashboardData, setDashboardData] = useState({
        reservationCount: 0,
        trucksInUse: 0,
        activeReservations: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (businessUid) {
            fetchCompanyDashboardData();
        }
    }, [businessUid]);

    const fetchCompanyDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch from API (no mock fallbacks)
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE || 'http://localhost:4001'}/api/business/${businessUid}/dashboard`
            );

            if (response.ok) {
                const data = await response.json();
                // Expecting: { reservationCount, trucksInUse, activeReservations, ... }
                setDashboardData({
                    reservationCount: data.reservationCount || 0,
                    trucksInUse: data.trucksInUse || 0,
                    activeReservations: Array.isArray(data.activeReservations) ? data.activeReservations : []
                });
            } else {
                throw new Error('Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching company dashboard data:', error);
            setError('Failed to load company data');
        } finally {
            setLoading(false);
        }
    };

    const getMetrics = () => [
        {
            label: 'Total Reservations',
            value: dashboardData.reservationCount,
            icon: Package,
            color: 'blue',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            iconColor: 'text-blue-500'
        },
        {
            label: 'Trucks in Use',
            value: dashboardData.trucksInUse,
            icon: Truck,
            color: 'green',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            iconColor: 'text-green-500'
        },
        {
            label: 'Active Orders',
            value: Array.isArray(dashboardData.activeReservations) ? dashboardData.activeReservations.length : 0,
            icon: Package,
            color: 'orange',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
            iconColor: 'text-orange-500'
        },
        {
            label: 'Active Drivers',
            value: (() => {
                const setIds = new Set();
                (dashboardData.activeReservations || []).forEach(res => {
                    (res.trucks || []).forEach(t => {
                        const id = t?.assignedDriver?.id || t?.driver?.id;
                        if (id) setIds.add(id);
                    });
                });
                return setIds.size;
            })(),
            icon: Users,
            color: 'purple',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            iconColor: 'text-purple-500'
        }
    ];

    if (!company) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center text-gray-500">
                    Select a company to view details
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Company Header Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{company.driver || 'Unknown Company'}</h1>
                                <p className="text-blue-100 mt-1">Registration: {company.number || 'N/A'}</p>
                                <span className={`
                                    inline-block px-3 py-1 rounded-full text-xs font-medium mt-2
                                    ${company.status === 'Active' 
                                        ? 'bg-green-500 text-white' 
                                        : company.status === 'Pending'
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-red-500 text-white'
                                    }
                                `}>
                                    {company.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                            <div className="space-y-3">
                                <div className="flex items-center text-gray-600">
                                    <Mail className="w-4 h-4 mr-3" />
                                    <span>{company.email || 'No email provided'}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Phone className="w-4 h-4 mr-3" />
                                    <span>{company.phone || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-start text-gray-600">
                                    <MapPin className="w-4 h-4 mr-3 mt-1" />
                                    <span>{company.address || 'No address provided'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Overview</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Registration Date</span>
                                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="text-gray-600">Account Status</span>
                                    <span className={`
                                        font-medium
                                        ${company.status === 'Active' ? 'text-green-600' : 
                                          company.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}
                                    `}>
                                        {company.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-800 text-sm">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getMetrics().map((metric, index) => (
                    <div key={index} className={`${metric.bgColor} rounded-lg p-6 border border-gray-200`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
                                <p className={`text-2xl font-bold ${metric.textColor}`}>
                                    {loading ? (
                                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    ) : (
                                        metric.value
                                    )}
                                </p>
                            </div>
                            <metric.icon className={`w-8 h-8 ${metric.iconColor}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Delivery Status visualizations removed as requested */}
        </div>
    );
};

export default CompanyDetailsCard;