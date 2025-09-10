import { useState, useEffect, useMemo } from "react";
import { fetchEnhancedFleet } from "../../../utils/api";
import { useAuth } from "../../../hooks/useAuth.jsx";
import alertService from "../../../services/AlertManagementService.js";
import {
  MapPin,
  AlertTriangle,
  ActivitySquare,
  CheckSquare,
  Clock,
  Truck,
  Navigation,
  Bell,
  CheckCircle,
  X,
  Airplay,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  apiFinalizeDelivery,
  apiAddCheckpoint,
} from "../../../utils/blockchain_apis";
import UpdateDeliveryStatus from "../../common/blockchain/UpdateDeliveryStatus.jsx";
import FinalizeDelivery from "../../common/blockchain/FinalizeDelivery.jsx";
import UpdateCheckpoints from "../../common/blockchain/UpdateCheckpoints.jsx";

function TruckDetails() {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [sosSending, setSosSending] = useState(false);
  const [isFinalizing, setisFinalizing] = useState(false);
  const [showSOSDialog, setShowSOSDialog] = useState(false);
  const [sosType, setSOSType] = useState("general");
  const [sosMessage, setSOSMessage] = useState("");
  const [sosUrgency, setSOSUrgency] = useState("high");
  const [incomingAlerts, setIncomingAlerts] = useState([]);
  const [showIncomingAlerts, setShowIncomingAlerts] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [blockchainOrderId, setBlockchainOrderId] = useState("");
  const [finalizeForm, setFinalizeForm] = useState({
    orderId: "",
    walletAddress: "",
    deliveryNotes: "",
  });
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [checkpointForm, setCheckpointForm] = useState({
    status: "",
    notes: "",
    arrivalTime: "",
    departureTime: "",
    condition: "good",
  });

  // Function to update delivery status with blockchain integration
  const updateDeliveryStatus = async (status, notes = "") => {
    if (!selectedTruck?.orderId) {
      toast.error("No order ID found");
      return;
    }

    try {
      // Update checkpoint and status on blockchain
      await apiAddCheckpoint(
        selectedTruck.orderId,
        currentLocation?.latitude * 1e6 || 0,
        currentLocation?.longitude * 1e6 || 0,
        Math.floor(Date.now() / 1000),
        status
      );

      // Update local state
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) =>
          truck.orderId === selectedTruck.orderId
            ? {
                ...truck,
                deliveryStatus: status,
                lastStatusUpdate: new Date().toISOString(),
                statusHistory: [
                  ...(truck.statusHistory || []),
                  {
                    status,
                    notes,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : truck
        )
      );

      // Update status updates history
      setStatusUpdates((prev) => [
        ...prev,
        {
          status,
          notes,
          timestamp: new Date().toISOString(),
        },
      ]);
      setStatusNote(""); // Clear the notes
      toast.success("Delivery status updated successfully");
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error(
        error.response?.data?.error || "Failed to update delivery status"
      );
    }
  };

  const updateCheckpointStatus = async (
    truckIndex,
    checkpointIndex,
    status,
    notes = ""
  ) => {
    if (!selectedTruck?.reservationId) {
      toast.error("No reservation ID found");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/api/deliveries/${
          selectedTruck.reservationId
        }/checkpoint`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            truckIndex,
            checkpointIndex,
            status,
            notes,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update checkpoint status");
      }

      const result = await response.json();

      // Update local state
      setTrucks((prevTrucks) => {
        return prevTrucks.map((truck, idx) => {
          if (idx === truckIndex) {
            const updatedCheckpoints = [...truck.checkpoints];
            updatedCheckpoints[checkpointIndex] = {
              ...updatedCheckpoints[checkpointIndex],
              ...result.checkpoint,
            };

            return {
              ...truck,
              checkpoints: updatedCheckpoints,
              lastCheckpointUpdate: result.checkpoint.timestamp,
              progress: result.progress,
            };
          }
          return truck;
        });
      });

      // Update checkpoint form and modal state
      setCheckpointForm((prev) => ({
        ...prev,
        status: "",
        notes: "",
      }));
      setShowCheckpointModal(false);
      toast.success("Checkpoint status updated successfully");
    } catch (error) {
      console.error("Error updating checkpoint status:", error);
      toast.error("Failed to update checkpoint status");
    }
  };
  // Handle checkpoint form submission
  const handleCheckpointUpdate = async () => {
    if (!selectedCheckpoint || !checkpointForm.status) {
      toast.error("Please select a status");
      return;
    }

    try {
      await updateCheckpointStatus(
        0, // first truck in the array
        selectedTruck.trucks[0].checkpoints.indexOf(selectedCheckpoint),
        checkpointForm.status,
        checkpointForm.notes
      );

      setShowCheckpointModal(false);
      setCheckpointForm({
        status: "",
        notes: "",
        arrivalTime: "",
        departureTime: "",
        condition: "good",
      });
    } catch (error) {
      console.error("Failed to update checkpoint:", error);
      toast.error("Failed to update checkpoint");
    }
  };

  // Subscribe to real-time alerts for driver
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = alertService.subscribeToAlerts(
        user.uid,
        "driver",
        (newAlerts) => {
          const driverAlerts = newAlerts.filter(
            (alert) =>
              ["dispatch_instructions", "route_update"].includes(alert.type) &&
              alert.status === "active"
          );
          setIncomingAlerts(driverAlerts);
        }
      );

      return unsubscribe;
    }
  }, [user?.uid]);

  // Load trucks and alerts
  useEffect(() => {
    let mounted = true;

    const loadDriverTruckData = async () => {
      try {
        setLoading(true);

        // Load driver profile first to get professional truck assignment
        let driverData = null;
        if (user?.uid) {
          try {
            const profileResponse = await fetch(
              `${
                import.meta.env.VITE_API_BASE || "http://localhost:4001"
              }/api/driver-profiles/${user.uid}`
            );
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              driverData = profileData.profile;
              if (mounted) setDriverProfile(driverData);
            }
          } catch (error) {
            console.warn("Error loading driver profile:", error);
          }
        }

        // Use enhanced fleet to get proper driver assignments and reservation data
        const fleetData = await fetchEnhancedFleet(true, true);

        // Also fetch truck reservations directly to get complete checkpoint data
        let reservationData = null;
        if (user?.uid) {
          try {
            const reservationResponse = await fetch(
              `${
                import.meta.env.VITE_API_BASE || "http://localhost:4001"
              }/api/reservations/driver/${user.uid}`
            );
            if (reservationResponse.ok) {
              const resData = await reservationResponse.json();
              reservationData = resData.reservation;
              setBlockchainOrderId(reservationData.blockchainOrderId || -1);
            }
          } catch (error) {
            console.warn("Error loading driver reservation data:", error);
          }
        }

        if (mounted) {
          // Merge reservation data with truck data if available
          let enhancedTrucks = fleetData.trucks || [];
          if (reservationData && enhancedTrucks.length > 0) {
            enhancedTrucks = enhancedTrucks.map((truck) => {
              // If this truck matches the reservation, enhance it with complete checkpoint data
              if (
                reservationData.trucks?.[0]?.assignedDriver?.id === user?.uid
              ) {
                return {
                  ...truck,
                  reservationDetails: {
                    ...truck.reservationDetails,
                    checkpoints: reservationData.trucks[0].checkpoints || [],
                    route: {
                      ...truck.reservationDetails?.route,
                      pickupLocation: reservationData.trucks[0].pickupLocation,
                      dropLocation: reservationData.trucks[0].dropLocation,
                      pickupDate: reservationData.trucks[0].pickupDate,
                      dropDate: reservationData.trucks[0].dropDate,
                    },
                    // Include the coordinate data from reservation
                    pickupLocationData:
                      reservationData.trucks[0].pickupLocationData,
                    dropLocationData:
                      reservationData.trucks[0].dropLocationData,
                    customerInfo: reservationData.customerInfo,
                    totalCost: reservationData.totalCost,
                    paymentStatus: reservationData.paymentStatus,
                  },
                  // Also add coordinate data at truck level for easier access
                  pickupLocationData:
                    reservationData.trucks[0].pickupLocationData,
                  dropLocationData: reservationData.trucks[0].dropLocationData,
                };
              }
              return truck;
            });
          }

          setTrucks(enhancedTrucks);

          // Log assignment details for debugging
          if (user?.uid && enhancedTrucks) {
            const directMatch = enhancedTrucks.find(
              (t) => t.driver?.id === user.uid
            );
            const reservationMatch = enhancedTrucks.find(
              (t) => t.reservationSummary?.assignedDriver?.id === user.uid
            );
            const professionalMatch = driverData?.professionalInfo?.truckId
              ? enhancedTrucks.find(
                  (t) =>
                    t.id === driverData.professionalInfo.truckId ||
                    t.number === driverData.professionalInfo.truckId
                )
              : null;

            // Debug checkpoint data for matched trucks
            [directMatch, reservationMatch, professionalMatch].forEach(
              (truck) => {
                if (truck && process.env.NODE_ENV === "development") {
                  // Debug info available in development mode
                }
              }
            );
          }
        }
      } catch (error) {
        console.error("Error loading enhanced fleet:", error);
        if (mounted) setTrucks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDriverTruckData();

    // Fetch active alerts (optimized routes) for driver truck
    fetch(
      `${import.meta.env.VITE_API_BASE || "http://localhost:4001"}/api/alerts`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (mounted) setAlerts(json.alerts || []);
      })
      .catch(() => {
        if (mounted) setAlerts([]);
      });

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Determine the driver-assigned truck: comprehensive assignment matching
  const selectedTruck = useMemo(() => {
    if (!trucks?.length || !user?.uid) {
      return null;
    }

    // Method 1: Check direct driver assignment on truck object
    const directAssignment = trucks.find((t) => t.driver?.id === user.uid);

    if (directAssignment) {
      return directAssignment;
    }

    // Method 2: Check reservation-based assignment (most important for business reservations)
    const reservationAssignment = trucks.find((t) => {
      const isReservationDriver =
        t.reservationSummary?.assignedDriver?.id === user.uid ||
        t.reservationDetails?.assignedDriver?.id === user.uid;
      return isReservationDriver;
    });

    if (reservationAssignment) {
      return reservationAssignment;
    }

    // Method 3: Check professional info truck assignment
    if (driverProfile?.professionalInfo?.truckId) {
      const assignedTruckId = driverProfile.professionalInfo.truckId;
      const professionalTruck = trucks.find(
        (t) =>
          t.id === assignedTruckId ||
          t.number === assignedTruckId ||
          t.truckId === assignedTruckId ||
          t.licensePlate === assignedTruckId
      );

      if (professionalTruck) {
        return professionalTruck;
      }
    }

    // Method 4: Check driver profile availability assignment (from driver assignment API)
    const availabilityAssignment = trucks.find((t) => {
      // Check if this truck matches the driver's availability.currentTruck
      const matchesAvailability =
        driverProfile?.availability?.currentTruck === t.id ||
        driverProfile?.availability?.currentTruck === t.number;
      return matchesAvailability;
    });

    if (availabilityAssignment) {
      return availabilityAssignment;
    }

    // Method 5: Check for name-based matching (fallback)
    if (driverProfile?.personalInfo) {
      const driverName = `${driverProfile.personalInfo.firstName || ""} ${
        driverProfile.personalInfo.lastName || ""
      }`.trim();
      if (driverName) {
        const nameMatch = trucks.find(
          (t) =>
            t.driver?.name &&
            t.driver.name.toLowerCase().includes(driverName.toLowerCase())
        );

        if (nameMatch) {
          return nameMatch;
        }
      }
    }

    return null;
  }, [trucks, user?.uid, driverProfile]);

  const truckDetails = useMemo(() => {
    // Get truck details from various sources with priority:
    // 1. Selected truck data (from fleet/reservation)
    // 2. Driver profile truckInfo (from signup)
    // 3. Professional info (backup)

    let licensePlate = "Unknown";
    let model = "N/A";
    let lastMaintenance = "N/A";
    let driverName = "Unknown";

    // Primary: Get from selected truck
    if (selectedTruck) {
      licensePlate =
        selectedTruck.licensePlate ||
        selectedTruck.number ||
        selectedTruck.plate ||
        licensePlate;
      model = selectedTruck.model || model;
      if (selectedTruck.year) {
        model += ` (${selectedTruck.year})`;
      }
      driverName =
        selectedTruck.driver?.name ||
        selectedTruck.reservationSummary?.assignedDriver?.name ||
        driverName;

      // Try to get maintenance from truck data
      if (selectedTruck.maintenance?.lastServiceDate) {
        lastMaintenance = new Date(
          selectedTruck.maintenance.lastServiceDate
        ).toLocaleDateString();
      } else if (selectedTruck.lastMaintenanceDate) {
        lastMaintenance = new Date(
          selectedTruck.lastMaintenanceDate
        ).toLocaleDateString();
      }
    }

    // Secondary: Get from driver profile truckInfo (signup data)
    if (driverProfile?.truckInfo) {
      const truckInfo = driverProfile.truckInfo;

      // Use driver's truck info if truck data is not complete
      if (licensePlate === "Unknown" && truckInfo.licensePlate) {
        licensePlate = truckInfo.licensePlate;
      }

      if (model === "N/A" && truckInfo.model) {
        model = truckInfo.model;
        if (truckInfo.year) {
          model += ` (${truckInfo.year})`;
        }
      }

      if (lastMaintenance === "N/A" && truckInfo.lastMaintenanceDate) {
        lastMaintenance = new Date(
          truckInfo.lastMaintenanceDate
        ).toLocaleDateString();
      }
    }

    // Tertiary: Get from professional info
    if (driverProfile?.professionalInfo) {
      const profInfo = driverProfile.professionalInfo;

      if (lastMaintenance === "N/A" && profInfo.lastMaintenanceDate) {
        lastMaintenance = new Date(
          profInfo.lastMaintenanceDate
        ).toLocaleDateString();
      }
    }

    // Get driver name from profile if not available from truck
    if (driverName === "Unknown" && driverProfile?.personalInfo) {
      const personalInfo = driverProfile.personalInfo;
      if (personalInfo.firstName && personalInfo.lastName) {
        driverName = `${personalInfo.firstName} ${personalInfo.lastName}`;
      } else if (personalInfo.firstName) {
        driverName = personalInfo.firstName;
      }
    }

    return {
      licensePlate,
      model,
      lastMaintenance,
      driver: driverName,
      deliveryStatus: selectedTruck?.status || "In Transit",
      maxLoad:
        selectedTruck?.maxCapacity || driverProfile?.truckInfo?.capacity || 0,
      currentLoad: selectedTruck?.currentLoad || 0,
      capacity:
        selectedTruck?.capacity || driverProfile?.truckInfo?.capacity || "N/A",
    };
  }, [selectedTruck, driverProfile]);

  const routeInfo = useMemo(() => {
    // Priority order for route information:
    // 1. Direct route on truck object
    // 2. Reservation summary route
    // 3. Reservation details route

    if (selectedTruck?.route) {
      return selectedTruck.route;
    }

    if (selectedTruck?.reservationSummary) {
      const summary = selectedTruck.reservationSummary;
      // Convert summary to route format
      const routeFromSummary = {
        pickupLocation:
          summary.route?.split(" → ")[0] || summary.pickupLocation,
        dropLocation: summary.route?.split(" → ")[1] || summary.dropLocation,
        pickupDate: summary.pickupDate,
        customerName: summary.customerName,
        checkpoints: summary.checkpoints || [],
        touchpoints: summary.touchpoints || [],
        currentCheckpoint: summary.currentCheckpoint || 0,
      };
      return routeFromSummary;
    }

    if (selectedTruck?.reservationDetails) {
      const details = selectedTruck.reservationDetails;

      // Enhanced route processing from reservation details
      const routeFromDetails = {
        pickupLocation: details.route?.pickupLocation || details.pickupLocation,
        dropLocation: details.route?.dropLocation || details.dropLocation,
        pickupDate: details.route?.pickupDate || details.pickupDate,
        dropDate: details.route?.dropDate || details.dropDate,
        customerName: details.customerInfo?.contactName || details.customerName,

        // Include coordinate data for Google Maps
        pickupLocationData:
          details.pickupLocationData || details.route?.pickupLocationData,
        dropLocationData:
          details.dropLocationData || details.route?.dropLocationData,

        // Process checkpoints from reservation - handle both array and indexed object format
        checkpoints: (() => {
          let checkpoints = [];

          // Handle direct checkpoints array (Firebase structure)
          if (Array.isArray(details.checkpoints)) {
            checkpoints = details.checkpoints;
          }
          // Handle indexed object format (Firebase sometimes stores arrays as objects)
          else if (
            details.checkpoints &&
            typeof details.checkpoints === "object"
          ) {
            // Convert indexed object to array
            checkpoints = Object.keys(details.checkpoints)
              .sort((a, b) => parseInt(a) - parseInt(b)) // Sort by index
              .map((key) => details.checkpoints[key]);
          }
          // Handle route.checkpoints
          else if (details.route?.checkpoints) {
            checkpoints = Array.isArray(details.route.checkpoints)
              ? details.route.checkpoints
              : Object.values(details.route.checkpoints || {});
          }
          // Handle reservation data structure where checkpoints might be nested deeper
          else if (details.reservationId) {
            // This is likely a reservation-based truck, checkpoints should be in the reservation data
          }

          return checkpoints;
        })(),

        touchpoints: details.touchpoints || details.route?.touchpoints || [],
        currentCheckpoint: details.currentCheckpoint || 0,

        // Additional route metadata
        estimatedDistance: details.route?.estimatedDistance,
        estimatedDuration: details.route?.estimatedDuration,
        totalCost: details.totalCost,
        paymentStatus: details.paymentStatus,
      };

      return routeFromDetails;
    }

    return null;
  }, [selectedTruck]);

  const currentLocation = useMemo(() => {
    // Try to get current location from truck data first
    if (selectedTruck?.currentLocation) {
      return selectedTruck.currentLocation;
    }

    if (selectedTruck?.location) {
      return selectedTruck.location;
    }

    // If no current location, try to use pickup location as fallback
    if (selectedTruck?.reservationDetails?.pickupLocationData?.coordinates) {
      const pickup =
        selectedTruck.reservationDetails.pickupLocationData.coordinates;
      return {
        lat: pickup.lat,
        lng: pickup.lng,
        address:
          selectedTruck.reservationDetails.pickupLocation || "Pickup Location",
      };
    }

    // Final fallback - return null to indicate no location available
    return null;
  }, [selectedTruck]);

  const nextCheckpoint = useMemo(() => {
    const cps = routeInfo?.checkpoints || routeInfo?.touchpoints || [];
    const idx = routeInfo?.currentCheckpoint ?? 0;
    return cps[idx] || null;
  }, [routeInfo]);

  const upcomingCheckpoints = useMemo(() => {
    const cps = routeInfo?.checkpoints || routeInfo?.touchpoints || [];
    const idx = (routeInfo?.currentCheckpoint ?? 0) + 1;
    return cps.slice(idx, idx + 3);
  }, [routeInfo]);

  // Create checkpoints array for the Location component with proper structure
  const checkpointsForDisplay = useMemo(() => {
    const cps = routeInfo?.checkpoints || routeInfo?.touchpoints || [];
    const currentIdx = routeInfo?.currentCheckpoint ?? 0;
    return cps.map((cp, index) => {
      let checkpointName = "Checkpoint";
      let checkpointETA = "TBA";
      let checkpointDetails = {};
      if (typeof cp === "string") {
        checkpointName = cp;
      } else if (cp && typeof cp === "object") {
        if (cp.location) {
          checkpointName = cp.location;
        } else if (cp.locationData?.address) {
          checkpointName = cp.locationData.address;
        } else if (cp.name) {
          checkpointName = cp.name;
        } else {
          checkpointName = `Checkpoint ${index + 1}`;
        }
        checkpointETA =
          cp.date || cp.eta || cp.arrivalTime || cp.estimatedArrival || "TBA";
        checkpointDetails = {
          goodsType: cp.goodsType,
          weight: cp.weight ? `${cp.weight} kg` : null,
          handlingInstructions: cp.handlingInstructions,
          date: cp.date,
          dropDate: cp.dropDate,
        };
      }
      const crossed = index < currentIdx;
      return {
        name: checkpointName,
        position: `${((index + 1) / cps.length) * 100}%`,
        completed: index < currentIdx,
        isCurrent: index === currentIdx,
        eta: checkpointETA,
        details: checkpointDetails,
        crossed,
        index,
      };
    });
  }, [routeInfo]);

  // Generate Google Maps Embed URL with directions and waypoints
  const googleMapsEmbedData = useMemo(() => {
    if (!routeInfo) {
      return null;
    }

    // Get pickup location coordinates - multiple possible paths
    let pickup = null;

    // Try different paths for pickup coordinates based on database structure
    if (routeInfo?.pickupLocationData?.coordinates) {
      pickup = routeInfo.pickupLocationData.coordinates;
    } else if (
      selectedTruck?.reservationDetails?.pickupLocationData?.coordinates
    ) {
      pickup = selectedTruck.reservationDetails.pickupLocationData.coordinates;
    } else if (selectedTruck?.pickupLocationData?.coordinates) {
      pickup = selectedTruck.pickupLocationData.coordinates;
    }

    // Get drop location coordinates - multiple possible paths
    let drop = null;

    if (routeInfo?.dropLocationData?.coordinates) {
      drop = routeInfo.dropLocationData.coordinates;
    } else if (
      selectedTruck?.reservationDetails?.dropLocationData?.coordinates
    ) {
      drop = selectedTruck.reservationDetails.dropLocationData.coordinates;
    } else if (selectedTruck?.dropLocationData?.coordinates) {
      drop = selectedTruck.dropLocationData.coordinates;
    }

    // Get checkpoint coordinates
    const checkpoints = routeInfo?.checkpoints || [];

    // Create waypoints array for map display
    const waypoints = [];

    // Add pickup location
    if (pickup) {
      waypoints.push({
        lat: pickup.lat,
        lng: pickup.lng,
        name: routeInfo.pickupLocation || "Pickup Location",
        type: "pickup",
      });
    }

    // Add all checkpoints
    checkpoints.forEach((cp, index) => {
      if (cp?.locationData?.coordinates) {
        waypoints.push({
          lat: cp.locationData.coordinates.lat,
          lng: cp.locationData.coordinates.lng,
          name:
            cp.location || cp.locationData.address || `Checkpoint ${index + 1}`,
          type: "checkpoint",
          details: {
            goodsType: cp.goodsType,
            weight: cp.weight,
            handlingInstructions: cp.handlingInstructions,
            date: cp.date,
          },
        });
      }
    });

    // Add drop location
    if (drop) {
      waypoints.push({
        lat: drop.lat,
        lng: drop.lng,
        name: routeInfo.dropLocation || "Drop Location",
        type: "drop",
      });
    }

    if (waypoints.length === 0) {
      return null;
    }

    // Calculate center point for the map
    const center = {
      lat: waypoints.reduce((sum, wp) => sum + wp.lat, 0) / waypoints.length,
      lng: waypoints.reduce((sum, wp) => sum + wp.lng, 0) / waypoints.length,
    };

    // Generate Google Maps Embed URL (this one allows iframe embedding)
    const embedBaseUrl = "https://www.google.com/maps/embed/v1/directions";
    const apiKey =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE"; // Add your API key to .env file

    let embedUrl = null;
    let externalUrl = null;

    if (pickup && drop && apiKey !== "YOUR_API_KEY_HERE") {
      // Google Maps Embed API URL
      embedUrl = `${embedBaseUrl}?key=${apiKey}`;
      embedUrl += `&origin=${pickup.lat},${pickup.lng}`;
      embedUrl += `&destination=${drop.lat},${drop.lng}`;

      // Add waypoints (checkpoints) - Google Maps Embed API supports up to 25 waypoints
      const checkpointCoords = checkpoints
        .map((cp) => cp?.locationData?.coordinates)
        .filter(Boolean)
        .map((coord) => `${coord.lat},${coord.lng}`)
        .slice(0, 23); // Leave room for origin and destination

      if (checkpointCoords.length > 0) {
        embedUrl += `&waypoints=${checkpointCoords.join("|")}`;
      }

      embedUrl += "&mode=driving&language=en&region=in";

      // Create external URL for "Open in Maps" button
      const coords = waypoints.map((wp) => `${wp.lat},${wp.lng}`);
      externalUrl = `https://www.google.com/maps/dir/${coords.join(
        "/"
      )}?hl=en&gl=in`;
    } else if (pickup && drop) {
      // Fallback: Use location names instead of coordinates if no API key
      const locations = waypoints.map((wp) => encodeURIComponent(wp.name));
      externalUrl = `https://www.google.com/maps/dir/${locations.join(
        "/"
      )}?hl=en&gl=in`;

      // Create a simple embedded map showing the route area
      embedUrl = `https://www.google.com/maps?q=${pickup.lat},${pickup.lng}&output=embed&zoom=10`;
    }

    return {
      embedUrl,
      externalUrl,
      waypoints,
      center,
      hasValidData: waypoints.length >= 2,
    };
  }, [routeInfo, selectedTruck]);

  const handleSOS = () => {
    setShowSOSDialog(true);
  };

  const sendSOSAlert = async () => {
    if (!selectedTruck?.id || !user?.uid) {
      setSosSending(false);
      const missingInfo = [];
      if (!selectedTruck?.id) missingInfo.push("truck information");
      if (!user?.uid) missingInfo.push("user authentication");

      alert(
        `Missing ${missingInfo.join(
          " and "
        )}. Please refresh the page and try again.`
      );
      return;
    }

    setSosSending(true);

    // Set up a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("SOS alert request timed out after 10 seconds"));
      }, 10000); // 10 second timeout
    });

    try {
      const emergencyTypes = {
        general: "Emergency SOS Alert from driver",
        accident: "ACCIDENT - Emergency assistance required immediately",
        breakdown: "VEHICLE BREAKDOWN - Unable to continue route",
        medical:
          "MEDICAL EMERGENCY - Driver requires immediate medical assistance",
        security:
          "SECURITY THREAT - Driver in danger, immediate intervention required",
        weather: "WEATHER EMERGENCY - Unsafe driving conditions, stranded",
        route: "ROUTE EMERGENCY - Lost or unable to access destination",
      };

      const finalMessage = sosMessage.trim() || emergencyTypes[sosType];
      const location = currentLocation || { lat: null, lng: null };

      // Race between the actual call and the timeout
      const sosPromise = alertService.sendSOSAlert(
        user.uid,
        selectedTruck.id,
        location,
        finalMessage,
        {
          emergencyType: sosType,
          urgencyLevel: sosUrgency,
          driverName: `${user?.displayName || user?.email || "Driver"}`,
          vehicleInfo: {
            licensePlate: truckDetails.licensePlate,
            model: truckDetails.model,
          },
          routeInfo: routeInfo
            ? {
                pickupLocation: routeInfo.pickupLocation,
                dropLocation: routeInfo.dropLocation,
                customerName: routeInfo.customerName,
              }
            : null,
          timestamp: new Date().toISOString(),
        }
      );

      const result = await Promise.race([sosPromise, timeoutPromise]);

      if (result.success) {
        setShowSOSDialog(false);
        setSOSMessage("");
        setSOSType("general");
        setSOSUrgency("high");
        setSosSending(false); // Ensure sending state is reset on success

        // Show success notification
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm";
        notification.innerHTML = `
          <div class="flex items-center">
            <div class="bg-white rounded-full p-1 mr-3">
              <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div>
              <div class="font-semibold">SOS Alert Sent Successfully!</div>
              <div class="text-sm opacity-90">Fleet Manager and Super Admin have been notified immediately.</div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      } else {
        setSosSending(false); // Reset sending state on failure
        alert("Failed to send SOS alert: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("SOS Error Details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name,
      });

      let errorMessage = "Failed to send SOS alert. ";

      if (error.message.includes("timeout")) {
        errorMessage +=
          "Request timed out after 10 seconds. Please check your internet connection and try again.";
      } else if (error.message.includes("permission")) {
        errorMessage +=
          "Permission denied. Please check your Firebase permissions.";
      } else if (error.message.includes("network")) {
        errorMessage += "Network error. Please check your internet connection.";
      } else if (error.message.includes("firebase")) {
        errorMessage +=
          "Database connection error. Please try again in a moment.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      setSosSending(false); // Reset sending state on error
      alert(errorMessage);
    } finally {
      setSosSending(false); // Always reset sending state
    }
  };

  // Handle delay report
  const handleDelayReport = async (delayReason, estimatedDelay) => {
    if (!selectedTruck?.id || !user?.uid) return;

    try {
      const result = await alertService.sendDelayAlert(
        user.uid,
        selectedTruck.id,
        delayReason,
        estimatedDelay,
        currentLocation
      );

      if (result.success) {
        alert("Delay report sent successfully!");
      }
    } catch (error) {
      console.error("Error sending delay report:", error);
    }
  };

  // Acknowledge incoming alert
  const acknowledgeAlert = async (alertId) => {
    try {
      await alertService.acknowledgeAlert(alertId, user?.email || "Driver");
      setIncomingAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading truck information...</p>
        </div>
      </div>
    );
  }

  if (!selectedTruck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-4xl mx-auto p-6">
          <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No truck assigned to your account
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Your truck assignment should appear here when a business client
            reserves a truck for you.
          </p>

          {/* Enhanced Debug Information */}
          <div className="bg-white rounded-lg shadow-lg p-6 text-left">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Assignment Debug Information
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Driver Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">
                  Driver Profile
                </h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>User ID:</strong> {user?.uid || "none"}
                  </p>
                  <p>
                    <strong>Email:</strong> {user?.email || "none"}
                  </p>
                  <p>
                    <strong>Professional Truck ID:</strong>{" "}
                    {driverProfile?.professionalInfo?.truckId || "none"}
                  </p>
                  <p>
                    <strong>Driver Name:</strong>{" "}
                    {driverProfile?.personalInfo?.firstName &&
                    driverProfile?.personalInfo?.lastName
                      ? `${driverProfile.personalInfo.firstName} ${driverProfile.personalInfo.lastName}`
                      : "Not set"}
                  </p>
                  <p>
                    <strong>Registration Status:</strong>{" "}
                    {driverProfile?.registrationStatus || "unknown"}
                  </p>
                  {driverProfile?.availability && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p>
                        <strong>Availability Status:</strong>{" "}
                        {driverProfile.availability.status || "unknown"}
                      </p>
                      <p>
                        <strong>Current Truck:</strong>{" "}
                        {driverProfile.availability.currentTruck || "none"}
                      </p>
                      <p>
                        <strong>Current Reservation:</strong>{" "}
                        {driverProfile.availability.currentReservation ||
                          "none"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fleet Information */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">
                  Fleet Status
                </h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Total Trucks Available:</strong>{" "}
                    {trucks?.length || 0}
                  </p>
                  <p>
                    <strong>Reserved Trucks:</strong>{" "}
                    {trucks?.filter((t) => t.isReserved).length || 0}
                  </p>
                  <p>
                    <strong>Trucks with Assigned Drivers:</strong>{" "}
                    {trucks?.filter(
                      (t) =>
                        t.driver?.id || t.reservationSummary?.assignedDriver?.id
                    ).length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Available Trucks Details */}
            {trucks?.length > 0 && (
              <div className="mt-6">
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="font-semibold text-gray-800 cursor-pointer hover:text-gray-600">
                    🚛 Available Trucks ({trucks.length}) - Click to expand
                  </summary>
                  <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                    {trucks.map((truck, index) => (
                      <div
                        key={truck.id}
                        className="bg-white rounded p-3 border border-gray-200"
                      >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-gray-600">
                              Truck:
                            </span>
                            <p className="font-bold">
                              {truck.number || truck.id}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Status:
                            </span>
                            <p
                              className={`font-bold ${
                                truck.isReserved
                                  ? "text-blue-600"
                                  : truck.status === "Available"
                                  ? "text-green-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {truck.status}
                              {truck.isReserved ? " (Reserved)" : ""}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Direct Driver:
                            </span>
                            <p className="font-bold">
                              {truck.driver?.name || "Unassigned"}
                            </p>
                            {truck.driver?.id && (
                              <p className="text-gray-500">
                                ID: {truck.driver.id}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">
                              Reserved Driver:
                            </span>
                            <p className="font-bold">
                              {truck.reservationSummary?.assignedDriver?.name ||
                                truck.reservationDetails?.assignedDriver
                                  ?.name ||
                                "None"}
                            </p>
                            {(truck.reservationSummary?.assignedDriver?.id ||
                              truck.reservationDetails?.assignedDriver?.id) && (
                              <p className="text-gray-500">
                                ID:{" "}
                                {truck.reservationSummary?.assignedDriver?.id ||
                                  truck.reservationDetails?.assignedDriver?.id}
                              </p>
                            )}
                          </div>
                        </div>
                        {truck.isReserved &&
                          (truck.reservationSummary ||
                            truck.reservationDetails) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-600">
                                Reservation:
                              </span>
                              <p className="text-xs">
                                Customer:{" "}
                                {truck.reservationSummary?.customerName ||
                                  truck.reservationDetails?.customerInfo
                                    ?.contactName ||
                                  "Unknown"}
                              </p>
                              <p className="text-xs">
                                Route:{" "}
                                {truck.reservationSummary?.route ||
                                  (truck.reservationDetails?.route
                                    ? `${truck.reservationDetails.route.pickupLocation} → ${truck.reservationDetails.route.dropLocation}`
                                    : "Not specified")}
                              </p>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">
                ℹ️ What to do if you don't see your assignment:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>
                  1. Make sure your profile is complete with professional
                  information
                </li>
                <li>
                  2. Verify that a business client has reserved a truck and
                  assigned it to you
                </li>
                <li>
                  3. Check that your User ID matches the assignment in the
                  system
                </li>
                <li>
                  4. Contact your fleet administrator if the assignment should
                  be visible
                </li>
                <li>
                  5. Try refreshing the page if you just received an assignment
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-indigo-900 mb-2 tracking-tight drop-shadow-lg">
                🚚 Your Truck Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-base mt-2">
                <span className="flex items-center text-indigo-700 font-semibold">
                  <Truck className="w-5 h-5 mr-2" />
                  Truck:{" "}
                  <span className="ml-1 text-indigo-900 font-bold">
                    {selectedTruck.number}
                  </span>
                </span>
                <span
                  className={`px-4 py-1 rounded-full text-sm font-bold shadow ${
                    truckDetails.deliveryStatus === "Reserved"
                      ? "bg-blue-200 text-blue-900"
                      : truckDetails.deliveryStatus === "Active"
                      ? "bg-green-200 text-green-900"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {truckDetails.deliveryStatus}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              {/* Incoming Alerts Button */}
              {incomingAlerts.length > 0 && (
                <button
                  onClick={() => setShowIncomingAlerts(true)}
                  className="relative px-7 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:scale-105 transition-transform flex items-center shadow-xl border-2 border-blue-600 hover:border-indigo-700 font-bold"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Messages</span>
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold border-2 border-white">
                    {incomingAlerts.length}
                  </span>
                </button>
              )}

              {/* Fixed SOS Button - Removed animations and overlay */}
              <button
                onClick={handleSOS}
                disabled={sosSending}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:scale-105 transition-transform font-extrabold shadow-xl disabled:opacity-50 flex items-center border-2 border-red-600 hover:border-pink-700"
              >
                <AlertTriangle className="w-6 h-6 mr-3" />
                {sosSending ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>🚨 EMERGENCY SOS</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Three Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Map (2/3 width on large screens) */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-8 h-[900px] border border-indigo-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <MapPin className="w-8 h-8 text-indigo-600 mr-4 drop-shadow" />
                  <h2 className="text-2xl font-extrabold text-indigo-900 tracking-tight">
                    Live Location Tracking
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-base text-indigo-700 font-semibold">
                    {currentLocation
                      ? `${currentLocation.lat?.toFixed(
                          4
                        )}, ${currentLocation.lng?.toFixed(4)}`
                      : "Location unavailable"}
                  </div>
                  {googleMapsEmbedData?.externalUrl && (
                    <button
                      onClick={() =>
                        window.open(googleMapsEmbedData.externalUrl, "_blank")
                      }
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:scale-105 transition-transform font-bold flex items-center"
                    >
                      <Navigation className="w-5 h-5 mr-2" />
                      Open in Maps
                    </button>
                  )}
                </div>
              </div>

              {/* Route Info Banner */}
              {routeInfo && (
                <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium mb-1">📍 From</p>
                      <p className="text-gray-900 font-semibold text-xs leading-tight">
                        {routeInfo.pickupLocation}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">🎯 To</p>
                      <p className="text-gray-900 font-semibold text-xs leading-tight">
                        {routeInfo.dropLocation}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">
                        👤 Customer
                      </p>
                      <p className="text-gray-900 font-semibold text-xs">
                        {routeInfo.customerName}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Map Container */}
              <div className="h-[calc(100%-140px)] rounded-lg overflow-hidden">
                {googleMapsEmbedData?.hasValidData ? (
                  <div className="h-[680px] relative">
                    {/* Try Google Maps Embed first */}
                    {googleMapsEmbedData.embedUrl &&
                    googleMapsEmbedData.embedUrl.includes(
                      "YOUR_API_KEY_HERE"
                    ) ? (
                      // Custom route visualization when no API key
                      <div className="h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center max-w-md">
                            <Navigation className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                              Route Overview
                            </h3>

                            {/* Route Visualization */}
                            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                              <div className="space-y-3">
                                {googleMapsEmbedData.waypoints.map(
                                  (waypoint, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center"
                                    >
                                      <div
                                        className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${
                                          waypoint.type === "pickup"
                                            ? "bg-green-500"
                                            : waypoint.type === "drop"
                                            ? "bg-red-500"
                                            : "bg-blue-500"
                                        }`}
                                      ></div>
                                      <div className="text-left flex-1">
                                        <p className="text-sm font-medium text-gray-800">
                                          {waypoint.type === "pickup"
                                            ? "📍 Start"
                                            : waypoint.type === "drop"
                                            ? "🎯 End"
                                            : `🛑 Stop ${index}`}
                                        </p>
                                        <p className="text-xs text-gray-600 leading-tight">
                                          {waypoint.name}
                                        </p>
                                        {waypoint.details && (
                                          <div className="mt-1 flex gap-1">
                                            {waypoint.details.goodsType && (
                                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                                {waypoint.details.goodsType}
                                              </span>
                                            )}
                                            {waypoint.details.weight && (
                                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                {waypoint.details.weight} kg
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                              Complete route with{" "}
                              {googleMapsEmbedData.waypoints.length} waypoints
                            </p>

                            <button
                              onClick={() =>
                                window.open(
                                  googleMapsEmbedData.externalUrl,
                                  "_blank"
                                )
                              }
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center"
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Open Full Route in Google Maps
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Google Maps Embed iframe when API key is available
                      <iframe
                        title="Route with Checkpoints"
                        src={googleMapsEmbedData.embedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">
                        No route data available
                      </p>
                      <p className="text-gray-500 text-sm">
                        Route will appear when pickup and drop locations are set
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar (1/3 width on large screens) */}
          <div className="space-y-8">
            {/* Truck Details Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center mb-4">
                <Truck className="w-6 h-6 text-gray-600 mr-3" />
                <h2 className="text-lg font-bold text-gray-900">
                  Truck Details
                </h2>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      License Plate
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {truckDetails.licensePlate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      Model
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {truckDetails.model}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      Driver
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {truckDetails.driver}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      Capacity
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {truckDetails.capacity}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    License Number
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {truckDetails.licenseNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    Last Maintenance
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {truckDetails.lastMaintenance}
                  </p>
                </div>
              </div>
            </div>

<UpdateCheckpoints blockchainOrderId={blockchainOrderId} />

            {/* Route Alerts Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 mr-3" />
                <h2 className="text-lg font-bold text-gray-900">
                  Route Alerts
                </h2>
              </div>

              {alerts.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {alerts.slice(0, 4).map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === "high"
                          ? "bg-red-50 border-l-red-500"
                          : alert.severity === "medium"
                          ? "bg-yellow-50 border-l-yellow-500"
                          : "bg-blue-50 border-l-blue-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-800 flex-1 leading-tight">
                          {alert.message}
                        </p>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                            alert.severity === "high"
                              ? "bg-red-100 text-red-800"
                              : alert.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {alert.severity?.toUpperCase()}
                        </span>
                      </div>
                      {alert.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-2" />
                  <p className="text-gray-500 text-sm">No active alerts</p>
                  <p className="text-xs text-gray-400">
                    All systems operational
                  </p>
                </div>
              )}
            </div>

            {blockchainOrderId > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-3xl shadow-2xl p-8 border border-indigo-200">
                {/* Header */}
                <div className="flex items-center mb-8 border-b-2 pb-4 border-indigo-200">
                  <Airplay className="w-8 h-8 text-indigo-600 mr-3 drop-shadow" />
                  <h2 className="text-2xl font-extrabold text-indigo-900 tracking-tight">
                    Delivery Management
                  </h2>
                </div>

                {/* Grid layout */}
                <div className=" flex flex-col gap-y-4">
                  <div>
                    <UpdateDeliveryStatus
                      blockchainOrderId={blockchainOrderId}
                    />
                  </div>
                  <div>
                    <FinalizeDelivery blockchainOrderId={blockchainOrderId} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed SOS Alert Dialog - Better positioning and scrolling */}
      {showSOSDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-red-500 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-3" />
                  <div>
                    <h3 className="text-lg font-bold">Emergency SOS Alert</h3>
                    <p className="text-red-100 text-sm">
                      This will immediately notify fleet management
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSOSDialog(false);
                    setSosSending(false); // Reset sending state
                    setSOSMessage(""); // Reset form
                    setSOSType("general"); // Reset form
                    setSOSUrgency("high"); // Reset form
                  }}
                  className="text-red-100 hover:text-white transition-colors"
                  disabled={sosSending}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable body */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Emergency Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "general",
                      label: "🚨 General Emergency",
                      color: "bg-red-50 border-red-200 text-red-700",
                    },
                    {
                      value: "accident",
                      label: "💥 Accident",
                      color: "bg-red-50 border-red-200 text-red-700",
                    },
                    {
                      value: "breakdown",
                      label: "🔧 Vehicle Breakdown",
                      color: "bg-orange-50 border-orange-200 text-orange-700",
                    },
                    {
                      value: "medical",
                      label: "🏥 Medical Emergency",
                      color: "bg-red-50 border-red-200 text-red-700",
                    },
                    {
                      value: "security",
                      label: "🔒 Security Threat",
                      color: "bg-red-50 border-red-200 text-red-700",
                    },
                    {
                      value: "weather",
                      label: "🌪️ Weather Emergency",
                      color: "bg-blue-50 border-blue-200 text-blue-700",
                    },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className={`p-2 rounded-lg border-2 cursor-pointer transition-all text-xs font-medium ${
                        sosType === type.value
                          ? "border-red-500 bg-red-50 text-red-700"
                          : type.color + " hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sosType"
                        value={type.value}
                        checked={sosType === type.value}
                        onChange={(e) => setSOSType(e.target.value)}
                        className="sr-only"
                        disabled={sosSending}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Urgency Level */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="flex gap-2">
                  {[
                    {
                      value: "critical",
                      label: "CRITICAL",
                      color: "bg-red-500 text-white",
                    },
                    {
                      value: "high",
                      label: "HIGH",
                      color: "bg-orange-500 text-white",
                    },
                    {
                      value: "medium",
                      label: "MEDIUM",
                      color: "bg-yellow-500 text-white",
                    },
                  ].map((level) => (
                    <label
                      key={level.value}
                      className={`flex-1 p-2 rounded-lg cursor-pointer transition-all text-center font-bold text-sm ${
                        sosUrgency === level.value
                          ? level.color
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sosUrgency"
                        value={level.value}
                        checked={sosUrgency === level.value}
                        onChange={(e) => setSOSUrgency(e.target.value)}
                        className="sr-only"
                        disabled={sosSending}
                      />
                      {level.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={sosMessage}
                  onChange={(e) => setSOSMessage(e.target.value)}
                  placeholder="Provide any additional details about the emergency..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                  rows={2}
                  maxLength={500}
                  disabled={sosSending}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {sosMessage.length}/500 characters
                </div>
              </div>

              {/* Driver Info Display */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Alert Information
                </h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>
                    <strong>Driver:</strong>{" "}
                    {user?.displayName || user?.email || "Driver"}
                  </div>
                  <div>
                    <strong>Vehicle:</strong> {truckDetails.licensePlate} (
                    {truckDetails.model})
                  </div>
                  <div>
                    <strong>Location:</strong>{" "}
                    {currentLocation
                      ? `${currentLocation.lat?.toFixed(
                          4
                        )}, ${currentLocation.lng?.toFixed(4)}`
                      : "Location unavailable"}
                  </div>
                  {routeInfo && (
                    <div>
                      <strong>Route:</strong> {routeInfo.pickupLocation} →{" "}
                      {routeInfo.dropLocation}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="bg-gray-50 px-4 py-3 rounded-b-2xl flex gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowSOSDialog(false);
                  setSosSending(false); // Reset sending state
                  setSOSMessage(""); // Reset form
                  setSOSType("general"); // Reset form
                  setSOSUrgency("high"); // Reset form
                }}
                disabled={sosSending}
                className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendSOSAlert}
                disabled={sosSending}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold disabled:opacity-50 flex items-center justify-center text-sm"
              >
                {sosSending ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Send Alert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Alerts Dialog */}
      {/* Checkpoint Update Modal */}
      {showCheckpointModal && selectedCheckpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <MapPin className="w-6 h-6 text-blue-600 mr-2" />
                  Update Checkpoint
                </h3>
                <button
                  onClick={() => setShowCheckpointModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedCheckpoint.name}
                  </p>
                  {selectedCheckpoint.location && (
                    <p className="text-xs text-blue-700 mt-1">
                      {selectedCheckpoint.location}
                    </p>
                  )}
                </div>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={checkpointForm.status}
                      onChange={(e) =>
                        setCheckpointForm({
                          ...checkpointForm,
                          status: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="in_progress">🚚 In Progress</option>
                      <option value="completed">✅ Completed</option>
                      <option value="delayed">⚠️ Delayed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={checkpointForm.notes}
                      onChange={(e) =>
                        setCheckpointForm({
                          ...checkpointForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Add any notes about this checkpoint status update..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arrival Time
                      </label>
                      <input
                        type="datetime-local"
                        value={checkpointForm.arrivalTime}
                        onChange={(e) =>
                          setCheckpointForm({
                            ...checkpointForm,
                            arrivalTime: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departure Time
                      </label>
                      <input
                        type="datetime-local"
                        value={checkpointForm.departureTime}
                        onChange={(e) =>
                          setCheckpointForm({
                            ...checkpointForm,
                            departureTime: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo Condition
                    </label>
                    <select
                      value={checkpointForm.condition}
                      onChange={(e) =>
                        setCheckpointForm({
                          ...checkpointForm,
                          condition: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="excellent">🌟 Excellent</option>
                      <option value="good">✅ Good</option>
                      <option value="fair">⚠️ Fair</option>
                      <option value="poor">❗ Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={checkpointForm.notes}
                      onChange={(e) =>
                        setCheckpointForm({
                          ...checkpointForm,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Add any notes about this checkpoint..."
                    />
                  </div>
                </form>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowCheckpointModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      updateCheckpointStatus(
                        0, // first truck in the array
                        selectedTruck.trucks[0].checkpoints.indexOf(
                          selectedCheckpoint
                        ),
                        checkpointForm.status,
                        checkpointForm.notes
                      );
                      setShowCheckpointModal(false);
                    }}
                    disabled={!checkpointForm.status}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Checkpoint
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Delivery Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <CheckSquare className="w-6 h-6 text-green-600 mr-2" />
                  Finalize Delivery
                </h3>
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order ID
                  </label>
                  <input
                    type="text"
                    value={finalizeForm.orderId}
                    onChange={(e) =>
                      setFinalizeForm({
                        ...finalizeForm,
                        orderId: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter order ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carrier Wallet Address
                  </label>
                  <input
                    type="text"
                    value={finalizeForm.walletAddress}
                    onChange={(e) =>
                      setFinalizeForm({
                        ...finalizeForm,
                        walletAddress: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter wallet address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Notes
                  </label>
                  <textarea
                    value={finalizeForm.deliveryNotes}
                    onChange={(e) =>
                      setFinalizeForm({
                        ...finalizeForm,
                        deliveryNotes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    placeholder="Add any final notes about the delivery"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowFinalizeModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      updateDeliveryStatus(selectedStatus, statusNote)
                    }
                    disabled={!selectedStatus}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showIncomingAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-w-md max-h-96 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-600" />
                Incoming Messages ({incomingAlerts.length})
              </h3>
              <button
                onClick={() => setShowIncomingAlerts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {incomingAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">No new messages</p>
                  <p className="text-sm text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.type === "dispatch_instructions" &&
                        alert.metadata?.priority === "critical"
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                              {alert.type === "dispatch_instructions"
                                ? "📋 Instructions"
                                : "🗺️ Route Update"}
                            </span>
                            {alert.metadata?.priority === "critical" && (
                              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                URGENT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 font-medium">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            From: Super Admin •{" "}
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          title="Mark as read"
                        >
                          ✓ Got it
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-600">
                Messages from Fleet Management will appear here
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TruckDetails;