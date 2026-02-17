import { OpenRouterMessage, OpenRouterCompletionResponse } from './types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'WordPress Blog Manager';

export class OpenRouterService {
    private apiKey: string;

    constructor() {
        if (!OPENROUTER_API_KEY) {
            console.warn('OPENROUTER_API_KEY is not set in environment variables');
        }
        this.apiKey = OPENROUTER_API_KEY || '';
    }

    async complete(
        messages: OpenRouterMessage[],
        model: string = 'openai/gpt-3.5-turbo'
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenRouter API Key is missing. Please set OPENROUTER_API_KEY.');
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data: OpenRouterCompletionResponse = await response.json();

            if (!data.choices || data.choices.length === 0) {
                return '';
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('Failed to complete with OpenRouter:', error);
            throw error;
        }
    }

    async generateBlogPost(topic: string, model: string, systemPrompt?: string): Promise<{ title: string; content: string }> {
        const defaultSystemPrompt = `You are a professional blog post writer. 
        Return the response in JSON format with strict structure: {"title": "The Title", "content": "The full HTML content of the blog post"}. 
        Do not include markdown code blocks around the JSON.`;

        const prompt: OpenRouterMessage[] = [
            {
                role: 'system',
                content: systemPrompt || defaultSystemPrompt
            },
            {
                role: 'user',
                content: `Write a comprehensive blog post about: ${topic}`
            }
        ];

        const content = await this.complete(prompt, model);

        try {
            // Attempt to clean messy markdown json if present
            const jsonString = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonString);
        } catch {
            console.error("Failed to parse JSON response from AI", content);
            // Fallback or better error handling needed
            throw new Error("Failed to generate valid JSON for blog post");
        }
    }
}

export const openRouterService = new OpenRouterService();
