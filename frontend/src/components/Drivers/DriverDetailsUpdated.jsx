import React, { useState, useEffect } from "react";
import { User, AlertTriangle, Edit, Plus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useDrivers } from "../../hooks/useFirestore.js";
import { useNavigate, useLocation } from "react-router-dom";
import VehicleDetailsContainer from "./VehicleDetailsContainer.jsx";
import CarrierTransactions from "../common/blockchain/CarrierTransactions.jsx";

const DriverDetailsUpdated = () => {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useAuth();
  const { findByUserId } = useDrivers();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.updated && location.state?.message) {
      setSuccessMessage(location.state.message);
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (!user?.uid) {
        setError("No user authenticated");
        setLoading(false);
        return;
      }
      try {
        const result = await findByUserId(user.uid);
        if (result.success && result.data) {
          setDriverData(result.data);
        } else {
          setError("Driver profile not found");
        }
      } catch (err) {
        console.error("Error fetching driver data:", err);
        setError("Failed to load driver profile");
      } finally {
        setLoading(false);
      }
    };
    fetchDriverData();
  }, [user?.uid, findByUserId, location.state?.sentimentData]);

  const colorCodes = {
    excellent: "bg-green-600",
    good: "bg-blue-600",
    satisfactory: "bg-yellow-500",
    concern: "bg-red-600",
  };

  const getStatus = () => {
    if (!driverData) return "concern";
    const hasPersonal =
      driverData.personalInfo?.firstName && driverData.personalInfo?.lastName;
    const hasLicense = driverData.licenseInfo?.licenseNumber;
    const hasProfessional = driverData.professionalInfo?.employeeId;
    if (hasPersonal && hasLicense && hasProfessional) return "excellent";
    if (hasPersonal && hasLicense) return "good";
    if (hasPersonal) return "satisfactory";
    return "concern";
  };

  const handleEditProfessionalInfo = () => {
    navigate("/auth/driver/professional-details", {
      state: { isNewUser: false },
    });
  };
  const handleEditPersonalInfo = () => {
    navigate("/auth/driver/personal-details", { state: { isEditing: true } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">
            Loading driver profile...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-50 to-white">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error Loading Profile
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/auth/driver/professional-details")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-all"
          >
            Complete Profile Setup
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus();
  const statusText =
    status === "excellent"
      ? "Complete Profile"
      : status === "good"
      ? "Professional Details Needed"
      : status === "satisfactory"
      ? "License & Professional Details Needed"
      : "Profile Incomplete";

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {successMessage && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}

      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Driver Dashboard</h1>
        <span
          className={`px-4 py-1.5 rounded-full text-white text-sm font-medium shadow ${colorCodes[status]}`}
        >
          {statusText}
        </span>
      </header>

      <div className="flex gap-8">
        {/* Personal Info */}
        <div className="bg-white p-6 w-full lg:w-2/3 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <User className="h-6 w-6 mr-2 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Personal Information
              </h2>
            </div>
            <button
              onClick={handleEditPersonalInfo}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <User className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {driverData?.personalInfo?.firstName || "N/A"}{" "}
                {driverData?.personalInfo?.lastName || ""}
              </h3>
              <p className="text-gray-500">Driver</p>
              <p className="text-sm text-gray-400">
                Phone: {driverData?.phoneNumber || "Not provided"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p>
                <strong>Date of Birth:</strong>{" "}
                {driverData?.personalInfo?.dateOfBirth || "Not provided"}
              </p>
              <p>
                <strong>License Number:</strong>{" "}
                {driverData?.licenseInfo?.licenseNumber || "Not provided"}
              </p>
              <p>
                <strong>State of Issue:</strong>{" "}
                {driverData?.licenseInfo?.stateOfIssue || "Not provided"}
              </p>
              <p>
                <strong>Wallet Address:</strong>{" "}
                {driverData?.walletAddress || "Not provided"}
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong>License Expires:</strong>{" "}
                {driverData?.licenseInfo?.licenseExpiration || "Not provided"}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {driverData?.address?.city || "Not provided"},{" "}
                {driverData?.address?.state || ""}
              </p>
              <p>
                <strong>Status:</strong>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    driverData?.registrationStatus === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {driverData?.registrationStatus || "Pending"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="w-full lg:w-1/3 bg-gradient-to-br from-indigo-800 to-indigo-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Professional Summary</h2>
            <button
              onClick={handleEditProfessionalInfo}
              className="p-2 bg-white text-indigo-700 rounded-lg hover:bg-gray-100 transition"
            >
              {driverData?.professionalInfo?.employeeId ? (
                <Edit className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>

          {driverData?.professionalInfo?.employeeId ? (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Employee ID:</strong>{" "}
                {driverData.professionalInfo.employeeId}
              </p>
              <p>
                <strong>Experience:</strong>{" "}
                {driverData.professionalInfo.experience} years
              </p>
              <p>
                <strong>Current Assignment:</strong>{" "}
                {driverData.professionalInfo.currentAssignment}
              </p>
              <p>
                <strong>Truck ID:</strong> {driverData.professionalInfo.truckId}
              </p>
              {driverData.professionalInfo.department && (
                <p>
                  <strong>Department:</strong>{" "}
                  {driverData.professionalInfo.department}
                </p>
              )}
              {driverData.professionalInfo.supervisor && (
                <p>
                  <strong>Supervisor:</strong>{" "}
                  {driverData.professionalInfo.supervisor}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Professional details not completed</p>
              <button
                onClick={handleEditProfessionalInfo}
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-gray-100 transition"
              >
                Add Professional Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carrier Transactions */}
      <CarrierTransactions />

      {/* Vehicle Details */}
      <div className="mt-8">
        <VehicleDetailsContainer driverId={user?.uid} />
      </div>
    </div>
  );
};

export default DriverDetailsUpdated;
