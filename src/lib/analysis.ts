import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analyzed_comments.json');

export interface AnalysisResult {
    commentId: number;
    classification: 'approve' | 'trash' | 'spam';
    reason?: string;
    tags?: string[];
    timestamp: string;
    model: string;
}

export class AnalysisService {
    private ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(ANALYSIS_FILE)) {
            fs.writeFileSync(ANALYSIS_FILE, JSON.stringify({}, null, 2));
        }
    }

    async getAnalysis(commentId: number): Promise<AnalysisResult | null> {
        this.ensureDataDir();
        try {
            const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
            return data[commentId] || null;
        } catch {
            return null;
        }
    }

    async saveAnalysis(result: AnalysisResult) {
        this.ensureDataDir();
        try {
            const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
            data[result.commentId] = result;
            fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save analysis:', error);
        }
    }

    async getAnalyzedIds(): Promise<number[]> {
        this.ensureDataDir();
        try {
            const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
            return Object.keys(data).map(Number);
        } catch {
            return [];
        }
    }

    // Helper to get multiple results efficiently
    async getAnalyses(commentIds: number[]): Promise<Record<number, AnalysisResult>> {
        this.ensureDataDir();
        try {
            const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
            const results: Record<number, AnalysisResult> = {};
            commentIds.forEach(id => {
                if (data[id]) results[id] = data[id];
            });
            return results;
        } catch {
            return {};
        }
    }
}

export const analysisService = new AnalysisService();
