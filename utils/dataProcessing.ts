import { Transaction, ColumnMapping, RFMData, CLTVData, CustomerCLTVDetail, MBAData, AssociationRule, FrequentItem } from '../types';

export interface CSVValidationResult {
    data: Transaction[];
    errors: string[];
    hasEmptyHeaders?: boolean;
    truncated?: boolean;
    rowCount?: number;
}

/**
 * Parses a single row of a CSV string, handling quoted fields and escaped quotes.
 * Follows RFC 4180 standard.
 * @param row The string for a single CSV row.
 * @returns An array of strings representing the fields in the row.
 */
const parseCsvRow = (row: string): string[] => {
    const fields: string[] = [];
    let position = 0;
    
    while (position < row.length) {
        let value = '';
        
        // Trim leading whitespace for the next field
        while (row[position] === ' ' || row[position] === '\t') {
            position++;
        }

        // If the field starts with a quote
        if (row[position] === '"') {
            position++; // Move past the opening quote
            let inQuotes = true;
            while (inQuotes && position < row.length) {
                // If we find a quote
                if (row[position] === '"') {
                    // Check if it's an escaped quote ("")
                    if (position + 1 < row.length && row[position + 1] === '"') {
                        value += '"';
                        position += 2; // Skip both quotes
                    } else {
                        // It's a closing quote
                        inQuotes = false;
                        position++; // Move past the closing quote
                    }
                } else {
                    value += row[position];
                    position++;
                }
            }
        } else {
            // Unquoted field
            let nextComma = row.indexOf(',', position);
            if (nextComma === -1) {
                nextComma = row.length;
            }
            value = row.substring(position, nextComma).trim();
            position = nextComma;
        }
        fields.push(value);
        
        // Move past the comma, if it exists
        if (position < row.length && row[position] === ',') {
            position++;
        }
    }
    
    // Handle trailing comma (empty field at the end)
    if (row.trim().endsWith(',')) {
        fields.push('');
    }

    return fields;
};

/**
 * Parses a CSV file using streaming to handle large files efficiently.
 * @param file The File object to parse.
 * @param rowLimit The maximum number of data rows to parse.
 * @returns A promise that resolves to a CSVValidationResult.
 */
export const parseAndValidateCSV = async (file: File, rowLimit: number): Promise<CSVValidationResult> => {
    try {
        const stream = file.stream();
        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let headers: string[] = [];
        const data: Transaction[] = [];
        let rowCount = 0;
        let isHeaderProcessed = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r\n|\n|\r/);
            buffer = lines.pop() || ''; // Keep the last partial line in buffer

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (!isHeaderProcessed) {
                    headers = parseCsvRow(line);
                    // Header Validation
                    if (headers.length < 4) return { data: [], errors: [`File must contain at least 4 columns for analysis (found ${headers.length}).`] };
                    const headerSet = new Set<string>();
                    if (headers.some(h => h.trim() === '')) return { data: [], errors: ['CSV contains one or more empty column headers. You can attempt to fix this automatically.'], hasEmptyHeaders: true };
                    const duplicateHeaders = headers.filter(h => (headerSet.size === headerSet.add(h.trim()).size));
                    if(duplicateHeaders.length > 0) return { data: [], errors: [`Duplicate headers found: ${duplicateHeaders.join(', ')}. Please ensure all column headers are unique.`]}
                    isHeaderProcessed = true;
                } else {
                    const values = parseCsvRow(line);
                    if (values.length === headers.length) {
                        const obj: Transaction = {};
                        headers.forEach((header, index) => {
                            obj[header] = values[index] || '';
                        });
                        data.push(obj);
                        rowCount++;
                    } else if (rowCount < 10) { // Only check first few rows for consistency to avoid slowing down stream
                         return { data: [], errors: [`Found a row with an incorrect number of columns. Expected ${headers.length}, but found ${values.length}. This may indicate a file corruption or encoding issue.`]}
                    }
                    
                    if (rowCount >= rowLimit) {
                        await reader.cancel();
                        return { data, errors: [], truncated: true, rowCount };
                    }
                }
            }
        }
        
        // Process any remaining buffer content (the last line)
        if (buffer.trim() !== '' && isHeaderProcessed && rowCount < rowLimit) {
            const values = parseCsvRow(buffer);
            if (values.length === headers.length) {
                const obj: Transaction = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                data.push(obj);
            }
        }

        if (!isHeaderProcessed && data.length === 0) {
            return { data: [], errors: ["The CSV file is empty or could not be parsed."] };
        }

        return { data, errors: [], rowCount: data.length };
    } catch(e) {
        console.error("Streaming parser failed:", e);
        return { data: [], errors: ["A critical error occurred during file streaming. The file might be corrupted or in an unsupported format."] };
    }
};


/**
 * Parses a full CSV string from memory. Used as a fallback.
 * @param csvText The full CSV content as a string.
 * @returns A CSVValidationResult object.
 */
export const parseAndValidateCSVFromText = (csvText: string): CSVValidationResult => {
    const errors: string[] = [];
    
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        errors.push("The CSV file is empty or contains only a header row.");
        return { data: [], errors };
    }

    const headers = parseCsvRow(lines[0]);

    if (headers.length < 4) errors.push(`File must contain at least 4 columns for analysis (found ${headers.length}).`);

    const headerSet = new Set<string>();
    const duplicateHeaders: string[] = [];
    let hasEmptyHeader = false;
    headers.forEach(header => {
        const trimmedHeader = header.trim();
        if (trimmedHeader === '') hasEmptyHeader = true;
        if (headerSet.has(trimmedHeader)) {
            if (!duplicateHeaders.includes(trimmedHeader)) duplicateHeaders.push(trimmedHeader);
        } else {
            headerSet.add(trimmedHeader);
        }
    });
    if (hasEmptyHeader) errors.push('CSV contains one or more empty column headers. You can attempt to fix this automatically.');
    if (duplicateHeaders.length > 0) errors.push(`Duplicate headers found: ${duplicateHeaders.join(', ')}. Please ensure all column headers are unique.`);
    
    if (errors.length > 0) {
        // FIX: Corrected a typo. The variable is `hasEmptyHeader`, not `hasEmptyHeaders`.
        return { data: [], errors, hasEmptyHeaders: hasEmptyHeader };
    }

    const data: Transaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvRow(lines[i]);
        if (values.length === headers.length) {
            const obj: Transaction = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            data.push(obj);
        }
    }
    
    return { data, errors, hasEmptyHeaders: false, rowCount: data.length };
};


/**
 * Re-writes a CSV string, replacing any empty headers with a default name like "Column_X".
 * @param csvText The original CSV content as a string.
 * @returns A new CSV string with fixed headers.
 */
export const fixEmptyHeadersInCsvText = (csvText: string): string => {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length === 0) return csvText;

    const headerLine = lines[0];
    const headers = parseCsvRow(headerLine);
    
    const fixedHeaders = headers.map((header, index) => 
        (header || '').trim() === '' ? `Column_${index + 1}` : header
    );

    const newHeaderLine = fixedHeaders.map(field => {
        const value = String(field ?? '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }).join(',');

    lines[0] = newHeaderLine;

    return lines.join('\n');
};

/**
 * A more robust date parser to handle common non-ISO formats.
 * It tries to parse strings like 'MM/DD/YYYY HH:mm' which can cause issues with `new Date()`.
 * @param dateString The date string to parse.
 * @returns A Date object, or null if parsing fails.
 */
const parseDateString = (dateString: any): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;

    // 1. Try the native parser first (good for ISO 8601 formats)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // 2. Handle "MM/DD/YYYY HH:mm" or "M/D/YYYY H:m" which are common in CSVs
    //    and can be ambiguous for the native parser. This regex handles optional time parts.
    const commonFormatMatch = dateString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{1,2}))?)?/);
    if (commonFormatMatch) {
        const [, month, day, year, hour = '0', minute = '0', second = '0'] = commonFormatMatch;
        // To avoid timezone issues, we parse as UTC. Let's assume MM/DD/YYYY.
        date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
        if (!isNaN(date.getTime())) {
            // Basic validation to check if parsed date matches input parts, e.g., avoids month overflow.
            if (date.getUTCFullYear() == parseInt(year) && date.getUTCMonth() == (parseInt(month) - 1) && date.getUTCDate() == parseInt(day)) {
                return date;
            }
        }
    }
    
    return null; // Return null if all parsing attempts fail
}

export const cleanData = (
    transactions: Transaction[],
    mapping: ColumnMapping,
    options: {
        removeNullCustomerId: boolean;
        removeNegativeQuantity: boolean;
        removeDuplicateTransactions: boolean;
        handleMissingUnitPrice: boolean;
    }
): Transaction[] => {
    let cleaned = [...transactions];

    if (options.removeDuplicateTransactions) {
        const uniqueTransactionKeys = new Set<string>();
        cleaned = cleaned.filter(t => {
            const key = JSON.stringify(t);
            if (uniqueTransactionKeys.has(key)) {
                return false;
            }
            uniqueTransactionKeys.add(key);
            return true;
        });
    }

    if (options.removeNullCustomerId) {
        cleaned = cleaned.filter(t => t[mapping.customerId]);
    }

    if (options.removeNegativeQuantity) {
        cleaned = cleaned.filter(t => parseFloat(t[mapping.quantity]) > 0);
    }

    if (options.handleMissingUnitPrice) {
        cleaned = cleaned.filter(t => parseFloat(t[mapping.unitPrice]) > 0);
    }
    
    return cleaned.map(t => ({
        ...t,
        CustomerID: t[mapping.customerId],
        InvoiceID: t[mapping.invoiceId],
        Description: t[mapping.description],
        InvoiceDate: parseDateString(t[mapping.invoiceDate]),
        Quantity: parseFloat(t[mapping.quantity]),
        UnitPrice: parseFloat(t[mapping.unitPrice]),
        TotalPrice: parseFloat(t[mapping.quantity]) * parseFloat(t[mapping.unitPrice])
    })).filter((t): t is Transaction & { CustomerID: any; InvoiceID: any; Description: string; InvoiceDate: Date; Quantity: number; UnitPrice: number; TotalPrice: number; } => 
        t.InvoiceDate instanceof Date && !isNaN(t.InvoiceDate.getTime()) &&
        !isNaN(t.TotalPrice) && t.TotalPrice > 0 &&
        t.InvoiceID && t.Description
    );
};

const getQuintile = (value: number, sortedArr: number[]): number => {
    const q1 = sortedArr[Math.floor(sortedArr.length / 5)];
    const q2 = sortedArr[Math.floor(sortedArr.length * 2 / 5)];
    const q3 = sortedArr[Math.floor(sortedArr.length * 3 / 5)];
    const q4 = sortedArr[Math.floor(sortedArr.length * 4 / 5)];

    if (value <= q1) return 1;
    if (value <= q2) return 2;
    if (value <= q3) return 3;
    if (value <= q4) return 4;
    return 5;
};

export const calculateRFM = (transactions: Transaction[]): RFMData[] => {
    const snapshotDate = new Date(Math.max(...transactions.map(t => t.InvoiceDate.getTime())));
    snapshotDate.setDate(snapshotDate.getDate() + 1);

    const customerData: { [key: string]: { recency: number; frequency: number; monetary: number } } = {};

    transactions.forEach(t => {
        const customerId = t.CustomerID;
        if (!customerData[customerId]) {
            customerData[customerId] = { recency: -1, frequency: 0, monetary: 0 };
        }
        
        const lastPurchaseDate = t.InvoiceDate;
        const diffDays = (snapshotDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 3600 * 24);

        if (customerData[customerId].recency === -1 || diffDays < customerData[customerId].recency) {
            customerData[customerId].recency = diffDays;
        }

        customerData[customerId].frequency += 1;
        customerData[customerId].monetary += t.TotalPrice;
    });

    const rfmData: Omit<RFMData, 'R_Score' | 'F_Score' | 'M_Score' | 'RFM_Score' | 'Segment'>[] = Object.entries(customerData).map(([id, data]) => ({
        CustomerID: id,
        Recency: Math.round(data.recency),
        Frequency: data.frequency,
        Monetary: data.monetary
    }));

    const recencySorted = [...rfmData].map(r => r.Recency).sort((a,b) => a - b);
    const frequencySorted = [...rfmData].map(r => r.Frequency).sort((a,b) => a - b);
    const monetarySorted = [...rfmData].map(r => r.Monetary).sort((a,b) => a - b);

    const segmentMap: { [key: string]: string } = {
        '555': 'Champions', '554': 'Champions', '545': 'Champions',
        '544': 'Loyal Customers', '455': 'Loyal Customers', '454': 'Loyal Customers', '445': 'Loyal Customers',
        '535': 'Potential Loyalist', '534': 'Potential Loyalist', '435': 'Potential Loyalist', '434': 'Potential Loyalist',
        '525': 'Recent Customers', '524': 'Recent Customers', '523': 'Recent Customers',
        '355': 'Promising', '354': 'Promising', '345': 'Promising',
        '255': 'Customers Needing Attention', '254': 'Customers Needing Attention', '245': 'Customers Needing Attention',
        '333': 'About to Sleep', '332': 'About to Sleep', '323': 'About to Sleep',
        '233': 'At Risk', '232': 'At Risk', '223': 'At Risk',
        '155': "Can't Lose Them", '154': "Can't Lose Them", '145': "Can't Lose Them",
        '111': 'Lost', '112': 'Lost', '121': 'Lost',
    };

    return rfmData.map(r => {
        const R_Score = 5 - (getQuintile(r.Recency, recencySorted) - 1); // Lower recency is better
        const F_Score = getQuintile(r.Frequency, frequencySorted);
        const M_Score = getQuintile(r.Monetary, monetarySorted);
        const RFM_Score = `${R_Score}${F_Score}${M_Score}`;
        
        let Segment = segmentMap[RFM_Score] || 'Others';
        
        return { ...r, R_Score, F_Score, M_Score, RFM_Score, Segment };
    });
};

export const calculateCLTV = (rfmData: RFMData[], profitMargin: number, discountRate: number, churnRateOverride: number | null): { segmentData: CLTVData[], customerDetails: CustomerCLTVDetail[] } => {
    const segmentData: { [key: string]: { monetary: number[]; frequency: number[]; count: number } } = {};

    rfmData.forEach(r => {
        if (!segmentData[r.Segment]) {
            segmentData[r.Segment] = { monetary: [], frequency: [], count: 0 };
        }
        segmentData[r.Segment].monetary.push(r.Monetary);
        segmentData[r.Segment].frequency.push(r.Frequency);
        segmentData[r.Segment].count++;
    });

    const totalCustomers = rfmData.length;
    const repeatCustomers = rfmData.filter(r => r.Frequency > 1).length;
    const retentionRate = totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
    const baseChurnRate = 1 - retentionRate;

    const effectiveChurnRate = churnRateOverride ?? baseChurnRate;

    // Calculate individual customer CLTV details
    const customerDetails: CustomerCLTVDetail[] = rfmData.map(r => {
        const avgOrderValue = r.Frequency > 0 ? r.Monetary / r.Frequency : 0;
        const purchaseFrequency = r.Frequency;
        
        const denominator = effectiveChurnRate + discountRate;
        let cltv: number;
        
        if (denominator <= 0) {
            cltv = (avgOrderValue * purchaseFrequency * profitMargin) * 100;
        } else {
            cltv = (avgOrderValue * purchaseFrequency / denominator) * profitMargin;
        }
        
        return {
            CustomerID: r.CustomerID,
            CLTV: cltv,
            AvgOrderValue: avgOrderValue,
            PurchaseFrequency: purchaseFrequency,
            Segment: r.Segment
        };
    });

    const segmentSummary = Object.entries(segmentData).map(([segment, data]) => {
        const totalMonetary = data.monetary.reduce((a, b) => a + b, 0);
        const totalFrequency = data.frequency.reduce((a, b) => a + b, 0);
        
        const avgOrderValue = totalFrequency > 0 ? totalMonetary / totalFrequency : 0;
        const purchaseFrequency = data.count > 0 ? totalFrequency / data.count : 0;
        
        const denominator = effectiveChurnRate + discountRate;

        if (denominator <= 0) {
             return { 
                Segment: segment, 
                CustomerCount: data.count, 
                AvgCLTV: (avgOrderValue * purchaseFrequency * profitMargin) * 100 
            };
        }

        const cltv = (avgOrderValue * purchaseFrequency / denominator) * profitMargin;

        return {
            Segment: segment,
            CustomerCount: data.count,
            AvgCLTV: cltv
        };
    }).sort((a,b) => b.AvgCLTV - a.AvgCLTV);

    return {
        segmentData: segmentSummary,
        customerDetails: customerDetails
    };
};


// --- Market Basket Analysis (Simplified FP-Growth approach) ---

// Helper to get all subsets of a set (for rule generation)
const getSubsets = (arr: string[]): string[][] => {
    return arr.reduce(
        (subsets, value) => subsets.concat(subsets.map(set => [value, ...set])),
        [[]] as string[][]
    ).filter(subset => subset.length > 0 && subset.length < arr.length);
};


export const calculateMBA = (transactions: Transaction[], minSupport: number, minConfidence: number, minLift: number): MBAData => {
    // 1. Group items by invoice ID to form baskets
    const baskets: { [invoiceId: string]: Set<string> } = {};
    transactions.forEach(t => {
        if (!baskets[t.InvoiceID]) {
            baskets[t.InvoiceID] = new Set();
        }
        baskets[t.InvoiceID].add(t.Description);
    });
    const transactionList = Object.values(baskets).map(set => Array.from(set));
    const numTransactions = transactionList.length;

    // 2. Calculate support for each individual item (1-itemsets)
    const itemSupports: { [item: string]: number } = {};
    transactionList.forEach(basket => {
        basket.forEach(item => {
            itemSupports[item] = (itemSupports[item] || 0) + 1;
        });
    });

    // 3. Find frequent 1-itemsets based on minSupport
    const frequentItems: FrequentItem[] = Object.entries(itemSupports)
        .map(([item, count]) => ({ item, support: count / numTransactions }))
        .filter(item => item.support >= minSupport)
        .sort((a,b) => b.support - a.support);

    // 4. Generate candidate 2-itemsets from frequent 1-itemsets
    const frequentItemNames = frequentItems.map(i => i.item);
    const candidatePairs: { [pairKey: string]: { pair: string[], count: number } } = {};
    for (let i = 0; i < frequentItemNames.length; i++) {
        for (let j = i + 1; j < frequentItemNames.length; j++) {
            const pair = [frequentItemNames[i], frequentItemNames[j]].sort();
            const pairKey = pair.join('|');
            candidatePairs[pairKey] = { pair, count: 0 };
        }
    }
    
    // 5. Count support for candidate 2-itemsets
    transactionList.forEach(basket => {
        for (const pairKey in candidatePairs) {
            const { pair } = candidatePairs[pairKey];
            if (pair.every(item => basket.includes(item))) {
                candidatePairs[pairKey].count++;
            }
        }
    });

    // 6. Filter for frequent 2-itemsets
    const frequentItemsets: { [itemset: string]: number } = {};
    Object.values(candidatePairs).forEach(({ pair, count }) => {
        if (count / numTransactions >= minSupport) {
            frequentItemsets[pair.join('|')] = count;
        }
    });
    for(const item in itemSupports) {
        frequentItemsets[item] = itemSupports[item];
    }
    
    // 7. Generate association rules from frequent 2-itemsets
    const rules: AssociationRule[] = [];
    Object.entries(frequentItemsets).forEach(([itemsetKey, itemsetCount]) => {
        const itemset = itemsetKey.split('|');
        if (itemset.length > 1) { // Only generate rules from pairs
            const itemsetSupport = itemsetCount / numTransactions;
            
            // Generate rules like {A} -> {B} and {B} -> {A}
            const antecedentA = itemset[0];
            const consequentB = itemset[1];
            const antecedentB = itemset[1];
            const consequentA = itemset[0];
            
            const supportA = itemSupports[antecedentA] / numTransactions;
            const supportB = itemSupports[antecedentB] / numTransactions;

            const confidenceAtoB = itemsetSupport / supportA;
            const confidenceBtoA = itemsetSupport / supportB;

            const liftAtoB = confidenceAtoB / supportB;
            const liftBtoA = confidenceBtoA / supportA;

            if (confidenceAtoB >= minConfidence && liftAtoB >= minLift) {
                rules.push({ antecedent: antecedentA, consequent: consequentB, support: itemsetSupport, confidence: confidenceAtoB, lift: liftAtoB });
            }
            if (confidenceBtoA >= minConfidence && liftBtoA >= minLift) {
                rules.push({ antecedent: antecedentB, consequent: consequentA, support: itemsetSupport, confidence: confidenceBtoA, lift: liftBtoA });
            }
        }
    });
    
    return {
        rules: rules.sort((a,b) => b.lift - a.lift),
        frequentItems: frequentItems
    };
}


export const exportToCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = String(row[header] ?? ''); // Ensure value is not null/undefined
                // Quote fields that contain commas, double quotes, or newlines
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
