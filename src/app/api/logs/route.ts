import { NextResponse } from 'next/server';
import { logsService } from '@/lib/logs';

export async function GET() {
    const logs = await logsService.getLogs();
    return NextResponse.json(logs);
}
