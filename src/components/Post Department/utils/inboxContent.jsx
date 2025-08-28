import React, { useState } from "react";

const InboxContent = () => {
  const [activeTab, setActiveTab] = useState('all');

  // Mock data for different types of alerts
  const alerts = [
    {
      id: 1,
      type: 'booking',
      title: 'New Booking Confirmation',
      sender: 'Shyam Lal',
      truck: 'HP06B4567',
      date: '17 Aug 2024, 20:04',
      bookingId: '3816',
      status: 'confirmed',
      read: false
    },
    {
      id: 2,
      type: 'maintenance',
      title: 'Truck Maintenance Due',
      sender: 'System Alert',
      truck: 'MH12AB1234',
      date: '18 Aug 2024, 09:15',
      message: 'Scheduled maintenance required',
      status: 'pending',
      read: false
    },
    {
      id: 3,
      type: 'delivery',
      title: 'Delivery Completed',
      sender: 'Ramesh Kumar',
      truck: 'TS44353',
      date: '18 Aug 2024, 14:30',
      deliveryId: 'D45678',
      status: 'completed',
      read: true
    },
    {
      id: 4,
      type: 'booking',
      title: 'Booking Confirmation',
      sender: 'Prakash Lal',
      truck: 'RK98530',
      date: '19 Aug 2024, 11:20',
      bookingId: '3817',
      status: 'confirmed',
      read: true
    }
  ];

  // Filter alerts based on active tab
  const filteredAlerts = activeTab === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.type === activeTab);

  // Mark alert as read
  const markAsRead = (id) => {
    // In a real app, this would update the backend
    console.log(`Marking alert ${id} as read`);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-5">
      <div className="bg-white max-w-6xl mx-auto border border-gray-300 rounded-lg">
        {/* Header */}
        <div className="p-5 border-b border-gray-300">
          <h1 className="text-2xl font-bold text-gray-800">Super Admin Inbox</h1>
          <p className="text-gray-600">Manage all alerts and notifications</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-300">
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('all')}
          >
            All Alerts
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'booking' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('booking')}
          >
            Booking Confirmations
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'maintenance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('maintenance')}
          >
            Maintenance Alerts
          </button>
          <button 
            className={`px-6 py-3 font-medium ${activeTab === 'delivery' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('delivery')}
          >
            Delivery Updates
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-5">
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${alert.read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                onClick={() => markAsRead(alert.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{alert.title}</h3>
                    <p className="text-gray-600">{alert.sender} • Truck: {alert.truck}</p>
                  </div>
                  <span className="text-sm text-gray-500">{alert.date}</span>
                </div>
                <div className="mt-2 flex items-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.status}
                  </span>
                  {!alert.read && (
                    <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">New</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxContent;