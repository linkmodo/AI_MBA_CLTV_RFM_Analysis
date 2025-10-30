import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, ColumnMapping } from '../types';
import { cleanData } from '../utils/dataProcessing';
import { getAiAnalysis } from '../services/geminiService';
import Card from './common/Card';
import Loader from './common/Loader';
import { SparklesIcon } from './icons/SparklesIcon';

interface CleaningStepProps {
    rawTransactions: Transaction[];
    setCleanedTransactions: (transactions: Transaction[]) => void;
    columnMapping: ColumnMapping | null;
    setColumnMapping: (mapping: ColumnMapping | null) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

const CleaningStep: React.FC<CleaningStepProps> = ({
    rawTransactions,
    setCleanedTransactions,
    columnMapping,
    setColumnMapping,
    goToNextStep,
    goToPrevStep,
}) => {
    const [localMapping, setLocalMapping] = useState<ColumnMapping>({
        customerId: '',
        invoiceId: '',
        invoiceDate: '',
        quantity: '',
        unitPrice: '',
        description: '',
    });
    const [cleaningOptions, setCleaningOptions] = useState({
        removeNullCustomerId: true,
        removeNegativeQuantity: true,
        removeDuplicateTransactions: true,
        handleMissingUnitPrice: true,
    });
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [error, setError] = useState('');
    const [cleanedCount, setCleanedCount] = useState<number | null>(null);

    const headers = useMemo(() => {
        if (rawTransactions.length === 0) return [];
        return Object.keys(rawTransactions[0]);
    }, [rawTransactions]);

    useEffect(() => {
        if (columnMapping) {
            setLocalMapping(columnMapping);
        }
    }, [columnMapping]);

    const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
        setLocalMapping(prev => ({ ...prev, [field]: value }));
        setError('');
        setCleanedCount(null);
    };

    const handleAiMapping = async () => {
        setIsAiLoading(true);
        setError('');
        const prompt = `Given the following CSV headers: [${headers.join(', ')}].
Map them to the required fields: customerId, invoiceId, invoiceDate, quantity, unitPrice, description.
- customerId should uniquely identify a customer.
- invoiceId should uniquely identify a single transaction or order.
- invoiceDate should be the date of the transaction.
- quantity is the number of items purchased.
- unitPrice is the price of a single item.
- description is the name or description of the product.
Return ONLY the mapping as a valid JSON object with keys "customerId", "invoiceId", "invoiceDate", "quantity", "unitPrice", "description" and values corresponding to the provided headers. Do not include any other text or markdown formatting.`;

        try {
            const result = await getAiAnalysis(prompt);
            const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedMapping = JSON.parse(cleanedResult);

            // Validate that the parsed mapping values are actual headers
            const validMapping: ColumnMapping = { customerId: '', invoiceId: '', invoiceDate: '', quantity: '', unitPrice: '', description: '' };
            let isValid = true;
            for (const key in parsedMapping) {
                if (headers.includes(parsedMapping[key])) {
                    (validMapping as any)[key] = parsedMapping[key];
                } else {
                    isValid = false;
                    console.warn(`AI suggested an invalid header "${parsedMapping[key]}" for field "${key}"`);
                }
            }
            if (isValid && Object.values(validMapping).every(v => v !== '')) {
                 setLocalMapping(validMapping);
            } else {
                 setError('AI could not confidently map all fields. Please review the mapping manually.');
            }
        } catch (err) {
            setError('Failed to get AI mapping suggestions. Please map the columns manually.');
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleCleaningOptionChange = (option: keyof typeof cleaningOptions) => {
        setCleaningOptions(prev => ({ ...prev, [option]: !prev[option] }));
        setCleanedCount(null);
    };

    const handleProcessAndNext = () => {
        setError('');
        const requiredFields: (keyof ColumnMapping)[] = ['customerId', 'invoiceId', 'invoiceDate', 'quantity', 'unitPrice', 'description'];
        const missingMappings = requiredFields.filter(field => !localMapping[field]);

        if (missingMappings.length > 0) {
            setError(`Please map the following fields: ${missingMappings.join(', ')}.`);
            return;
        }

        try {
            const cleaned = cleanData(rawTransactions, localMapping, cleaningOptions);
            if(cleaned.length === 0) {
                setError("Cleaning process resulted in 0 valid transactions. Please review your mapping and cleaning options.");
                setCleanedCount(0);
                return;
            }
            setCleanedTransactions(cleaned);
            setColumnMapping(localMapping);
            setCleanedCount(cleaned.length);
            // Wait a bit to show the success message before moving on
            setTimeout(() => {
                goToNextStep();
            }, 1000);
        } catch (err) {
            setError('An error occurred during data cleaning. Check console for details.');
            console.error(err);
        }
    };

    if (rawTransactions.length === 0) {
        return (
             <Card>
                <p>No raw data available. Please go back to the upload step.</p>
                <button onClick={goToPrevStep} className="mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
            </Card>
        )
    }

    const mappingFields: { key: keyof ColumnMapping, label: string, description: string }[] = [
        { key: 'customerId', label: 'Customer ID', description: 'Column that uniquely identifies each customer.' },
        { key: 'invoiceId', label: 'Invoice ID', description: 'Column that uniquely identifies each transaction/order.' },
        { key: 'invoiceDate', label: 'Invoice Date', description: 'Column containing the date of the transaction.' },
        { key: 'description', label: 'Product Description', description: 'Column containing the name of the item purchased.' },
        { key: 'quantity', label: 'Quantity', description: 'Column with the number of items in the transaction.' },
        { key: 'unitPrice', label: 'Unit Price', description: 'Column with the price of a single item.' },
    ];

    const cleaningConfig: { key: keyof typeof cleaningOptions, label: string, description: string }[] = [
        { key: 'removeNullCustomerId', label: 'Remove rows with missing Customer ID', description: 'Ensures every transaction is tied to a customer.' },
        { key: 'removeNegativeQuantity', label: 'Remove transactions with negative quantity', description: 'Often represents returns, which are excluded from this analysis.' },
        { key: 'handleMissingUnitPrice', label: 'Remove rows with zero or missing Unit Price', description: 'Ensures all transactions contribute to monetary value.' },
        { key: 'removeDuplicateTransactions', label: 'Remove duplicate transaction rows', description: 'Cleans the dataset from identical entries.' },
    ];

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Data Cleaning & Preparation</h2>
            <p className="text-sm text-gray-600 mb-4">Map your data columns to the required fields and select cleaning operations to ensure data quality.</p>
            
            {/* Dataset Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 Dataset Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-blue-600 font-medium">Total Rows</p>
                        <p className="text-blue-900 font-bold text-lg">{rawTransactions.length.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-blue-600 font-medium">Total Columns</p>
                        <p className="text-blue-900 font-bold text-lg">{headers.length}</p>
                    </div>
                    <div>
                        <p className="text-blue-600 font-medium">Column Names</p>
                        <p className="text-blue-900 text-xs truncate" title={headers.join(', ')}>
                            {headers.slice(0, 3).join(', ')}{headers.length > 3 ? '...' : ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-600 font-medium">File Size</p>
                        <p className="text-blue-900 font-bold text-lg">
                            {(JSON.stringify(rawTransactions).length / 1024).toFixed(0)} KB
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column Mapping Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Column Mapping</h3>
                        <button onClick={handleAiMapping} disabled={isAiLoading || headers.length === 0} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                           <SparklesIcon className="h-4 w-4 mr-2" />
                           {isAiLoading ? 'Analyzing...' : 'Suggest with AI'}
                        </button>
                    </div>
                     <div className="space-y-4">
                        {mappingFields.map(field => (
                            <div key={field.key}>
                                <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">{field.label}</label>
                                <p className="text-xs text-gray-500 mb-1">{field.description}</p>
                                <select
                                    id={field.key}
                                    value={localMapping[field.key] || ''}
                                    onChange={e => handleMappingChange(field.key, e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
                                >
                                    <option value="">Select a column...</option>
                                    {headers.map(header => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cleaning Options Section */}
                <div>
                     <h3 className="text-lg font-medium text-gray-800 mb-4">Cleaning Options</h3>
                     <fieldset className="space-y-4">
                         {cleaningConfig.map(opt => (
                            <div key={opt.key} className="relative flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id={opt.key}
                                        type="checkbox"
                                        checked={cleaningOptions[opt.key]}
                                        onChange={() => handleCleaningOptionChange(opt.key)}
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor={opt.key} className="font-medium text-gray-700">{opt.label}</label>
                                    <p className="text-gray-500">{opt.description}</p>
                                </div>
                            </div>
                         ))}
                     </fieldset>
                </div>
            </div>

            {error && <p className="mt-6 text-sm text-red-600 text-center">{error}</p>}
            {cleanedCount !== null && !error && (
                <p className="mt-6 text-sm text-green-600 text-center">
                    Successfully cleaned data. {cleanedCount} of {rawTransactions.length} transactions remaining. Proceeding to next step...
                </p>
            )}

            <div className="mt-8 flex justify-between">
                <button onClick={goToPrevStep} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
                <button onClick={handleProcessAndNext} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    Analyze Data &rarr;
                </button>
            </div>
        </Card>
    );
};

export default CleaningStep;