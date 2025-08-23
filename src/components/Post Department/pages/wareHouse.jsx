import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Package } from 'lucide-react'

// Mock data for warehouses
const warehouses = [
  {
    id: 1,
    name: "Central Warehouse",
    location: "Chicago, IL",
    capacity: 75,
    type: "Electronics",
    status: "active",
    lastActivity: "2023-06-15T10:30:00Z",
    contact: "John Doe",
    alerts: false
  },
  {
    id: 2,
    name: "Cold Storage Facility",
    location: "Austin, TX",
    capacity: 90,
    type: "Perishable Goods",
    status: "full",
    lastActivity: "2023-06-14T16:45:00Z",
    contact: "Jane Smith",
    alerts: true
  },
  {
    id: 3,
    name: "West Coast Distribution",
    location: "Los Angeles, CA",
    capacity: 60,
    type: "General Merchandise",
    status: "active",
    lastActivity: "2023-06-16T09:15:00Z",
    contact: "Mike Johnson",
    alerts: false
  },
  {
    id: 4,
    name: "East Coast Hub",
    location: "New York, NY",
    capacity: 85,
    type: "Fashion and Apparel",
    status: "active",
    lastActivity: "2023-06-15T14:20:00Z",
    contact: "Sarah Brown",
    alerts: false
  },
  {
    id: 5,
    name: "Southern Depot",
    location: "Atlanta, GA",
    capacity: 70,
    type: "Home Goods",
    status: "maintenance",
    lastActivity: "2023-06-13T11:00:00Z",
    contact: "Tom Wilson",
    alerts: true
  }
]

// Mock data for warehouse logs
const warehouseLogs = [
  {
    id: 1,
    warehouseId: 1,
    date: "2023-06-15T10:30:00Z",
    eventType: "Shipment Received",
    description: "Received 500 units of Product A",
    inventoryChange: "+500",
    responsiblePerson: "Alice Johnson",
    status: "success"
  },
  {
    id: 2,
    warehouseId: 1,
    date: "2023-06-14T14:15:00Z",
    eventType: "Shipment Dispatched",
    description: "Dispatched 200 units of Product B",
    inventoryChange: "-200",
    responsiblePerson: "Bob Williams",
    status: "success"
  },
  {
    id: 3,
    warehouseId: 2,
    date: "2023-06-14T16:45:00Z",
    eventType: "System Alert",
    description: "Temperature fluctuation detected in cold storage area",
    inventoryChange: "N/A",
    responsiblePerson: "System",
    status: "alert"
  },
  {
    id: 4,
    warehouseId: 3,
    date: "2023-06-16T09:15:00Z",
    eventType: "Inventory Audit",
    description: "Quarterly inventory audit completed",
    inventoryChange: "0",
    responsiblePerson: "Audit Team",
    status: "success"
  },
  {
    id: 5,
    warehouseId: 4,
    date: "2023-06-15T14:20:00Z",
    eventType: "Shipment Received",
    description: "Received 1000 units of new summer collection",
    inventoryChange: "+1000",
    responsiblePerson: "Emily Davis",
    status: "success"
  }
]

export default function WarehouseDashboard() {
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'full':
        return 'bg-orange-500'
      case 'maintenance':
        return 'bg-yellow-500'
      default:
        return 'bg-red-500'
    }
  }

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'Shipment Received':
      case 'Shipment Dispatched':
        return <Package className="h-4 w-4" />
      case 'Inventory Audit':
        return <CheckCircle className="h-4 w-4" />
      case 'System Alert':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/5 bg-gray-100 border-r p-4">
        <h2 className="text-xl font-bold mb-4">Warehouses</h2>
        <div className="overflow-auto h-[calc(100vh-8rem)]">
          {warehouses.map((warehouse) => (
            <button
              key={warehouse.id}
              className={`w-full text-left mb-2 p-2 rounded border border-gray-300 ${selectedWarehouse?.id === warehouse.id ? "bg-blue-100" : "bg-gray-50 hover:bg-gray-200"}`}
              onClick={() => setSelectedWarehouse(warehouse)}
            >
              {warehouse.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="w-4/5 p-4 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Warehouse Dashboard</h1>

        {selectedWarehouse ? (
          <>
            {/* Warehouse Details */}
            <div className=" text-white p-4 rounded-lg bg-[#020073] shadow mb-4">
              <h2 className="text-xl font-semibold mb-2">{selectedWarehouse.name}</h2>
              <p className=" mb-2">{selectedWarehouse.location}</p>
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium">Capacity:</span>
                <div className="bg-gray-200 w-full h-2 mx-2 rounded">
                  <div className={`h-2 rounded ${getStatusColor(selectedWarehouse.status)}`} style={{ width: `${selectedWarehouse.capacity}%` }}></div>
                </div>
                <span className="text-sm">{selectedWarehouse.capacity}%</span>
              </div>
              <p className="text-sm mb-2">Type: {selectedWarehouse.type}</p>
              <p className="text-sm mb-2">Contact: {selectedWarehouse.contact}</p>
              <div className="flex justify-between items-center">
                <span className={`badge ${getStatusColor(selectedWarehouse.status)}`}>{selectedWarehouse.status}</span>
                <span className="text-sm ">Last activity: {new Date(selectedWarehouse.lastActivity).toLocaleString()}</span>
              </div>
              {selectedWarehouse.alerts && <div className="text-red-500">Alert: Check system issues!</div>}
            </div>

            {/* Warehouse Logs */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">Warehouse Logs</h2>
              <table className="table-auto w-full text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">Date & Time</th>
                    <th className="p-2">Event Type</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Inventory Change</th>
                    <th className="p-2">Responsible Person</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseLogs
                    .filter(log => log.warehouseId === selectedWarehouse.id)
                    .map(log => (
                      <tr key={log.id} className="border-t">
                        <td className="p-2">{new Date(log.date).toLocaleString()}</td>
                        <td className="p-2 flex items-center gap-2">
                          {getEventTypeIcon(log.eventType)}
                          {log.eventType}
                        </td>
                        <td className="p-2">{log.description}</td>
                        <td className="p-2">{log.inventoryChange}</td>
                        <td className="p-2">{log.responsiblePerson}</td>
                        <td className="p-2">
                          <span className={`badge ${log.status === 'success' ? 'bg-green-200' : 'bg-red-200'}`}>{log.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Select a warehouse to view details and logs.</p>
        )}
      </div>
    </div>
  )
}
