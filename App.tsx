import React, { useState } from 'react';
import { Transaction, RFMData, CLTVData, ColumnMapping, MBAData } from './types';
import UploadStep from './components/UploadStep';
import CleaningStep from './components/CleaningStep';
import EDAStep from './components/EDAStep';
import MBAStep from './components/MBAStep';
import RFMStep from './components/RFMStep';
import CLTVStep from './components/CLTVStep';
import SummaryStep from './components/SummaryStep';
import StepIndicator from './components/common/StepIndicator';

const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
    const [cleanedTransactions, setCleanedTransactions] = useState<Transaction[]>([]);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
    const [mbaData, setMbaData] = useState<MBAData | null>(null);
    const [rfmData, setRfmData] = useState<RFMData[]>([]);
    const [cltvData, setCltvData] = useState<CLTVData[]>([]);

    const totalSteps = 7;

    const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const goToPrevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    
    const navigateToStep = (step: number) => {
        // Allow navigation only to steps that have been visited (currentStep is the high-water mark)
        if (step <= currentStep) {
            setCurrentStep(step);
        }
    };

    const resetState = () => {
        setCurrentStep(1);
        setRawTransactions([]);
        setCleanedTransactions([]);
        setColumnMapping(null);
        setMbaData(null);
        setRfmData([]);
        setCltvData([]);
    };
    
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <UploadStep setRawTransactions={setRawTransactions} goToNextStep={goToNextStep} />;
            case 2:
                return <CleaningStep rawTransactions={rawTransactions} setCleanedTransactions={setCleanedTransactions} columnMapping={columnMapping} setColumnMapping={setColumnMapping} goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} />;
            case 3:
                return <EDAStep cleanedTransactions={cleanedTransactions} goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} />;
            case 4:
                return <MBAStep cleanedTransactions={cleanedTransactions} columnMapping={columnMapping} setMbaData={setMbaData} goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} />;
            case 5:
                return <RFMStep cleanedTransactions={cleanedTransactions} setRfmData={setRfmData} goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} />;
            case 6:
                return <CLTVStep rfmData={rfmData} setCltvData={setCltvData} goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} />;
            case 7:
                return <SummaryStep cleanedTransactions={cleanedTransactions} rfmData={rfmData} cltvData={cltvData} mbaData={mbaData} resetState={resetState} />;
            default:
                return <UploadStep setRawTransactions={setRawTransactions} goToNextStep={goToNextStep} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">AI-Powered CLTV & RFM Analysis Dashboard</h1>
                    <p className="text-gray-500 mt-1">Transform your customer data into actionable business strategies.</p>
                </div>
            </header>
            
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <StepIndicator currentStep={currentStep} totalSteps={totalSteps} navigateToStep={navigateToStep} />
                <div className="mt-8">
                    {renderStep()}
                </div>
            </main>

            <footer className="text-center py-4 mt-8 text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Advanced Analytics Inc. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default App;