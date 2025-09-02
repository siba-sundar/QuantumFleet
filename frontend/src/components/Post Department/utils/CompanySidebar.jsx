import React, { useState } from 'react';
import { Building2, Search } from 'lucide-react';

const CompanySidebar = ({ companies, selectedCompanyId, onCompanySelect, loading = false, error = null }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter companies based on search term
    const filteredCompanies = companies.filter(company => 
        company.driver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active':
                return 'text-green-500';
            case 'Pending':
                return 'text-yellow-500';
            case 'Inactive':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    return (
        <div className="sticky top-0 self-start h-screen w-full bg-white shadow-xl border-r border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Companies</h2>
                </div>
                
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Company List */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading companies...</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 text-center">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {!loading && !error && filteredCompanies.length === 0 && (
                    <div className="p-4 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                            {searchTerm ? 'No companies match your search' : 'No companies found'}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredCompanies.map((company) => (
                    <div
                        key={company.id}
                        onClick={() => onCompanySelect(company.id)}
                        className={`
                            cursor-pointer p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors
                            ${selectedCompanyId === company.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
                        `}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className={`
                                    font-medium truncate
                                    ${selectedCompanyId === company.id ? 'text-blue-900' : 'text-gray-900'}
                                `}>
                                    {company.driver || 'Unknown Company'}
                                </h3>
                                <p className={`
                                    text-sm truncate mt-1
                                    ${selectedCompanyId === company.id ? 'text-blue-700' : 'text-gray-600'}
                                `}>
                                    {company.email || 'No email'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`
                                        text-xs px-2 py-1 rounded-full font-medium
                                        ${company.status === 'Active' 
                                            ? 'bg-green-100 text-green-800' 
                                            : company.status === 'Pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }
                                    `}>
                                        {company.status}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Selection indicator */}
                            {selectedCompanyId === company.id && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2"></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                    {filteredCompanies.length} of {companies.length} companies
                </p>
            </div>
        </div>
    );
};

export default CompanySidebar;