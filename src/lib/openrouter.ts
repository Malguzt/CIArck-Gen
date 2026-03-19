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

            if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
                return '';
            }

            return data.choices[0].message.content || '';
        } catch (error) {
            console.error('Failed to complete with OpenRouter:', error);
            throw error;
        }
    }

    async generateBlogPost(topic: string, model: string, systemPrompt?: string, context?: string): Promise<{ title: string; content: string; newMemories?: string[] }> {
        const defaultSystemPrompt = `You are a professional blog post writer. 
        Your goal is to provide high-quality, engaging, and informative content.
        Return the response in JSON format with strict structure: 
        {"title": "The Title", "content": "The full HTML content of the blog post", "newMemories": ["(Optional) Any new important facts or experiences from writing this that you want to remember next time you are called. Include only if necessary."]}
        Do not include markdown code blocks around the JSON.`;

        const userPrompt = `Please write a comprehensive, engaging, and SEO-friendly blog post about: **${topic}**.
        ${context ? `\n\nBackground Context for this Topic:\n${context}` : ''}
        
        Requirements:
        1. Use proper HTML tags for structure (h2, h3, p, ul, ol, strong, etc.).
        2. Focus on readability and value for the reader.
        3. Keep the tone professional yet approachable.
        4. If you mention facts, try to ensure they are plausible (you can use your internal knowledge).`;

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt || defaultSystemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const rawResponse = await this.complete(prompt, model);
            const jsonString = rawResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(jsonString);
            return {
                title: parsed.title || topic,
                content: parsed.content || '',
                newMemories: Array.isArray(parsed.newMemories) ? parsed.newMemories : []
            };
        } catch (error) {
            console.error(`Failed to generate blog post for topic "${topic}":`, error);
            throw new Error(`Failed to generate blog post for topic "${topic}"`);
        }
    }

    async translateContent(title: string, content: string, targetLanguage: string, model: string = 'openai/gpt-3.5-turbo'): Promise<{ title: string; content: string }> {
        const systemPrompt = `You are a professional web content translator. Your task is to accurately translate a blog post's title and its full HTML content into the target language.
        
        Target Language: ${targetLanguage}
        
        Rules:
        1. Fully preserve all HTML tags (e.g., <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>) exactly as they are. DO NOT translate the HTML tags themselves, only the inner text.
        2. IMAGES: You MUST preserve <img> tags. Keep the 'src', 'srcset', and 'class' attributes exactly the same (to point to the same original media). Translate the 'alt' text and any 'title' attributes within the image tags to the target language.
        3. TONE AND STYLE: 
           - For Spanish: Use a natural, relaxed regional style from the Argentine Northeast (Corrientes, Chaco, Formosa, Misiones). Use "vos" for the second person singular. The language should feel authentic and provincial, avoid neutral "international" Spanish or the formal styles of Buenos Aires or Spain.
           - For all languages: Avoid extremely formal or capital-city standard tones. Prefer a relaxed, friendly, and approachable provincial style.
        4. Keep the formatting and structure identical to the original.
        5. Do not add any extra commentary or markdown formatting outside of the JSON.
        
        Return ONLY a JSON response in this strict structure: {"title": "The translated Title", "content": "The fully translated HTML content"}.
        Do not include markdown code blocks around the JSON.`;

        const userPrompt = `Please translate the following to ${targetLanguage}:\n\nTitle: ${title}\n\nContent:\n${content}`;

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const rawResponse = await this.complete(prompt, model);
            const jsonString = rawResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(jsonString);
            return {
                title: parsed.title || title,
                content: parsed.content || content
            };
        } catch (error) {
            console.error(`Failed to translate content to ${targetLanguage}:`, error);
            throw new Error(`Failed to translate content to ${targetLanguage}`);
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
        const basePrompt = `You are a strict comment moderator for a blog. Analyze the following comment and classify it.
        
        Classifications:
        - 'approve': valid, constructive, safe.
        - 'trash': low quality, irrelevant, or nonsense.
        - 'spam': promotional, links to sketchy sites, bot-generated.

        Also provide a list of tags (max 3) describing the content (e.g., "Hate Speech", "Spam Link", "Self Promotion", "Bot", "Constructive", "Question").
        
        Comment: "${commentContent}"
        
        Return ONLY a JSON object with this format: { "classification": "approve" | "trash" | "spam", "reason": "short explanation", "tags": ["tag1", "tag2"] }`;

        let promptMessages: OpenRouterMessage[] = [{ role: 'user', content: basePrompt }];
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            let content = '';
            try {
                content = await this.complete(
                    promptMessages,
                    'arcee-ai/trinity-large-preview:free'
                );

                if (!content) {
                    throw new Error('Empty response from model');
                }

                let jsonString = '';
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                if (jsonMatch) {
                    jsonString = jsonMatch[1].trim();
                } else {
                    const objectMatch = content.match(/\{[\s\S]*\}/);
                    jsonString = objectMatch ? objectMatch[0].trim() : content.trim();
                }
                const result = JSON.parse(jsonString);

                // Validate result
                if (['approve', 'trash', 'spam'].includes(result.classification)) {
                    return {
                        classification: result.classification,
                        reason: result.reason || '',
                        tags: Array.isArray(result.tags) ? result.tags : []
                    };
                }
                
                throw new Error(`Invalid classification value: ${result.classification}`);

            } catch (error: any) {
                console.warn(`Classification attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error('Max classification retries reached.');
                    return { classification: 'approve', reason: 'Error during classification after retries.', tags: [] };
                }

                // If it's not a network/API error, add feedback to prompt messages
                if (error.message.indexOf('OpenRouter API Error') === -1 && error.message.indexOf('fetch failed') === -1) {
                    promptMessages.push({ role: 'assistant', content: content || '(empty response)' });
                    promptMessages.push({ 
                        role: 'user', 
                        content: `Your previous response failed to process. Error: ${error.message}. Please correct the output and respond ONLY with the exact required JSON structure.` 
                    });
                } else {
                    // Optional delay for API rate limits / network blips
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        return { classification: 'approve', reason: 'Error during classification.', tags: [] };
    }

    async generateTitleSuggestion(profile: Profile, trends: TrendItem[], topic?: string, context?: string, model: string = 'openai/gpt-3.5-turbo'): Promise<{ title: string; newMemories?: string[] }> {
        const systemPrompt = `You are playing the role of a specific writer. Your task is to brainstorm exactly ONE catchy blog post title.
        
        Your Profile:
        - Name: ${profile.name}
        - Role: ${profile.role}
        - Personality: ${profile.personality}
        - Style: ${profile.style}
        - Interests: ${profile.interests.join(', ')}

        You must return ONLY a JSON response in this strict structure: {"title": "The Title", "newMemories": ["(Optional) Any new important facts or style rules you want to remember from brainstorming this topic."]}
        Do not include markdown code blocks around the JSON.`;

        let userPrompt = '';
        if (topic) {
            userPrompt = `The user wants to write about the following topic: **${topic}**.
            ${context ? `\nContext/Reason it's trending: ${context}\n` : ''}
            Based on this topic and context, generate ONE catchy, engaging blog post title that aligns with your profile's role, interests, and style.`;
        } else {
            const trendsList = trends.slice(0, 10).map(t => `- ${t.title}`).join('\n');
            userPrompt = `Here are today's trending topics:\n${trendsList}\n\nBased on these trends, generate ONE catchy, engaging blog post title that aligns with your profile's role, interests, and style.`;
        }

        const prompt: OpenRouterMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const rawResponse = await this.complete(prompt, model);
            const jsonString = rawResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(jsonString);
            return {
                title: parsed.title?.replace(/^["']|["']$/g, '').trim() || '',
                newMemories: Array.isArray(parsed.newMemories) ? parsed.newMemories : []
            };
        } catch (error) {
            console.error(`Failed to generate title suggestion for ${profile.name}:`, error);
            return { title: '' };
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

    async getTrendsContext(trendTitles: string[]): Promise<Record<string, string>> {
        if (trendTitles.length === 0) return {};

        const prompt = `You are a news analyst. I will provide a list of current trending topics from Google Trends. 
        For each topic, provide a brief (1-2 sentences) explanation of WHY it is currently trending. 
        Be specific (e.g., mention a new product launch, a major news event, or a social media viral trend).
        
        Topics:
        ${trendTitles.map(t => `- ${t}`).join('\n')}
        
        Return ONLY a JSON object where keys are the EXACT topic names from the list above and values are the brief explanations.
        Do not include Markdown blocks. Just the JSON object.`;

        try {
            const result = await this.complete(
                [{ role: 'user', content: prompt }],
                'perplexity/sonar-pro' // Web-enabled model
            );

            // Clean result for JSON parsing
            const jsonString = result.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            const contextMap = JSON.parse(jsonString);
            return contextMap;
        } catch (error) {
            console.error('Failed to get trends context from AI:', error);
            return {};
        }
    }
}

export const openRouterService = new OpenRouterService();
