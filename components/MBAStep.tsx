import React, { useState, useMemo } from 'react';
import { Transaction, MBAData, ColumnMapping, AssociationRule } from '../types';
import { calculateMBA } from '../utils/dataProcessing';
import { getAiAnalysis } from '../services/geminiService';
import Card from './common/Card';
import Loader from './common/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import AIActions from './common/AIActions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MBAStepProps {
    cleanedTransactions: Transaction[];
    columnMapping: ColumnMapping | null;
    setMbaData: (data: MBAData | null) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

type SortKey = keyof AssociationRule;

const MBAStep: React.FC<MBAStepProps> = ({ cleanedTransactions, columnMapping, setMbaData, goToNextStep, goToPrevStep }) => {
    const [minSupport, setMinSupport] = useState(1); // in percent
    const [minConfidence, setMinConfidence] = useState(20); // in percent
    const [minLift, setMinLift] = useState(1);
    const [results, setResults] = useState<MBAData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState('');
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'lift', direction: 'desc' });

    const handleRunAnalysis = () => {
        setIsLoading(true);
        setError('');
        setResults(null);
        setAiInsights('');
        try {
            // Using setTimeout to allow UI to update to loading state before blocking thread
            setTimeout(() => {
                const mbaResults = calculateMBA(cleanedTransactions, minSupport / 100, minConfidence / 100, minLift);
                if (mbaResults.rules.length === 0) {
                    setError('No association rules found with the current settings. Try lowering the Minimum Support or Confidence.');
                }
                setResults(mbaResults);
                setMbaData(mbaResults);
                setIsLoading(false);
            }, 50);
        } catch (err)
        {
            setError("An error occurred during Market Basket Analysis.");
            console.error(err);
            setIsLoading(false);
        }
    };

    const handleAiAnalysis = async () => {
        if (!results || results.rules.length === 0) return;
        setIsAiLoading(true);
        setAiInsights('');
        const topRules = results.rules.slice(0, 10).map(r => `IF a customer buys {${r.antecedent}}, THEN they are likely to buy {${r.consequent}} (Confidence: ${(r.confidence*100).toFixed(1)}%, Lift: ${r.lift.toFixed(2)})`).join('; ');

        const prompt = `Based on a Market Basket Analysis, here are the top product association rules:
        ${topRules}

        Provide actionable business strategies based on these findings. Structure your response into a bulleted list for each of the following areas:
        1.  **Product Bundling & Promotions:** Suggest specific product bundles that are likely to increase average order value.
        2.  **In-Store / Website Layout:** How can we use these insights to optimize product placement or website recommendations?
        3.  **Targeted Marketing:** Propose marketing campaigns (e.g., email, ads) that leverage these associations.`;
        
        try {
            const result = await getAiAnalysis(prompt);
            setAiInsights(result);
        } catch (err) {
            setAiInsights('Failed to get AI insights. Please try again.');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const sortedRules = useMemo(() => {
        if (!results) return [];
        return [...results.rules].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [results, sortConfig]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    if (cleanedTransactions.length === 0 || !columnMapping) {
         return (
            <Card>
                <p>No data available for analysis. Please complete previous steps.</p>
                <button onClick={goToPrevStep} className="mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
            </Card>
        );
    }
    
    const tableHeaders: { key: SortKey, label: string }[] = [
        { key: 'antecedent', label: 'Antecedent(s)' },
        { key: 'consequent', label: 'Consequent(s)' },
        { key: 'support', label: 'Support (%)' },
        { key: 'confidence', label: 'Confidence (%)' },
        { key: 'lift', label: 'Lift' },
    ];

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Market Basket Analysis (MBA)</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg border mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Analysis Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label htmlFor="min-support" className="block text-sm font-medium text-gray-700">Minimum Support ({minSupport.toFixed(2)}%)</label>
                        <p className="text-xs text-gray-500 mb-1">How frequently an item set appears in the data.</p>
                        <input
                            type="range" id="min-support" min="0.1" max="10" step="0.1"
                            value={minSupport} onChange={e => setMinSupport(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label htmlFor="min-confidence" className="block text-sm font-medium text-gray-700">Minimum Confidence ({minConfidence}%)</label>
                        <p className="text-xs text-gray-500 mb-1">Likelihood that a rule is true.</p>
                        <input
                            type="range" id="min-confidence" min="1" max="100" step="1"
                            value={minConfidence} onChange={e => setMinConfidence(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                     <div>
                        <label htmlFor="min-lift" className="block text-sm font-medium text-gray-700">Minimum Lift</label>
                        <p className="text-xs text-gray-500 mb-1">How much more likely items are purchased together.</p>
                        <input
                            type="number" id="min-lift" min="0" step="0.1"
                            value={minLift} onChange={e => setMinLift(parseFloat(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                        />
                    </div>
                </div>
                 <div className="text-center mt-6">
                    <button onClick={handleRunAnalysis} disabled={isLoading} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                        {isLoading ? 'Analyzing...' : 'Run Market Basket Analysis'}
                    </button>
                </div>
            </div>

            {isLoading && <Loader text="Performing analysis... this may take a moment." />}
            {error && <p className="text-center text-red-600 my-4">{error}</p>}

            {results && !isLoading && (
                 <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div>
                             <h3 className="font-medium text-gray-800 mb-2">Top 20 Most Frequent Items</h3>
                             <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <BarChart data={results.frequentItems.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={val => `${(val * 100).toFixed(1)}%`} />
                                        <YAxis type="category" dataKey="item" tick={{fontSize: 10}} width={100} />
                                        <Tooltip formatter={(val: number) => `${(val * 100).toFixed(2)}% support`} />
                                        <Bar dataKey="support" fill="#4f46e5" name="Support" />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-gray-800">AI-Powered Strategic Insights</h3>
                                {aiInsights && !isAiLoading && <AIActions text={aiInsights} filename="mba_insights" />}
                            </div>
                            <button onClick={handleAiAnalysis} disabled={isAiLoading || !results || results.rules.length === 0} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                                <SparklesIcon className="h-4 w-4 mr-2" />
                                {isAiLoading ? 'Analyzing...' : 'Get AI Strategies'}
                            </button>
                            <div className="mt-4 p-4 bg-gray-50 rounded-md h-72 overflow-y-auto border">
                                {isAiLoading && <Loader text="AI is generating strategies..." />}
                                {aiInsights ? (
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br />') }} />
                                ) : (
                                    <p className="text-sm text-gray-500">Click the button to get AI-powered strategies based on the discovered association rules.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Association Rules ({sortedRules.length} found)</h3>
                             <div className="flex items-center space-x-2">
                                <label htmlFor="sort-metric" className="text-sm font-medium text-gray-700">Sort by:</label>
                                <select
                                    id="sort-metric"
                                    value={sortConfig.key}
                                    onChange={(e) => handleSort(e.target.value as SortKey)}
                                    className="block pl-3 pr-8 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value="lift">Lift</option>
                                    <option value="confidence">Confidence</option>
                                    <option value="support">Support</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {tableHeaders.map(header => (
                                             <th key={header.key} onClick={() => handleSort(header.key)} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none">
                                                {header.label} {sortConfig.key === header.key ? (sortConfig.direction === 'desc' ? '▼' : '▲') : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedRules.slice(0, 100).map((rule, i) => ( // Show top 100
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{`{${rule.antecedent}}`}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{`{${rule.consequent}}`}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{(rule.support * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{(rule.confidence * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{rule.lift.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                         {sortedRules.length > 100 && <p className="text-center text-sm text-gray-500 mt-2">Showing top 100 rules of {sortedRules.length}.</p>}
                    </div>
                 </>
            )}

            <div className="mt-8 flex justify-between">
                <button onClick={goToPrevStep} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
                <div className="flex items-center space-x-4">
                     <button onClick={goToNextStep} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200">
                        Skip to RFM Analysis
                    </button>
                    <button onClick={goToNextStep} disabled={!results} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                        Perform RFM Analysis &rarr;
                    </button>
                </div>
            </div>
        </Card>
    );
}

export default MBAStep;