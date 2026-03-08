import { OpenRouterMessage, OpenRouterCompletionResponse, Profile } from './types';
import { TrendItem } from './news';

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

    async generateBlogPost(topic: string, model: string, systemPrompt?: string): Promise<{ title: string; content: string; newMemories?: string[] }> {
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

    async editContent(profile: Profile, blogContent: string, validationReport: any, model: string = 'openai/gpt-4o'): Promise<{ suggestions: string; newMemories?: string[] }> {
        const systemPrompt = `You are playing the role of a meticulous and critical Editor. Review the blog post content provided by the user.
        
        Your Profile:
        - Name: ${profile.name}
        - Role: ${profile.role}
        - Personality: ${profile.personality}
        - Style: ${profile.style}
        - Interests: ${profile.interests.join(', ')}
        
        You also have access to the following veracity/validation report from an external checker:
        ${JSON.stringify(validationReport, null, 2)}
        
        Your Memories:
        ${profile.memories && profile.memories.length > 0 ? profile.memories.join('\n') : "No previous memories."}

        You must provide critical feedback, suggestions for tone, style, factual improvements based on the validation report, and overall structure.
        
        If you extract a new general editing rule from this post that you want to apply to future posts, add it to your newMemories.

        Return ONLY a JSON response in this strict structure: {"suggestions": "Your thorough, detailed feedback HTML formatted (using <ul>, <p>, <strong>)", "newMemories": ["(Optional) Any new editing rules you derived from this review."]}
        Do not include markdown code blocks around the JSON.`;

        const userPrompt = `Please edit and review this blog content:\n\n${blogContent}`;

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const result = await this.complete(prompt, model);
            const jsonString = result.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(jsonString);
            return {
                suggestions: parsed.suggestions || "No suggestions provided.",
                newMemories: Array.isArray(parsed.newMemories) ? parsed.newMemories : []
            };
        } catch (error) {
            console.error(`Failed to generate an editor review from ${profile.name}:`, error);
            throw new Error(`Failed to generate an editor review from ${profile.name}`);
        }
    }

    async reviseContent(profile: Profile, blogContent: string, validationReport: any, editorSuggestions: Record<string, string>, model: string = 'openai/gpt-4o'): Promise<{ revisedContent: string; newMemories?: string[] }> {
        const systemPrompt = `You are playing the role of the original writer of this blog post. Your task is to revise your original article based on feedback from editors and a factual validation report.
        
        Your Profile:
        - Name: ${profile.name}
        - Role: ${profile.role}
        - Personality: ${profile.personality}
        - Style: ${profile.style}
        - Interests: ${profile.interests.join(', ')}
        
        Your Memories:
        ${profile.memories && profile.memories.length > 0 ? profile.memories.join('\n') : "No previous memories."}

        You will be provided with:
        1. The factual Validation Report (details on what is confirmed true, false, or doubtful).
        2. Editor Suggestions (feedback from one or more editors).
        3. Your original blog content.

        Task:
        Rewrite the blog content to fix factual errors, address the editor's stylistic or structural suggestions, and improve the overall post. 
        You MAY choose to ignore certain editor suggestions if they clash heavily with your unique Personality and Style, but you MUST fix factual errors.

        If you learn a new important lesson about writing, facts, or audience preferences from this feedback, add it to your newMemories so you don't make the same mistake next time.

        Return ONLY a JSON response in this strict structure: {"revisedContent": "The full revised HTML content of your updated blog post", "newMemories": ["(Optional) Any new rules or facts you learned from this revision process."]}
        Do not include markdown code blocks around the JSON.`;

        const userPrompt = `
        --- Validation Report ---
        ${JSON.stringify(validationReport, null, 2)}
        
        --- Editor Suggestions ---
        ${JSON.stringify(editorSuggestions, null, 2)}
        
        --- Your Original Content ---
        ${blogContent}
        
        Please provide the revised JSON output.`;

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const result = await this.complete(prompt, model);
            const jsonString = result.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(jsonString);
            return {
                revisedContent: parsed.revisedContent || blogContent,
                newMemories: Array.isArray(parsed.newMemories) ? parsed.newMemories : []
            };
        } catch (error) {
            console.error(`Failed to revise content for writer ${profile.name}:`, error);
            throw new Error(`Failed to revise content for writer ${profile.name}`);
        }
    }

    async classifyComment(commentContent: string): Promise<{ classification: 'approve' | 'trash' | 'spam'; reason: string; tags: string[] }> {
        const prompt = `You are a strict comment moderator for a blog. Analyze the following comment and classify it.
        
        Classifications:
        - 'approve': valid, constructive, safe.
        - 'trash': low quality, irrelevant, or nonsense.
        - 'spam': promotional, links to sketchy sites, bot-generated.

        Also provide a list of tags (max 3) describing the content (e.g., "Hate Speech", "Spam Link", "Self Promotion", "Bot", "Constructive", "Question").
        
        Comment: "${commentContent}"
        
        Return ONLY a JSON object with this format: { "classification": "approve" | "trash" | "spam", "reason": "short explanation", "tags": ["tag1", "tag2"] }`;

        try {
            const content = await this.complete(
                [{ role: 'user', content: prompt }],
                'arcee-ai/trinity-large-preview:free'
            );

            const jsonString = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const result = JSON.parse(jsonString);

            // Validate result
            if (['approve', 'trash', 'spam'].includes(result.classification)) {
                return {
                    classification: result.classification,
                    reason: result.reason || '',
                    tags: Array.isArray(result.tags) ? result.tags : []
                };
            }
            return { classification: 'approve', reason: 'Failed to classify cleanly.', tags: [] };

        } catch (error) {
            console.error('Classification failed:', error);
            return { classification: 'approve', reason: 'Error during classification.', tags: [] };
        }
    }

    async generateTitleSuggestion(profile: Profile, trends: TrendItem[], model: string = 'openai/gpt-3.5-turbo'): Promise<string> {
        const trendsList = trends.slice(0, 10).map(t => `- ${t.title}`).join('\n');

        const systemPrompt = `You are playing the role of a specific writer. Your task is to brainstorm exactly ONE catchy blog post title based on the given trending topics.
        
        Your Profile:
        - Name: ${profile.name}
        - Role: ${profile.role}
        - Personality: ${profile.personality}
        - Style: ${profile.style}
        - Interests: ${profile.interests.join(', ')}

        You must return ONLY the blog post title itself and nothing else. No quotes, no explanations, no JSON. Just the raw string.`;

        const userPrompt = `Here are today's trending topics:\n${trendsList}\n\nBased on these trends, generate ONE catchy, engaging blog post title that aligns with your profile's role, interests, and style.`;

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const title = await this.complete(prompt, model);
            return title.replace(/^["']|["']$/g, '').trim(); // Remove surrounding quotes if any
        } catch (error) {
            console.error(`Failed to generate title suggestion for ${profile.name}:`, error);
            return '';
        }
    }

    async validateContent(content: string): Promise<{ confirmed: string[]; false: string[]; doubtful: string[] }> {
        const prompt = `You are an expert fact-checker and internet research assistant.
        Your job is to read the following blog content, extract the factual claims, and verify them against live internet sources.
        
        Perform a rigorous verification (using up to 3 searches if needed to corroborate).
        - "confirmed": Claims that are verifiably true based on reliable internet sources.
        - "false": Claims that contradict reliable internet sources.
        - "doubtful": Claims that lack sufficient evidence, are highly debated, or cannot be reliably verified.
        
        Return ONLY a raw JSON object with this exact structure, containing arrays of short, clear strings explaining the finding:
        {
            "confirmed": ["Fact 1 is true because...", "Fact 2 is confirmed by..."],
            "false": ["Claim X is false; sources state Y instead..."],
            "doubtful": ["Claim Z could not be independently verified..."]
        }
        
        Do not include Markdown blocks. Just the JSON object.
        
        Content to verify:
        """
        ${content}
        """`;

        try {
            const result = await this.complete(
                [{ role: 'user', content: prompt }],
                'perplexity/sonar-pro' // Web-enabled model
            );

            const jsonString = result.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const report = JSON.parse(jsonString);

            return {
                confirmed: Array.isArray(report.confirmed) ? report.confirmed : [],
                false: Array.isArray(report.false) ? report.false : [],
                doubtful: Array.isArray(report.doubtful) ? report.doubtful : []
            };

        } catch (error) {
            console.error('Content validation failed:', error);
            throw new Error('Failed to validate content veracity.');
        }
    }
}

export const openRouterService = new OpenRouterService();
