import { BlogPost } from './types';

const WP_URL = process.env.WORDPRESS_URL;
const WP_USER = process.env.WORDPRESS_USERNAME;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

export class WordPressService {
    private baseUrl: string;
    private authHeader: string;

    constructor() {
        this.baseUrl = WP_URL ? (WP_URL.endsWith('/') ? WP_URL : `${WP_URL}/`) : '';

        if (WP_USER && WP_APP_PASSWORD) {
            const token = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
            this.authHeader = `Basic ${token}`;
        } else {
            this.authHeader = '';
            console.warn('WordPress credentials not fully set.');
        }
    }

    private getApiUrl(endpoint: string): string {
        return `${this.baseUrl}wp-json/wp/v2/${endpoint}`;
    }

    async getPosts(): Promise<BlogPost[]> {
        if (!this.baseUrl) return [];

        try {
            const response = await fetch(this.getApiUrl('posts?status=publish,draft&per_page=10'), {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {},
                // next: { revalidate: 60 } // Optional caching
            });

            if (!response.ok) {
                throw new Error(`WordPress API API Error: ${response.statusText}`);
            }

            const data = await response.json();

            return data.map((post: { id: number; title: { rendered: string }; content: { rendered: string }; status: 'publish' | 'draft' | 'pending'; date: string }) => ({
                id: post.id,
                title: post.title.rendered,
                content: post.content.rendered,
                status: post.status,
                date: post.date,
            }));
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            return [];
        }
    }

    async createPost(post: { title: string; content: string; status: 'publish' | 'draft' }): Promise<BlogPost | null> {
        if (!this.baseUrl || !this.authHeader) {
            throw new Error('WordPress API credentials or URL missing.');
        }

        try {
            const response = await fetch(this.getApiUrl('posts'), {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: post.title,
                    content: post.content,
                    status: post.status,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create post: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                title: data.title.rendered,
                content: data.content.rendered,
                status: data.status,
                date: data.date,
            };
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    }
}

export const wordpressService = new WordPressService();
