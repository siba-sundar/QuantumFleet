import React, { useState, useEffect } from 'react'
import CompanySidebar from "../utils/CompanySidebar.jsx"
import CompanyDetailsCard from "../utils/CompanyDetailsCard.jsx"
import TruckList from "../utils/truckList.jsx"
import { Building2, Truck, RefreshCw } from 'lucide-react'

function CompanyDetails() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [selectedCompanyData, setSelectedCompanyData] = useState(null);
    const [companyTrucks, setCompanyTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Load companies from database
    useEffect(() => {
        loadCompaniesFromDatabase();
    }, []);

    const loadCompaniesFromDatabase = async () => {
        try {
            setLoading(true);
            
            // Fetch business profiles from API instead of direct repository access
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE || 'http://localhost:4001'}/api/business-profiles`
            );
            
            if (response.ok) {
                const data = await response.json();
                const businessData = data.profiles || [];
                
                if (businessData.length > 0) {
                    const formattedCompanies = businessData.map(business => ({
                        id: business.id,
                        driver: business.businessDetails?.companyName || business.businessInfo?.firmName || business.email || 'Unknown Company',
                        number: business.businessDetails?.gstNumber || business.businessInfo?.gstNumber || business.businessDetails?.panNumber || 'N/A',
                        status: business.registrationStatus === 'completed' ? 'Active' : 'Pending',
                        image: "",
                        email: business.email,
                        phone: business.businessDetails?.contactNumber || business.businessInfo?.contactNumber,
                        address: business.businessDetails?.address || business.address?.streetAddress,
                        businessUid: business.id
                    }));
                    setCompanies(formattedCompanies);
                    
                    // Select first company by default
                    if (formattedCompanies.length > 0) {
                        setSelectedCompanyId(formattedCompanies[0].id);
                        loadCompanyDetails(formattedCompanies[0].id, formattedCompanies);
                    }
                }
            } else {
                throw new Error('Failed to fetch business profiles');
            }
        } catch (error) {
            console.error('Error loading companies:', error);
            setError('Failed to load companies from database');
            setCompanies([]);
            setSelectedCompanyId(null);
            setSelectedCompanyData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load specific company details when selected
    const loadCompanyDetails = async (companyId, companiesList = companies) => {
        try {
            const company = companiesList.find(c => c.id === companyId);
            if (company) {
                setSelectedCompanyData(company);
                
                // Load company-specific trucks
                await loadCompanyTrucks(companyId);
            }
        } catch (error) {
            console.error('Error loading company details:', error);
            setError('Failed to load company details');
        }
    };

    const loadCompanyTrucks = async (companyId) => {
        try {
            // Try to fetch real truck data from reservations
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE || 'http://localhost:4001'}/api/business/${companyId}/trucks`
            );
            
            if (response.ok) {
                const data = await response.json();
                setCompanyTrucks(data.trucks || []);
            }
        } catch (error) {
            console.error('Error loading company trucks:', error);
            setCompanyTrucks([]);
        }
    };

    // Handle company selection
    const handleCompanySelect = async (companyId) => {
        setSelectedCompanyId(companyId);
        await loadCompanyDetails(companyId);
    };

    // Refresh data
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadCompaniesFromDatabase();
        setRefreshing(false);
    };

    const selectedCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">Loading Company Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='grid grid-cols-[280px_1fr] min-h-screen'>
            {/* Company Sidebar */}
            <CompanySidebar 
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onCompanySelect={handleCompanySelect}
                loading={loading}
                error={error}
            />

            {/* Main Content */}
            <div className="flex flex-col p-6 bg-gray-50">
                {/* Header */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <Building2 className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Super Admin Dashboard</h1>
                                <p className="text-gray-600">Comprehensive company management and analytics</p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh Data'}
                        </button>
                    </div>
                    
                    {error && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                            <p className="text-yellow-800 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Company Details */}
                {selectedCompany ? (
                    <div className="space-y-6">
                        {/* Company Information Card */}
                        <CompanyDetailsCard 
                            company={selectedCompany} 
                            businessUid={selectedCompany.businessUid || selectedCompany.id}
                        />

                        {/* Truck List */}
                        <div className="bg-white rounded-lg shadow-md">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800">Active Trucks</h3>
                                <p className="text-sm text-gray-600">{companyTrucks.length} trucks assigned</p>
                            </div>
                            <div className="p-4">
                                {companyTrucks.length > 0 ? (
                                    <TruckList trucks={companyTrucks} selectedCompany={selectedCompany} />
                                ) : (
                                    <div className="text-center py-8">
                                        <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No trucks assigned</p>
                                        <p className="text-sm text-gray-400">This company hasn't been assigned any trucks yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Selected</h3>
                        <p className="text-gray-600">
                            Select a company from the sidebar to view detailed information.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanyDetails