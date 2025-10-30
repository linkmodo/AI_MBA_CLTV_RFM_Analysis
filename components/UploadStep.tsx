import React, { useState, useCallback } from 'react';
import { Transaction } from '../types';
import { parseAndValidateCSV, parseAndValidateCSVFromText, fixEmptyHeadersInCsvText } from '../utils/dataProcessing';
import { UploadIcon } from './icons/UploadIcon';
import Card from './common/Card';

interface UploadStepProps {
    setRawTransactions: (transactions: Transaction[]) => void;
    goToNextStep: () => void;
}

const ROW_LIMIT = 100000;
const FILE_SIZE_WARNING_BYTES = 20 * 1024 * 1024; // 20MB

const UploadStep: React.FC<UploadStepProps> = ({ setRawTransactions, goToNextStep }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [hasEmptyHeaderError, setHasEmptyHeaderError] = useState(false);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const resetStateBeforeUpload = () => {
        setErrors([]);
        setUploadSuccess(false);
        setHasEmptyHeaderError(false);
        setRawTransactions([]);
        setOriginalFile(null);
        setIsTruncated(false);
        setRowCount(0);
    };

    const processFile = async (file: File) => {
        setIsLoading(true);
        resetStateBeforeUpload();
        setFileName(file.name);

        try {
            const result = await parseAndValidateCSV(file, ROW_LIMIT);
            
            setHasEmptyHeaderError(result.hasEmptyHeaders || false);
            if(result.hasEmptyHeaders) {
                setOriginalFile(file);
            }

            if (result.errors.length > 0) {
                setErrors(result.errors);
                setUploadSuccess(false);
            } else if (result.data.length === 0) {
                setErrors(["The CSV file is empty or could not be parsed. Please check the file format."]);
                setUploadSuccess(false);
            } else {
                setRawTransactions(result.data);
                setUploadSuccess(true);
                setErrors([]);
                if (result.truncated) {
                    setIsTruncated(true);
                    setRowCount(result.rowCount || 0);
                }
            }
        } catch (err) {
            setErrors(["An unexpected error occurred while parsing the file. Please ensure it is a valid CSV."]);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    }, [setRawTransactions]);

    const handleFixHeaders = async () => {
        if (!originalFile) return;

        setIsLoading(true);
        resetStateBeforeUpload();
        
        try {
            const text = await originalFile.text();
            const fixedCsvText = fixEmptyHeadersInCsvText(text);
            const result = parseAndValidateCSVFromText(fixedCsvText);

            setFileName(prev => prev ? `${prev.replace(' (fixed)', '')} (fixed)` : 'fixed file');

            if (result.errors.length > 0) {
                setErrors(result.errors);
                setUploadSuccess(false);
            } else {
                 if (result.data.length > ROW_LIMIT) {
                    setRawTransactions(result.data.slice(0, ROW_LIMIT));
                    setIsTruncated(true);
                    setRowCount(ROW_LIMIT);
                } else {
                    setRawTransactions(result.data);
                    setRowCount(result.data.length);
                }
                setUploadSuccess(true);
                setErrors([]);
            }
        } catch (err) {
            setErrors(["An unexpected error occurred while trying to fix the headers."]);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        if (uploadSuccess && errors.length === 0) {
            goToNextStep();
        } else {
            setErrors(prev => prev.length > 0 ? prev : ["Please upload a valid CSV file before proceeding."]);
        }
    }

    const successMessage = isTruncated 
        ? `File "${fileName}" is large. The first ${rowCount.toLocaleString()} rows have been loaded for analysis.`
        : `File "${fileName}" loaded and validated successfully.`;

    return (
        <Card>
            <div className="text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h2 className="mt-2 text-lg font-medium text-gray-900">Upload Your Data</h2>
                <p className="mt-1 text-sm text-gray-500">Upload a CSV file containing your transactional data to begin the analysis.</p>
            </div>
            <div className="mt-6 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV files supported. Analysis is limited to the first {ROW_LIMIT.toLocaleString()} rows.</p>
                </div>
            </div>
            {isLoading && <p className="mt-4 text-center text-sm text-gray-500">Validating and parsing file...</p>}
            {uploadSuccess && !isLoading && <p className="mt-4 text-center text-sm font-medium text-green-600">{successMessage}</p>}
            {errors.length > 0 && !isLoading && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Found {errors.length} validation {errors.length > 1 ? 'errors' : 'error'} with your file:</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <ul role="list" className="list-disc space-y-1 pl-5">
                                    {errors.map((error, i) => <li key={i}>{error}</li>)}
                                </ul>
                            </div>
                             {hasEmptyHeaderError && (
                                <div className="mt-4">
                                    <button
                                        onClick={handleFixHeaders}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    >
                                        Fix Empty Headers & Re-Validate
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!uploadSuccess || errors.length > 0 || isLoading}
                    className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Clean Data & Proceed &rarr;
                </button>
            </div>
        </Card>
    );
};

export default UploadStep;