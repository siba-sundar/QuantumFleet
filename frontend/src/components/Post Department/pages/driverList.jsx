import SideBar from "../../Global/sideBar.jsx";
import DriverDetailsPanel from "./DriverDetailsPanel.jsx";
import { useEffect, useState } from "react";
import { fetchEnhancedFleet } from "../../../utils/api.js";
import AccessControl from "../../common/blockchain/AccessControl.jsx";
function DriverPage() {
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [showAccessControl, setShowAccessControl] = useState(false); // ✅ new state

  // Load fleet and default to first driver in the list
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchEnhancedFleet(true, true);
        if (!mounted) return;
        const list = data.trucks || [];
        setTrucks(list);
        // pick first driver if available
        const first = list[0];
        const firstDriver =
          first?.driver?.id || first?.reservationSummary?.assignedDriver?.id;
        if (firstDriver) setSelectedDriverId(String(firstDriver));
      } catch (e) {
        if (mounted) setError("Failed to load drivers");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDriverSelect = (driverId) => {
    console.log("Driver selected:", driverId);
    setSelectedDriverId(driverId);
  };

  return (
    <>
      <div className="grid grid-cols-[20%_80%]">
        <SideBar
          trucks={trucks}
          selectedId={selectedDriverId}
          onSelect={handleDriverSelect}
          loading={loading}
          businessUid={null} // Postal users should see all drivers
        />

        <div className="p-4">
          <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Driver Management
              </h2>
              <p className="text-gray-600">
                Manage and oversee all drivers in the fleet
              </p>
            </div>

            {/* ✅ Grant Role button */}
            <button
              onClick={() => setShowAccessControl(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition"
            >
              Check Role
            </button>
          </div>

          {selectedDriverId ? (
            <DriverDetailsPanel driverId={selectedDriverId} />
          ) : loading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#020073] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading drivers...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <div className="text-red-500 text-xl mb-2">Error</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <p className="text-gray-600">
                No drivers available in the system
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ AccessControl Modal */}
      {showAccessControl && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Manage Access Control
              </h3>
              <button
                onClick={() => setShowAccessControl(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AccessControl />
          </div>
        </div>
      )}
    </>
  );
}

export default DriverPage;
