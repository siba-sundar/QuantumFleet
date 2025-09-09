import React, { useState } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { LoadingButton } from "./LoadingButton";
import { Key, Lock, ShieldCheck, ShieldX } from "lucide-react";
import AccessRegistryABI from "../../../abi/AccessRegistry.json"; // export ABI here

// 🚀 Put your deployed AccessRegistry contract address here
const ACCESS_CONTRACT_ADDRESS = import.meta.env.VITE_ACCESS_ADDRESS;

const ROLES = [
  { value: 1, label: "Admin" },
  { value: 2, label: "Fleet Owner" },
  { value: 3, label: "Carrier" },
  { value: 4, label: "Third Party Logistics" },
  { value: 5, label: "Customer" },
];

export default function AccessControl() {
  const [formData, setFormData] = useState({
    account: "",
    role: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasRole, setHasRole] = useState(null);
  const [activeOperation, setActiveOperation] = useState(null);

  // ✅ Helper: get contract instance
  const getContract = (withSigner = false) => {
    if (!window.ethereum) throw new Error("MetaMask not detected");
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (withSigner) {
      return provider.getSigner().then((signer) => {
        return new ethers.Contract(ACCESS_CONTRACT_ADDRESS, AccessRegistryABI, signer);
      });
    }
    return new ethers.Contract(ACCESS_CONTRACT_ADDRESS, AccessRegistryABI, provider);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setHasRole(null);
  };

  const checkRole = async () => {
    if (!formData.account || formData.role === "") {
      toast.error("Please enter both account and role");
      return;
    }

    setActiveOperation("check");
    setIsLoading(true);

    try {
      const contract = await getContract(false);
      const roleInt = parseInt(formData.role, 10);
      const response = await contract.hasRole(formData.account, roleInt);
      setHasRole(response);
      toast.success("Role check completed");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to check role");
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  };

  const handleGrantRole = async () => {
    if (!formData.account || formData.role === "") {
      toast.error("Please enter both account and role");
      return;
    }

    setActiveOperation("grant");
    setIsLoading(true);

    try {
      const contract = await getContract(true);
      const roleInt = parseInt(formData.role, 10);
      const tx = await contract.grantRole(formData.account, roleInt);
      await tx.wait();
      toast.success("Role granted successfully");
      setHasRole(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to grant role");
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  };

  const handleRevokeRole = async () => {
    if (!formData.account || formData.role === "") {
      toast.error("Please enter both account and role");
      return;
    }

    setActiveOperation("revoke");
    setIsLoading(true);

    try {
      const contract = await getContract(true);
      const roleInt = parseInt(formData.role, 10);
      const tx = await contract.revokeRole(formData.account, roleInt);
      await tx.wait();
      toast.success("Role revoked successfully");
      setHasRole(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to revoke role");
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="flex items-center mb-6 text-2xl font-bold text-gray-800">
        <Key className="w-6 h-6 mr-2" />
        Access Control
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Address
          </label>
          <input
            type="text"
            name="account"
            value={formData.account}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="0x..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">Select Role</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Role Status */}
        {hasRole !== null && (
          <div
            className={`p-4 rounded-lg ${
              hasRole ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <div className="flex items-center">
              {hasRole ? (
                <ShieldCheck className="w-5 h-5 mr-2 text-green-600" />
              ) : (
                <ShieldX className="w-5 h-5 mr-2 text-red-600" />
              )}
              <span
                className={`font-medium ${
                  hasRole ? "text-green-800" : "text-red-800"
                }`}
              >
                Account {hasRole ? "has" : "does not have"} this role
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <LoadingButton
            type="button"
            onClick={checkRole}
            isLoading={isLoading && activeOperation === "check"}
            className="bg-gray-600 hover:bg-gray-700"
          >
            <Lock className="w-4 h-4 mr-2" />
            Check Role
          </LoadingButton>

          <LoadingButton
            type="button"
            onClick={handleGrantRole}
            isLoading={isLoading && activeOperation === "grant"}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Grant Role
          </LoadingButton>

          <LoadingButton
            type="button"
            onClick={handleRevokeRole}
            isLoading={isLoading && activeOperation === "revoke"}
            className="bg-red-600 hover:bg-red-700"
          >
            <ShieldX className="w-4 h-4 mr-2" />
            Revoke Role
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
