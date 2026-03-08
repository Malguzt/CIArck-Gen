import { BlogPost, Comment } from './types';

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

    async getComments(status: string = 'hold'): Promise<Comment[]> {
        // Fallback for demo/testing if no WP connection or using placeholder
        if (!this.baseUrl || this.baseUrl.includes('your-wordpress-site')) {
            return [
                {
                    id: 1,
                    author_name: "Demo User",
                    content: { rendered: "This is a demo comment for testing purposes." },
                    date: new Date().toISOString(),
                    status: status as any,
                    post: 1
                },
                {
                    id: 2,
                    author_name: "Spam Bot",
                    content: { rendered: "Buy cheap meds now! <a href='#'>Click here</a>" },
                    date: new Date().toISOString(),
                    status: 'spam',
                    post: 1
                }
            ].filter(c => c.status === status);
        }

        try {
            const response = await fetch(this.getApiUrl(`comments?status=${status}&per_page=20`), {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {},
            });

            if (!response.ok) {
                // If 401/403, might be because app password lacks permissions or is invalid
                console.warn(`Failed to fetch comments: ${response.statusText}`);
                return [];
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            return [];
        }
    }

    async updateComment(id: number, status: 'approve' | 'hold' | 'spam' | 'trash'): Promise<boolean> {
        if (!this.baseUrl || !this.authHeader) return false;

        try {
            const response = await fetch(this.getApiUrl(`comments/${id}`), {
                method: 'POST', // WP API uses POST for updates usually, or PUT
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            return response.ok;
        } catch (error) {
            console.error(`Failed to update comment ${id}:`, error);
            return false;
        }
    }
}

export const wordpressService = new WordPressService();
