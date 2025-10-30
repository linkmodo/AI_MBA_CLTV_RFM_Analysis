// FIX: Removed self-import of 'Transaction' which was conflicting with the local declaration.
export interface Transaction {
    [key: string]: any;
}

export interface ColumnMapping {
    customerId: string;
    invoiceId: string;
    invoiceDate: string;
    quantity: string;
    unitPrice: string;
    description: string;
}

export interface RFMData {
    CustomerID: string;
    Recency: number;
    Frequency: number;
    Monetary: number;
    R_Score: number;
    F_Score: number;
    M_Score: number;
    RFM_Score: string;
    Segment: string;
}

export interface CLTVData {
    Segment: string;
    CustomerCount: number;
    AvgCLTV: number;
}

export interface CustomerCLTVDetail {
    CustomerID: string;
    CLTV: number;
    AvgOrderValue: number;
    PurchaseFrequency: number;
    Segment: string;
}

export interface AssociationRule {
    antecedent: string;
    consequent: string;
    support: number;
    confidence: number;
    lift: number;
}

export interface FrequentItem {
    item: string;
    support: number;
}

export interface MBAData {
    rules: AssociationRule[];
    frequentItems: FrequentItem[];
}