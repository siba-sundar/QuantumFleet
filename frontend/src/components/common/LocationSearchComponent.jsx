import React, { useState, useEffect, useRef, useCallback } from 'react';
import locationService from '../../services/LocationService';
import { MapPin, Search, Loader, X, Check, ExternalLink } from 'lucide-react';

const LocationSearchComponent = ({ 
  onLocationSelect, 
  placeholder = "Search for location...", 
  initialValue = "", 
  disabled = false, 
  required = false,
  className = "",
  label = "Location",
  showMapLink = true 
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState('');
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Ensure Google Maps is loaded (LocationService handles injection)
  useEffect(() => {
    // kick off init but don't block UI
    locationService.init();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchPlaces(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  // Search places using Google Places API
  const searchPlaces = async (input) => {
    setLoading(true);
    setError('');

    try {
      const results = await locationService.searchPlaces(input, {
        componentRestrictions: { country: 'IN' },
        types: ['establishment', 'geocode']
      });
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLoading(false);
    } catch (error) {
      console.error('Places search error:', error);
      setError('Error searching locations');
      setLoading(false);
    }
  };

  // Get place details and coordinates
  const getPlaceDetails = async (placeId, description) => {
    setLoading(true);
    try {
      const place = await locationService.getPlaceDetails(placeId);
      setLoading(false);
      if (place) {
        const locationData = {
          address: place.address || description,
          coordinates: place.coordinates,
          placeId: place.placeId,
          name: place.name,
          addressComponents: place.addressComponents || {}
        };
        setSelectedLocation(locationData);
        setQuery(locationData.address);
        setShowSuggestions(false);
        onLocationSelect?.(locationData);
      } else {
        setError('No details for selected place');
      }
    } catch (e) {
      console.error('Place details error:', e);
      setLoading(false);
      setError('Failed to get location details');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedLocation(null);
    setError('');

    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    getPlaceDetails(suggestion.placeId, suggestion.description);
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSelectedLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    
    if (onLocationSelect) {
      onLocationSelect(null);
    }
    
    searchInputRef.current?.focus();
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${selectedLocation ? 'border-green-500 bg-green-50' : ''} ${
              error ? 'border-red-500' : ''
            }`}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {loading && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
            {selectedLocation && <Check className="w-4 h-4 text-green-500" />}
            {query && !loading && (
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId || index}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {suggestion.mainText}
                    </div>
                    {suggestion.secondaryText && (
                      <div className="text-sm text-gray-500 truncate">
                        {suggestion.secondaryText}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected location display */}
      {selectedLocation && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Selected Location</span>
              </div>
              <p className="text-sm text-green-700 mt-1">{selectedLocation.address}</p>
              <p className="text-xs text-green-600 mt-1">
                Coordinates: {selectedLocation.coordinates.lat.toFixed(6)}, {selectedLocation.coordinates.lng.toFixed(6)}
              </p>
            </div>
            {showMapLink && selectedLocation.coordinates && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800"
                title="View on Google Maps"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        Start typing to search for locations. Select from suggestions to automatically capture coordinates.
      </p>
    </div>
  );
};

export default LocationSearchComponent;