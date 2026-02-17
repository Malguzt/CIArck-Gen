import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

export interface ActivityLog {
    id: string;
    action: 'PUBLISH' | 'DRAFT' | 'GENERATE';
    title: string;
    description?: string;
    status: 'success' | 'error';
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export class LogsService {
    private ensureDataDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(LOGS_FILE)) {
            fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
        }
    }

    async getLogs(limit: number = 20): Promise<ActivityLog[]> {
        this.ensureDataDir();
        try {
            const data = fs.readFileSync(LOGS_FILE, 'utf-8');
            const logs = JSON.parse(data) as ActivityLog[];
            // Sort by timestamp desc
            return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
        } catch (error) {
            console.error('Failed to read logs:', error);
            return [];
        }
    }

    async addLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
        this.ensureDataDir();
        const logs = await this.getLogs(100); // Keep last 100 in memory for append

        const newLog: ActivityLog = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...log
        };

        const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep file size manageable

        try {
            fs.writeFileSync(LOGS_FILE, JSON.stringify(updatedLogs, null, 2));
        } catch (error) {
            console.error('Failed to write log:', error);
        }

        return newLog;
    }
}

export const logsService = new LogsService();
