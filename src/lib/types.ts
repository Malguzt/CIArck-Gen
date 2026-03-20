export interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OpenRouterCompletionResponse {
    id: string;
    choices: {
        message: OpenRouterMessage;
        finish_reason: string;
    }[];
    model: string;
}

export interface BlogPost {
    id?: number;
    title: string;
    content: string;
    status: 'publish' | 'draft' | 'pending';
    authorId?: number;
    date?: string;
    lang?: string;
    translations?: Record<string, number>;
    featured_media?: number;
    featured_media_url?: string;
}

export interface MediaItem {
    id: number;
    source_url: string;
    title: string;
    alt_text: string;
    mime_type: string;
    media_details?: {
        width: number;
        height: number;
        file: string;
    };
}

export interface Profile {
    id: string;
    name: string;
    wordpressAuthorId?: number;
    personality: string;
    role: string;
    style: string;
    interests: string[];
    memories: string[];
}

export interface Comment {
    id: number;
    author_name: string;
    content: string;
    date: string;
    status: 'approved' | 'hold' | 'spam' | 'trash';
    post: number; // Post ID
    analysis?: {
        classification: 'approve' | 'trash' | 'spam';
        reason: string;
        tags?: string[];
    };
}
