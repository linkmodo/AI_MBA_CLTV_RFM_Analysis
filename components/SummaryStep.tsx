import React from 'react';
import { Transaction, RFMData, CLTVData, MBAData } from '../types';
import Card from './common/Card';
import { exportToCsv } from '../utils/dataProcessing';
import { DownloadIcon } from './icons/DownloadIcon';

interface SummaryStepProps {
    cleanedTransactions: Transaction[];
    rfmData: RFMData[];
    cltvData: CLTVData[];
    mbaData: MBAData | null;
    resetState: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ cleanedTransactions, rfmData, cltvData, mbaData, resetState }) => {
    
    return (
        <Card>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Analysis Complete!</h2>
                <p className="mt-2 text-md text-gray-600">You have successfully analyzed your customer data. You can now export your results or start a new analysis.</p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center">
                    <h3 className="text-lg font-medium text-gray-900">Cleaned Transaction Data</h3>
                    <p className="mt-1 text-sm text-gray-500">{cleanedTransactions.length} records processed.</p>
                    <button 
                        onClick={() => exportToCsv(cleanedTransactions, 'cleaned_transactions.csv')}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                       <DownloadIcon className="h-5 w-5 mr-2" />
                       Export CSV
                    </button>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center">
                    <h3 className="text-lg font-medium text-gray-900">Market Basket Analysis</h3>
                    <p className="mt-1 text-sm text-gray-500">{mbaData?.rules.length || 0} association rules found.</p>
                    <button 
                        onClick={() => mbaData && exportToCsv(mbaData.rules, 'market_basket_analysis.csv')}
                        disabled={!mbaData || mbaData.rules.length === 0}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                       <DownloadIcon className="h-5 w-5 mr-2" />
                       Export CSV
                    </button>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center">
                    <h3 className="text-lg font-medium text-gray-900">RFM Segmentation Results</h3>
                    <p className="mt-1 text-sm text-gray-500">{rfmData.length} customers segmented.</p>
                    <button 
                        onClick={() => exportToCsv(rfmData, 'rfm_analysis.csv')}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                       <DownloadIcon className="h-5 w-5 mr-2" />
                       Export CSV
                    </button>
                </div>

                 <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center">
                    <h3 className="text-lg font-medium text-gray-900">CLTV Predictions by Segment</h3>
                    <p className="mt-1 text-sm text-gray-500">{cltvData.length} segments analyzed.</p>
                    <button 
                        onClick={() => exportToCsv(cltvData, 'cltv_analysis.csv')}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                       <DownloadIcon className="h-5 w-5 mr-2" />
                       Export CSV
                    </button>
                </div>
            </div>

            <div className="mt-12 text-center">
                <button
                    onClick={resetState}
                    className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                    Start New Analysis
                </button>
            </div>
        </Card>
    );
};

export default SummaryStep;