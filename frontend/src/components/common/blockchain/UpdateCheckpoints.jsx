import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiAddCheckpoint } from '../../../utils/blockchain_apis';
import { LoadingButton } from './LoadingButton';
import { MapPin, Clock } from 'lucide-react';

export const UpdateCheckpoints = () => {
  const [formData, setFormData] = useState({
    orderId: '',
    latE6: '',
    lonE6: '',
    status: '',
    timestamp: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [checkpoints, setCheckpoints] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert lat/lon to E6 format (multiply by 1e6)
      const latE6 = Math.round(parseFloat(formData.latE6) * 1e6);
      const lonE6 = Math.round(parseFloat(formData.lonE6) * 1e6);
      const ts = new Date(formData.timestamp).getTime() / 1000; // Convert to unix timestamp

      const response = await apiAddCheckpoint(
        formData.orderId,
        latE6,
        lonE6,
        ts,
        formData.status
      );

      // Add to local state for immediate UI update
      setCheckpoints([
        ...checkpoints,
        {
          ...formData,
          timestamp: new Date(formData.timestamp).toLocaleString()
        }
      ]);

      toast.success('Checkpoint added successfully!');
      
      // Clear form except orderId
      setFormData(prev => ({
        ...prev,
        latE6: '',
        lonE6: '',
        status: '',
        timestamp: ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add checkpoint');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Update Checkpoints</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Order ID</label>
          <input
            type="text"
            name="orderId"
            value={formData.orderId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Latitude</label>
            <input
              type="number"
              name="latE6"
              value={formData.latE6}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
              step="0.000001"
              placeholder="e.g. 51.509865"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Longitude</label>
            <input
              type="number"
              name="lonE6"
              value={formData.lonE6}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
              step="0.000001"
              placeholder="e.g. -0.118092"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">Select Status</option>
            <option value="In Transit">In Transit</option>
            <option value="Loading">Loading</option>
            <option value="Unloading">Unloading</option>
            <option value="Delayed">Delayed</option>
            <option value="Resting">Resting</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Timestamp</label>
          <input
            type="datetime-local"
            name="timestamp"
            value={formData.timestamp}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className="w-full"
        >
          Add Checkpoint
        </LoadingButton>
      </form>

      {/* Checkpoints Timeline */}
      {checkpoints.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">Recent Checkpoints</h3>
          <div className="space-y-4">
            {checkpoints.map((checkpoint, index) => (
              <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="font-medium text-gray-900">{checkpoint.status}</div>
                  <div className="text-sm text-gray-600">
                    {checkpoint.latE6}, {checkpoint.lonE6}
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {checkpoint.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
