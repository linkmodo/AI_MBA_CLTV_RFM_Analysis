import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, RFMData } from '../types';
import { calculateRFM } from '../utils/dataProcessing';
import Card from './common/Card';
import Loader from './common/Loader';
import { getAiAnalysis } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import AIActions from './common/AIActions';

interface RFMStepProps {
    cleanedTransactions: Transaction[];
    setRfmData: (data: RFMData[]) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

const RFMStep: React.FC<RFMStepProps> = ({ cleanedTransactions, setRfmData, goToNextStep, goToPrevStep }) => {
    const [aiRecommendations, setAiRecommendations] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const rfmResults = useMemo(() => {
        if (cleanedTransactions.length === 0) return [];
        return calculateRFM(cleanedTransactions);
    }, [cleanedTransactions]);

    useEffect(() => {
        if(rfmResults.length > 0) {
            setRfmData(rfmResults);
        }
    }, [rfmResults, setRfmData]);

    const segmentDistribution = useMemo(() => {
        const distribution: { [key: string]: number } = {};
        rfmResults.forEach(r => {
            distribution[r.Segment] = (distribution[r.Segment] || 0) + 1;
        });
        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [rfmResults]);

    const recencyDistribution = useMemo(() => {
        if (!rfmResults) return [];
        const distribution = Array(5).fill(0).map((_, i) => ({ name: `Score ${i + 1}`, Customers: 0 }));
        rfmResults.forEach(r => {
            if (r.R_Score >= 1 && r.R_Score <= 5) {
                 distribution[r.R_Score - 1].Customers++;
            }
        });
        return distribution;
    }, [rfmResults]);

    const frequencyDistribution = useMemo(() => {
         if (!rfmResults) return [];
        const distribution = Array(5).fill(0).map((_, i) => ({ name: `Score ${i + 1}`, Customers: 0 }));
        rfmResults.forEach(r => {
            if (r.F_Score >= 1 && r.F_Score <= 5) {
                distribution[r.F_Score - 1].Customers++;
            }
        });
        return distribution;
    }, [rfmResults]);

    const monetaryDistribution = useMemo(() => {
        if (!rfmResults) return [];
        const distribution = Array(5).fill(0).map((_, i) => ({ name: `Score ${i + 1}`, Customers: 0 }));
        rfmResults.forEach(r => {
            if (r.M_Score >= 1 && r.M_Score <= 5) {
                distribution[r.M_Score - 1].Customers++;
            }
        });
        return distribution;
    }, [rfmResults]);

    // RFM Distribution Histograms (actual values, not scores)
    const recencyHistogram = useMemo(() => {
        const recencyValues = rfmResults.map(r => r.Recency);
        if (recencyValues.length === 0) return { data: [], median: 0 };
        
        const min = Math.min(...recencyValues);
        const max = Math.max(...recencyValues);
        const binCount = 50;
        const binSize = (max - min) / binCount;
        
        const bins = Array.from({ length: binCount }, (_, i) => ({
            range: min + i * binSize,
            count: 0
        }));
        
        recencyValues.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex].count++;
            }
        });
        
        const sorted = [...recencyValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return { data: bins, median };
    }, [rfmResults]);

    const frequencyHistogram = useMemo(() => {
        const frequencyValues = rfmResults.map(r => r.Frequency);
        if (frequencyValues.length === 0) return { data: [], median: 0 };
        
        const min = Math.min(...frequencyValues);
        const max = Math.max(...frequencyValues);
        const binCount = 50;
        const binSize = (max - min) / binCount;
        
        const bins = Array.from({ length: binCount }, (_, i) => ({
            range: min + i * binSize,
            count: 0
        }));
        
        frequencyValues.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex].count++;
            }
        });
        
        const sorted = [...frequencyValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return { data: bins, median };
    }, [rfmResults]);

    const monetaryHistogram = useMemo(() => {
        const monetaryValues = rfmResults.map(r => r.Monetary);
        if (monetaryValues.length === 0) return { data: [], median: 0 };
        
        // Use log10 scale for monetary
        const logValues = monetaryValues.map(v => Math.log10(v));
        const min = Math.min(...logValues);
        const max = Math.max(...logValues);
        const binCount = 50;
        const binSize = (max - min) / binCount;
        
        const bins = Array.from({ length: binCount }, (_, i) => ({
            range: min + i * binSize,
            count: 0
        }));
        
        logValues.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex].count++;
            }
        });
        
        const sorted = [...monetaryValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return { data: bins, median };
    }, [rfmResults]);

    // Segment Analysis
    const segmentAnalysis = useMemo(() => {
        const segments: { [key: string]: { recency: number[], frequency: number[], monetary: number[], count: number } } = {};
        
        rfmResults.forEach(r => {
            if (!segments[r.Segment]) {
                segments[r.Segment] = { recency: [], frequency: [], monetary: [], count: 0 };
            }
            segments[r.Segment].recency.push(r.Recency);
            segments[r.Segment].frequency.push(r.Frequency);
            segments[r.Segment].monetary.push(r.Monetary);
            segments[r.Segment].count++;
        });
        
        const summary = Object.entries(segments).map(([segment, data]) => ({
            segment,
            avgRecency: data.recency.reduce((a, b) => a + b, 0) / data.count,
            avgFrequency: data.frequency.reduce((a, b) => a + b, 0) / data.count,
            avgMonetary: data.monetary.reduce((a, b) => a + b, 0) / data.count,
            totalRevenue: data.monetary.reduce((a, b) => a + b, 0),
            count: data.count
        })).sort((a, b) => b.avgMonetary - a.avgMonetary);
        
        return summary;
    }, [rfmResults]);

    // Normalized metrics for heatmap
    const normalizedMetrics = useMemo(() => {
        if (segmentAnalysis.length === 0) return [];
        
        const recencyValues = segmentAnalysis.map(s => s.avgRecency);
        const frequencyValues = segmentAnalysis.map(s => s.avgFrequency);
        const monetaryValues = segmentAnalysis.map(s => s.avgMonetary);
        
        const minR = Math.min(...recencyValues);
        const maxR = Math.max(...recencyValues);
        const minF = Math.min(...frequencyValues);
        const maxF = Math.max(...frequencyValues);
        const minM = Math.min(...monetaryValues);
        const maxM = Math.max(...monetaryValues);
        
        return segmentAnalysis.map(s => ({
            segment: s.segment,
            recency: maxR > minR ? (s.avgRecency - minR) / (maxR - minR) : 0,
            frequency: maxF > minF ? (s.avgFrequency - minF) / (maxF - minF) : 0,
            monetary: maxM > minM ? (s.avgMonetary - minM) / (maxM - minM) : 0
        }));
    }, [segmentAnalysis]);

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        setAiRecommendations('');
        const distributionString = segmentDistribution.map(s => `${s.name}: ${s.value} customers`).join(', ');
        const prompt = `Here is the RFM segmentation of our customer base: ${distributionString}. For each of the top 5 segments, provide actionable marketing recommendations in a bulleted list to engage them effectively.`;
        
        try {
            const result = await getAiAnalysis(prompt);
            setAiRecommendations(result);
        } catch (err) {
            setAiRecommendations('Failed to get AI recommendations. Please try again.');
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    if (rfmResults.length === 0) {
         return (
            <Card>
                <p>Could not perform RFM Analysis. Please ensure your data is properly cleaned.</p>
                <button onClick={goToPrevStep} className="mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
            </Card>
        );
    }

    const segmentColors = ['#FF7043', '#00BFA5', '#FFC107', '#42A5F5', '#AB47BC', '#66BB6A', '#FFA726', '#EC407A'];

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: RFM Analysis & Segmentation</h2>
            
            {/* RFM Distribution Metrics - 2x2 Grid */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">RFM Analysis: Distribution of Key Metrics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recency Distribution */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Recency Distribution (Days Since Last Purchase)</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={recencyHistogram.data} margin={{ top: 30, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="range" 
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => `${Math.round(value)}`}
                                        label={{ value: 'Days', position: 'bottom', style: { fontSize: 12 } }}
                                    />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip 
                                        formatter={(value: number) => [`${value} customers`, 'Count']}
                                        labelFormatter={(value) => `Days: ${Math.round(Number(value))}`}
                                    />
                                    <Bar dataKey="count" fill="#FF7043" opacity={0.7} />
                                    <ReferenceLine 
                                        x={recencyHistogram.median} 
                                        stroke="red" 
                                        strokeDasharray="3 3" 
                                        label={{ value: `Median: ${Math.round(recencyHistogram.median)} days`, position: 'top', fill: 'red', fontSize: 10 }} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Frequency Distribution */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Frequency Distribution (Number of Purchases)</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={frequencyHistogram.data} margin={{ top: 30, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="range" 
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => `${Math.round(value)}`}
                                        label={{ value: 'Number of Transactions', position: 'bottom', style: { fontSize: 12 } }}
                                    />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip 
                                        formatter={(value: number) => [`${value} customers`, 'Count']}
                                        labelFormatter={(value) => `Transactions: ${Math.round(Number(value))}`}
                                    />
                                    <Bar dataKey="count" fill="#00BFA5" opacity={0.7} />
                                    <ReferenceLine 
                                        x={frequencyHistogram.median} 
                                        stroke="red" 
                                        strokeDasharray="3 3" 
                                        label={{ value: `Median: ${Math.round(frequencyHistogram.median)} purchases`, position: 'top', fill: 'red', fontSize: 10 }} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monetary Distribution (Log Scale) */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Monetary Distribution (Log Scale)</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={monetaryHistogram.data} margin={{ top: 30, right: 20, left: 60, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="range" 
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => `10^${value.toFixed(1)}`}
                                        label={{ value: 'Log10(Total Spend)', position: 'bottom', style: { fontSize: 12 } }}
                                    />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip 
                                        formatter={(value: number) => [`${value} customers`, 'Count']}
                                        labelFormatter={(value) => `Log10: ${Number(value).toFixed(2)}`}
                                    />
                                    <Bar dataKey="count" fill="#FFC107" opacity={0.7} />
                                    <ReferenceLine 
                                        x={Math.log10(monetaryHistogram.median)} 
                                        stroke="red" 
                                        strokeDasharray="3 3" 
                                        label={{ value: `Median: $${monetaryHistogram.median.toFixed(2)}`, position: 'top', fill: 'red', fontSize: 10 }} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Customer Segments Distribution */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Customer Segments Distribution</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={segmentDistribution} layout="horizontal" margin={{ top: 20, right: 20, left: 60, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={80}
                                        tick={{ fontSize: 10 }}
                                        label={{ value: 'Segment', position: 'bottom', offset: 40, style: { fontSize: 12 } }}
                                    />
                                    <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip />
                                    <Bar dataKey="value">
                                        {segmentDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={segmentColors[index % segmentColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Segment Analysis Section */}
            <div className="mb-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Segment Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Normalized Metrics Heatmap (using stacked bars as approximation) */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">RFM Metrics by Customer Segment (Normalized)</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">Segment</th>
                                        <th className="text-center p-2 font-semibold">Recency</th>
                                        <th className="text-center p-2 font-semibold">Frequency</th>
                                        <th className="text-center p-2 font-semibold">Monetary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {normalizedMetrics.map((metric, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2 font-medium">{metric.segment}</td>
                                            <td className="p-2">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-full bg-gray-200 rounded h-6 relative">
                                                        <div 
                                                            className="h-6 rounded transition-all"
                                                            style={{ 
                                                                width: `${metric.recency * 100}%`,
                                                                backgroundColor: `rgb(${255 - metric.recency * 100}, ${255 * metric.recency}, ${100})`
                                                            }}
                                                        >
                                                            <span className="text-xs font-semibold text-white pl-1">{metric.recency.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-full bg-gray-200 rounded h-6 relative">
                                                        <div 
                                                            className="h-6 rounded transition-all"
                                                            style={{ 
                                                                width: `${metric.frequency * 100}%`,
                                                                backgroundColor: `rgb(${255 - metric.frequency * 100}, ${255 * metric.frequency}, ${100})`
                                                            }}
                                                        >
                                                            <span className="text-xs font-semibold text-white pl-1">{metric.frequency.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-full bg-gray-200 rounded h-6 relative">
                                                        <div 
                                                            className="h-6 rounded transition-all"
                                                            style={{ 
                                                                width: `${metric.monetary * 100}%`,
                                                                backgroundColor: `rgb(${255 - metric.monetary * 100}, ${255 * metric.monetary}, ${100})`
                                                            }}
                                                        >
                                                            <span className="text-xs font-semibold text-white pl-1">{metric.monetary.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Total Revenue by Segment */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-800 mb-3">Total Revenue by Customer Segment</h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={segmentAnalysis} margin={{ top: 20, right: 20, left: 60, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="segment" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={80}
                                        tick={{ fontSize: 10 }}
                                        label={{ value: 'Customer Segment', position: 'bottom', offset: 40, style: { fontSize: 12 } }}
                                    />
                                    <YAxis 
                                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                                        label={{ value: 'Total Revenue ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                    />
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Bar dataKey="totalRevenue">
                                        {segmentAnalysis.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={segmentColors[index % segmentColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Segment Summary Table */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Segment Analysis Summary</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Recency</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Frequency</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Monetary</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {segmentAnalysis.map((seg, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{seg.segment}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{seg.avgRecency.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{seg.avgFrequency.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">${seg.avgMonetary.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{seg.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-800">AI-Powered Marketing Recommendations</h3>
                        {aiRecommendations && !isAiLoading && <AIActions text={aiRecommendations} filename="rfm_recommendations" />}
                    </div>
                     <button onClick={handleAiAnalysis} disabled={isAiLoading} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        {isAiLoading ? 'Analyzing...' : 'Get AI Recommendations'}
                    </button>
                    <div className="mt-4 p-4 bg-gray-50 rounded-md h-64 overflow-y-auto border">
                        {isAiLoading && <Loader text="AI is crafting marketing strategies..." />}
                        {aiRecommendations ? (
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiRecommendations.replace(/\n/g, '<br />') }} />
                        ) : (
                            <p className="text-sm text-gray-500">Click the button to get AI-powered marketing recommendations for your customer segments.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">RFM Score Distributions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h4 className="font-medium text-gray-800 text-center mb-2">Recency Score</h4>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={recencyDistribution} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="Customers" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <div>
                        <h4 className="font-medium text-gray-800 text-center mb-2">Frequency Score</h4>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={frequencyDistribution} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="Customers" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <div>
                        <h4 className="font-medium text-gray-800 text-center mb-2">Monetary Score</h4>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={monetaryDistribution} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="Customers" fill="#ffc658" />
                                 </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

             <h3 className="font-medium text-gray-800 mt-8 mb-2">RFM Data Sample</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {Object.keys(rfmResults[0]).map(key => 
                                <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rfmResults.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                                {Object.values(row).map((val, i) => <td key={i} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{val}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex justify-between">
                <button onClick={goToPrevStep} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
                <button onClick={goToNextStep} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    Predict CLTV &rarr;
                </button>
            </div>
        </Card>
    );
};

export default RFMStep;