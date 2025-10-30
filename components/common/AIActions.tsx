import React, { useState } from 'react';
import { CopyIcon } from '../icons/CopyIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface AIActionsProps {
    text: string;
    filename: string;
}

const AIActions: React.FC<AIActionsProps> = ({ text, filename }) => {
    const [copyStatus, setCopyStatus] = useState('Copy');

    const handleCopy = () => {
        if (!navigator.clipboard) {
            setCopyStatus('Failed');
            setTimeout(() => setCopyStatus('Copy'), 2000);
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        }, () => {
            setCopyStatus('Failed');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        });
    };

    const handleExport = () => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={handleCopy}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="Copy to clipboard"
            >
                <CopyIcon className="h-4 w-4 mr-2" />
                {copyStatus}
            </button>
            <button
                onClick={handleExport}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="Export as .txt file"
            >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
            </button>
        </div>
    );
};

export default AIActions;
