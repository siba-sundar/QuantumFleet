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
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Feature Not Available</h1>
        <p className="text-gray-600 mb-6">
          The warehouse management feature has been deprecated in the Super Admin portal.
        </p>
        <p className="text-gray-500">
          Please use the dedicated warehouse management system for these operations.
        </p>
      </div>
    </div>
  );
}
