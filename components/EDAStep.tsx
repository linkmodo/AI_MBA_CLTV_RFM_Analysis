import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Card from './common/Card';
import Loader from './common/Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { getAiAnalysis } from '../services/geminiService';
import { ChartIcon } from './icons/ChartIcon';
import AIActions from './common/AIActions';

interface EDAStepProps {
    cleanedTransactions: Transaction[];
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

type ActiveChart = 'time' | 'customers' | 'month' | 'day';

const EDAStep: React.FC<EDAStepProps> = ({ cleanedTransactions, goToNextStep, goToPrevStep }) => {
    const [aiInsights, setAiInsights] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [activeChart, setActiveChart] = useState<ActiveChart>('time');

    const summaryStats = useMemo(() => {
        if (cleanedTransactions.length === 0) return null;
        const totalRevenue = cleanedTransactions.reduce((acc, t) => acc + (t.TotalPrice || 0), 0);
        const uniqueCustomers = new Set(cleanedTransactions.map(t => t.CustomerID)).size;
        const totalTransactions = cleanedTransactions.length;
        return {
            totalRevenue: totalRevenue.toFixed(2),
            uniqueCustomers,
            totalTransactions,
            avgOrderValue: (totalRevenue / totalTransactions).toFixed(2),
        };
    }, [cleanedTransactions]);

    const salesOverTime = useMemo(() => {
        const sales: { [key: string]: number } = {};
        cleanedTransactions.forEach(t => {
            const date = t.InvoiceDate.toISOString().split('T')[0];
            sales[date] = (sales[date] || 0) + t.TotalPrice;
        });
        return Object.entries(sales).map(([date, total]) => ({ date, total })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [cleanedTransactions]);
    
    const topCustomers = useMemo(() => {
        if (cleanedTransactions.length === 0) return [];
        const customerSpending: { [key: string]: number } = {};
        cleanedTransactions.forEach(t => {
            customerSpending[t.CustomerID] = (customerSpending[t.CustomerID] || 0) + t.TotalPrice;
        });
        return Object.entries(customerSpending)
            .map(([CustomerID, total]) => ({ CustomerID: `Cust #${CustomerID}`, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .reverse(); // For horizontal bar chart
    }, [cleanedTransactions]);

    const monthlySales = useMemo(() => {
        const sales: { [key: string]: number } = {};
        cleanedTransactions.forEach(t => {
            const month = t.InvoiceDate.toLocaleString('default', { month: 'short', year: 'numeric' });
            sales[month] = (sales[month] || 0) + t.TotalPrice;
        });
        const sortedMonths = Object.keys(sales).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        return sortedMonths.map(month => ({ month, total: sales[month] }));
    }, [cleanedTransactions]);
    
    const salesByDayOfWeek = useMemo(() => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const sales = Array(7).fill(0).map((_, i) => ({ day: dayNames[i], total: 0 }));
        cleanedTransactions.forEach(t => {
            const dayIndex = t.InvoiceDate.getDay();
            sales[dayIndex].total += t.TotalPrice;
        });
        return sales;
    }, [cleanedTransactions]);

    const handleAiAnalysis = async () => {
        setIsAiLoading(true);
        setAiInsights('');
        
        const topCustomersSummary = topCustomers.slice(-5).reverse().map(c => `${c.CustomerID} ($${c.total.toFixed(0)})`).join(', ');
        const monthlySalesSummary = monthlySales.slice(-6).map(m => `${m.month} ($${m.total.toFixed(0)})`).join(', ');

        const prompt = `Based on the following summary statistics and data trends from an e-commerce dataset:
        - **Overall Stats:** Total Revenue: $${summaryStats?.totalRevenue}, Unique Customers: ${summaryStats?.uniqueCustomers}, Total Transactions: ${summaryStats?.totalTransactions}, Average Order Value: $${summaryStats?.avgOrderValue}.
        - **Top Customers:** The top customers include: ${topCustomersSummary}.
        - **Sales Trends:** Sales over the last few months were: ${monthlySalesSummary}. We also have data on sales distribution by day of the week.
        
        Generate a concise exploratory data analysis report. In a bulleted list, highlight:
        1. Key business performance takeaways from the overall stats.
        2. Observations about customer value concentration (based on top customers).
        3. Insights from sales seasonality (monthly and daily patterns).
        4. Potential areas for business growth or improvement based on these findings.`;
        
        try {
            const result = await getAiAnalysis(prompt);
            setAiInsights(result);
        } catch (err) {
            setAiInsights('Failed to get AI insights. Please try again.');
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    if (!summaryStats) {
        return (
            <Card>
                <p>No data available for analysis. Please go back and clean the data.</p>
                <button onClick={goToPrevStep} className="mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
            </Card>
        );
    }

    const renderChart = () => {
        switch (activeChart) {
            case 'time':
                return (
                    <ResponsiveContainer>
                        <LineChart data={salesOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `$${(Number(value)/1000)}k`} />
                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} name="Total Sales" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'customers':
                return (
                    <ResponsiveContainer>
                        <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" tickFormatter={(value) => `$${(Number(value)/1000)}k`} />
                             <YAxis type="category" dataKey="CustomerID" tick={{fontSize: 12}} />
                             <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                             <Bar dataKey="total" fill="#4f46e5" name="Total Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'month':
                return (
                    <ResponsiveContainer>
                        <BarChart data={monthlySales}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `$${(Number(value)/1000)}k`} />
                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Bar dataKey="total" fill="#4338ca" name="Monthly Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'day':
                return (
                    <ResponsiveContainer>
                        <BarChart data={salesByDayOfWeek}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `$${(Number(value)/1000)}k`} />
                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Bar dataKey="total" fill="#312e81" name="Revenue by Day" />
                        </BarChart>
                    </ResponsiveContainer>
                )
            default:
                return null;
        }
    };
    
    const chartTabs: { id: ActiveChart, name: string }[] = [
        { id: 'time', name: 'Sales Over Time' },
        { id: 'customers', name: 'Top 10 Customers' },
        { id: 'month', name: 'Sales by Month' },
        { id: 'day', name: 'Sales by Day of Week' }
    ];

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Exploratory Data Analysis (EDA)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${summaryStats.totalRevenue}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Unique Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.uniqueCustomers}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.totalTransactions}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">${summaryStats.avgOrderValue}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div>
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                            {chartTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveChart(tab.id)}
                                    className={`${
                                        activeChart === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-4" style={{ width: '100%', height: 300 }}>
                        {renderChart()}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="font-medium text-gray-800">AI-Powered EDA Insights</h3>
                         {aiInsights && !isAiLoading && <AIActions text={aiInsights} filename="eda_insights" />}
                    </div>
                     <button onClick={handleAiAnalysis} disabled={isAiLoading} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        {isAiLoading ? 'Analyzing...' : 'Generate AI Insights'}
                    </button>
                    <div className="mt-4 p-4 bg-gray-50 rounded-md h-64 overflow-y-auto border">
                        {isAiLoading && <Loader text="AI is generating insights..." />}
                        {aiInsights ? (
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br />') }} />
                        ) : (
                            <p className="text-sm text-gray-500">Click the button to get AI-powered insights from your data.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-between">
                <button onClick={goToPrevStep} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    &larr; Back
                </button>
                <button onClick={goToNextStep} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    MBA Analysis &rarr;
                </button>
            </div>
        </Card>
    );
};

export default EDAStep;