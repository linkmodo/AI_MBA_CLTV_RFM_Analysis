
import React, { useState, useMemo, useEffect } from 'react';
import { RFMData, CLTVData, CustomerCLTVDetail } from '../types';
import { calculateCLTV } from '../utils/dataProcessing';
import Card from './common/Card';
import Loader from './common/Loader';
import { getAiAnalysis } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, LineChart, Line, Cell, ReferenceLine } from 'recharts';
import AIActions from './common/AIActions';

interface CLTVStepProps {
    rfmData: RFMData[];
    setCltvData: (data: CLTVData[]) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

const CLTVStep: React.FC<CLTVStepProps> = ({ rfmData, setCltvData, goToNextStep, goToPrevStep }) => {
    const [profitMargin, setProfitMargin] = useState(25); // Default 25%
    const [discountRate, setDiscountRate] = useState(10); // Default 10%
    const [isChurnOverridden, setIsChurnOverridden] = useState(false);
    const [churnRateOverrideValue, setChurnRateOverrideValue] = useState(50); // Default 50%
    const [aiStrategies, setAiStrategies] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const baseChurnRate = useMemo(() => {
        if (rfmData.length === 0) return 0;
        const repeatCustomers = rfmData.filter(r => r.Frequency > 1).length;
        const retentionRate = repeatCustomers / rfmData.length;
        return 1 - retentionRate;
    }, [rfmData]);

    const cltvResults = useMemo(() => {
        if (rfmData.length === 0) return { segmentData: [], customerDetails: [] };
        const churnOverride = isChurnOverridden ? churnRateOverrideValue / 100 : null;
        return calculateCLTV(rfmData, profitMargin / 100, discountRate / 100, churnOverride);
    }, [rfmData, profitMargin, discountRate, isChurnOverridden, churnRateOverrideValue]);

    useEffect(() => {
        if (cltvResults.segmentData.length > 0) {
            setCltvData(cltvResults.segmentData);
        }
    }, [cltvResults, setCltvData]);
    
    const summaryMetrics = useMemo(() => {
        const totalProjectedValue = cltvResults.segmentData.reduce((acc, segment) => acc + (segment.AvgCLTV * segment.CustomerCount), 0);
        const effectiveChurnRate = isChurnOverridden ? churnRateOverrideValue / 100 : baseChurnRate;
        const avgLifetime = effectiveChurnRate > 0 ? 1 / effectiveChurnRate : Infinity;
        
        return {
            totalProjectedValue,
            avgLifetime,
            effectiveChurnRate,
        };
    }, [cltvResults, baseChurnRate, isChurnOverridden, churnRateOverrideValue]);

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        setAiStrategies('');
        const cltvString = cltvResults.segmentData.slice(0, 5).map(c => `${c.Segment}: Avg CLTV $${c.AvgCLTV.toFixed(2)}`).join(', ');
        const usedChurnRate = isChurnOverridden ? churnRateOverrideValue : (baseChurnRate * 100);

        const prompt = `Our CLTV model uses the following parameters:
- **Profit Margin:** ${profitMargin}%
- **Annual Discount Rate:** ${discountRate}%
- **Effective Churn Rate:** ${usedChurnRate.toFixed(2)}%

The resulting average CLTV for each key customer segment is: ${cltvString}.

Provide actionable, strategic advice to maximize the total customer lifetime value across our entire customer base. Structure your response with a separate bulleted list for each of the following objectives:
1.  **Retention Strategies:** What specific actions can we take to reduce churn, especially for "At Risk" and "Customers Needing Attention" segments?
2.  **Growth Strategies:** How can we increase the purchase frequency and average order value for high-potential segments like "Potential Loyalists" and "Loyal Customers"?
3.  **VIP Strategies:** What premium services, loyalty programs, or exclusive offers can we use to maximize value from our "Champions" and ensure they remain advocates?`;

        try {
            const result = await getAiAnalysis(prompt);
            setAiStrategies(result);
        } catch (err) {
            setAiStrategies('Failed to get AI strategies. Please try again.');
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Prepare data for CLTV Distribution histogram
    const histogramData = useMemo(() => {
        const cltvValues = cltvResults.customerDetails.map(c => c.CLTV);
        if (cltvValues.length === 0) return [];
        
        const min = Math.min(...cltvValues);
        const max = Math.max(...cltvValues);
        const binCount = 50;
        const binSize = (max - min) / binCount;
        
        const bins = Array.from({ length: binCount }, (_, i) => ({
            range: min + i * binSize,
            count: 0,
            rangeLabel: `$${(min + i * binSize).toFixed(0)}`
        }));
        
        cltvValues.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex].count++;
            }
        });
        
        return bins;
    }, [cltvResults.customerDetails]);

    const cltvStats = useMemo(() => {
        const cltvValues = cltvResults.customerDetails.map(c => c.CLTV);
        if (cltvValues.length === 0) return { mean: 0, median: 0 };
        
        const mean = cltvValues.reduce((a, b) => a + b, 0) / cltvValues.length;
        const sorted = [...cltvValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return { mean, median };
    }, [cltvResults.customerDetails]);

    // Prepare data for Customer Value Segments (quartiles)
    const quartileData = useMemo(() => {
        const cltvValues = cltvResults.customerDetails.map(c => c.CLTV);
        if (cltvValues.length === 0) return [];
        
        const sorted = [...cltvValues].sort((a, b) => a - b);
        const q1Index = Math.floor(sorted.length * 0.25);
        const q2Index = Math.floor(sorted.length * 0.5);
        const q3Index = Math.floor(sorted.length * 0.75);
        
        const q1 = sorted[q1Index];
        const q2 = sorted[q2Index];
        const q3 = sorted[q3Index];
        
        const segments = {
            'Low Value': 0,
            'Medium Value': 0,
            'High Value': 0,
            'Top Value': 0
        };
        
        cltvValues.forEach(value => {
            if (value <= q1) segments['Low Value']++;
            else if (value <= q2) segments['Medium Value']++;
            else if (value <= q3) segments['High Value']++;
            else segments['Top Value']++;
        });
        
        return [
            { segment: 'Low Value', count: segments['Low Value'], color: '#FFC107' },
            { segment: 'Medium Value', count: segments['Medium Value'], color: '#FF7043' },
            { segment: 'High Value', count: segments['High Value'], color: '#42A5F5' },
            { segment: 'Top Value', count: segments['Top Value'], color: '#00BFA5' }
        ];
    }, [cltvResults.customerDetails]);

    // Prepare data for Cumulative CLTV (Pareto Chart)
    const paretoData = useMemo(() => {
        const sorted = [...cltvResults.customerDetails].sort((a, b) => b.CLTV - a.CLTV);
        if (sorted.length === 0) return [];
        
        const totalCLTV = sorted.reduce((acc, c) => acc + c.CLTV, 0);
        let cumulativeCLTV = 0;
        
        return sorted.map((customer, index) => {
            cumulativeCLTV += customer.CLTV;
            return {
                customerPercent: ((index + 1) / sorted.length) * 100,
                cumulativePercent: (cumulativeCLTV / totalCLTV) * 100
            };
        });
    }, [cltvResults.customerDetails]);
    
    if (rfmData.length === 0) {
        return (
            <Card>
                <p>Could not calculate CLTV. Please go back to the RFM step.</p>
                 <button onClick={goToPrevStep} className="mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
            </Card>
        );
    }
    
    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 5: Customer Lifetime Value (CLTV) Prediction</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg border mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">CLTV Model Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="profit-margin" className="block text-sm font-medium text-gray-700">Profit Margin (%)</label>
                        <p className="text-xs text-gray-500 mb-1">Your average profit on each sale.</p>
                        <input
                            type="number"
                            id="profit-margin"
                            value={profitMargin}
                            onChange={(e) => setProfitMargin(Number(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                        />
                    </div>
                    <div>
                        <label htmlFor="discount-rate" className="block text-sm font-medium text-gray-700">Annual Discount Rate (%)</label>
                        <p className="text-xs text-gray-500 mb-1">Accounts for the time value of money.</p>
                        <input
                            type="number"
                            id="discount-rate"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(Number(e.target.value))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                        />
                    </div>
                    <div>
                        <label htmlFor="churn-override" className="block text-sm font-medium text-gray-700">Churn Rate Override</label>
                        <p className="text-xs text-gray-500 mb-1">Calculated churn is {(baseChurnRate * 100).toFixed(2)}%.</p>
                        <div className="flex items-center mt-2">
                            <input id="churn-override-toggle" type="checkbox" checked={isChurnOverridden} onChange={e => setIsChurnOverridden(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                            <label htmlFor="churn-override-toggle" className="ml-2 text-sm text-gray-600">Enable Override</label>
                        </div>
                        {isChurnOverridden && (
                            <input
                                type="number"
                                id="churn-override"
                                value={churnRateOverrideValue}
                                onChange={(e) => setChurnRateOverrideValue(Number(e.target.value))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                                placeholder="Enter %"
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Projected Total CLTV</p>
                    <p className="text-2xl font-bold text-gray-900">${summaryMetrics.totalProjectedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Avg. Customer Lifetime</p>
                    <p className="text-2xl font-bold text-gray-900">{isFinite(summaryMetrics.avgLifetime) ? `${summaryMetrics.avgLifetime.toFixed(2)} periods` : 'Infinite'}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Effective Churn Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{(summaryMetrics.effectiveChurnRate * 100).toFixed(2)}%</p>
                </div>
            </div>

            {/* CLTV Analysis Charts - 2x2 Grid */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Lifetime Value (CLTV) Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 1: CLTV Distribution */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">CLTV Distribution</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={histogramData} margin={{ top: 30, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="range" 
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip 
                                        formatter={(value: number) => [`${value} customers`, 'Count']}
                                        labelFormatter={(value) => `CLTV: $${Number(value).toFixed(2)}`}
                                    />
                                    <Bar dataKey="count" fill="#00BFA5" opacity={0.7} />
                                    <ReferenceLine x={cltvStats.mean} stroke="red" strokeDasharray="3 3" label={{ value: `Mean: $${cltvStats.mean.toFixed(2)}`, position: 'top', fill: 'red', fontSize: 10 }} />
                                    <ReferenceLine x={cltvStats.median} stroke="blue" strokeDasharray="3 3" label={{ value: `Median: $${cltvStats.median.toFixed(2)}`, position: 'bottom', fill: 'blue', fontSize: 10 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Average Order Value vs Purchase Frequency */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Average Order Value vs Purchase Frequency</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <ScatterChart margin={{ top: 20, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="AvgOrderValue" 
                                        name="Avg Order Value" 
                                        label={{ value: 'Average Order Value ($)', position: 'bottom', style: { fontSize: 12 } }}
                                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                                    />
                                    <YAxis 
                                        dataKey="PurchaseFrequency" 
                                        name="Purchase Frequency"
                                        label={{ value: 'Purchase Frequency', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                    />
                                    <ZAxis dataKey="CLTV" range={[50, 400]} name="CLTV" />
                                    <Tooltip 
                                        cursor={{ strokeDasharray: '3 3' }}
                                        formatter={(value: number, name: string) => {
                                            if (name === 'Avg Order Value') return `$${value.toFixed(2)}`;
                                            if (name === 'CLTV') return `$${value.toFixed(2)}`;
                                            return value.toFixed(2);
                                        }}
                                    />
                                    <Scatter data={cltvResults.customerDetails} fill="#FF7043" fillOpacity={0.6} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3: Customer Value Segments */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Customer Value Segments</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={quartileData} margin={{ top: 20, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="segment" label={{ value: 'CLTV Segment', position: 'bottom', style: { fontSize: 12 } }} />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip formatter={(value: number) => [`${value} customers`, 'Count']} />
                                    <Bar dataKey="count">
                                        {quartileData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 4: Cumulative CLTV Distribution (Pareto) */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Cumulative CLTV Distribution (Pareto)</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <LineChart data={paretoData} margin={{ top: 20, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="customerPercent" 
                                        label={{ value: 'Cumulative % of Customers', position: 'bottom', style: { fontSize: 12 } }}
                                        tickFormatter={(value) => `${value.toFixed(0)}%`}
                                    />
                                    <YAxis 
                                        label={{ value: 'Cumulative % of Total CLTV', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                        tickFormatter={(value) => `${value.toFixed(0)}%`}
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => `${value.toFixed(2)}%`}
                                        labelFormatter={(value) => `Customers: ${Number(value).toFixed(2)}%`}
                                    />
                                    <Line type="monotone" dataKey="cumulativePercent" stroke="#00BFA5" strokeWidth={2} dot={false} />
                                    <Line 
                                        type="monotone" 
                                        data={[{ customerPercent: 0, cumulativePercent: 0 }, { customerPercent: 100, cumulativePercent: 100 }]} 
                                        dataKey="cumulativePercent" 
                                        stroke="black" 
                                        strokeDasharray="5 5" 
                                        strokeWidth={1}
                                        dot={false}
                                        name="Perfect Equality"
                                    />
                                    <ReferenceLine x={20} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} />
                                    <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Strategies Section */}
            <div className="bg-white p-6 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">AI-Powered CLTV Growth Strategies</h3>
                    {aiStrategies && !isAiLoading && <AIActions text={aiStrategies} filename="cltv_strategies" />}
                </div>
                <button onClick={handleAiAnalysis} disabled={isAiLoading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {isAiLoading ? 'Analyzing...' : 'Get AI Strategies'}
                </button>
                <div className="mt-4 p-4 bg-gray-50 rounded-md min-h-64 overflow-y-auto border">
                    {isAiLoading && <Loader text="AI is developing growth strategies..." />}
                    {aiStrategies ? (
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiStrategies.replace(/\n/g, '<br />') }} />
                    ) : (
                        <p className="text-sm text-gray-500">Click the button to get AI-powered strategies to boost CLTV.</p>
                    )}
                </div>
            </div>

            <div className="mt-8 flex justify-between">
                <button onClick={goToPrevStep} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
                <button onClick={goToNextStep} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    View Summary & Export &rarr;
                </button>
            </div>
        </Card>
    );
};

export default CLTVStep;
