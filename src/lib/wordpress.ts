import { BlogPost, Comment, MediaItem } from './types';
import { TrendItem } from './news';

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

    async getPosts(lang: string = ''): Promise<BlogPost[]> {
        if (!this.baseUrl) return [];

        try {
            const endpoint = lang 
                ? `posts?status=publish,draft&per_page=100&lang=${lang}&_embed`
                : 'posts?status=publish,draft&per_page=100&_embed';

            const response = await fetch(this.getApiUrl(endpoint), {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {},
            });

            if (!response.ok) {
                throw new Error(`WordPress API API Error: ${response.statusText}`);
            }

            const data = await response.json();

            return data.map((post: any) => ({
                id: post.id,
                title: post.title?.rendered || '',
                content: post.content?.rendered || '',
                status: post.status,
                authorId: post.author,
                date: post.date,
                lang: post.lang || null,
                translations: post.translations,
                featured_media: post.featured_media,
                featured_media_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
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
                title: data.title?.rendered || '',
                content: data.content?.rendered || '',
                status: data.status,
                date: data.date,
                lang: data.lang,
                translations: data.translations,
            };
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    }

    async createTranslation(post: { title: string; content: string; status: 'publish' | 'draft'; lang: string; translations: Record<string, number>; authorId?: number; featured_media?: number }): Promise<BlogPost | null> {
        if (!this.baseUrl || !this.authHeader) {
            throw new Error('WordPress API credentials or URL missing.');
        }

        try {
            // Step 1: Create the post with its language
            const requestBody: any = {
                title: post.title,
                content: post.content,
                status: post.status,
                lang: post.lang,
            };
            if (post.authorId) {
                requestBody.author = post.authorId;
            }
            if (post.featured_media) {
                requestBody.featured_media = post.featured_media;
            }

            const response = await fetch(this.getApiUrl('posts'), {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create translation: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();

            // Step 2: Update the newly created post with the translation links
            if (post.translations && Object.keys(post.translations).length > 0) {
                const updateResponse = await fetch(this.getApiUrl(`posts/${data.id}`), {
                    method: 'POST',
                    headers: {
                        'Authorization': this.authHeader,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        translations: post.translations,
                    }),
                });

                if (!updateResponse.ok) {
                    console.warn(`Translation was created (ID: ${data.id}), but linking failed:`, await updateResponse.text());
                } else {
                    const updateData = await updateResponse.json();
                    data.translations = updateData.translations;
                }
            }

            return {
                id: data.id,
                title: data.title?.rendered || '',
                content: data.content?.rendered || '',
                status: data.status,
                date: data.date,
                lang: data.lang,
                translations: data.translations,
                featured_media: data.featured_media,
            };
        } catch (error) {
            console.error('Failed to create translation:', error);
            throw error;
        }
    }

    async getComments(status: string = 'hold', offset: number = 0): Promise<Comment[]> {
        // Fallback for demo/testing if no WP connection or using placeholder
        if (!this.baseUrl || this.baseUrl.includes('your-wordpress-site')) {
            return [
                {
                    id: 1,
                    author_name: "Demo User",
                    content: "This is a demo comment for testing purposes.",
                    date: new Date().toISOString(),
                    status: status as any,
                    post: 1
                },
                {
                    id: 2,
                    author_name: "Spam Bot",
                    content: "Buy cheap meds now! <a href='#'>Click here</a>",
                    date: new Date().toISOString(),
                    status: 'spam',
                    post: 1
                }
            ].filter(c => c.status === status).slice(offset, offset + 20);
        }

        try {
            const response = await fetch(this.getApiUrl(`comments?status=${status}&per_page=20&offset=${offset}`), {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {},
            });

            if (!response.ok) {
                // If 401/403, might be because app password lacks permissions or is invalid
                console.warn(`Failed to fetch comments: ${response.statusText}`);
                return [];
            }

            const data = await response.json();
            return data.map((c: any) => ({
                id: c.id,
                author_name: c.author_name,
                content: c.content?.rendered || '',
                date: c.date,
                status: c.status,
                post: c.post,
                analysis: c.analysis
            }));
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            return [];
        }
    }

    async getPostMedia(postId: number): Promise<MediaItem[]> {
        if (!this.baseUrl) return [];
        try {
            const response = await fetch(this.getApiUrl(`media?parent=${postId}`), {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {},
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((item: any) => ({
                id: item.id,
                source_url: item.source_url,
                title: item.title?.rendered || '',
                alt_text: item.alt_text || '',
                mime_type: item.mime_type,
                media_details: item.media_details,
            }));
        } catch (error) {
            console.error(`Failed to fetch media for post ${postId}:`, error);
            return [];
        }
    }

    async uploadMedia(source: string, fileName: string, postId?: number): Promise<MediaItem | null> {
        if (!this.baseUrl || !this.authHeader) return null;
        try {
            let buffer: Buffer;
            if (source.startsWith('http')) {
                const res = await fetch(source);
                buffer = Buffer.from(await res.arrayBuffer());
            } else {
                const base64Content = source.includes(',') ? source.split(',')[1] : source;
                buffer = Buffer.from(base64Content, 'base64');
            }

            const blob = new Blob([new Uint8Array(buffer)]);
            const formData = new FormData();
            formData.append('file', blob, fileName);
            if (postId) {
                formData.append('post', postId.toString());
            }

            const response = await fetch(this.getApiUrl('media'), {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeader,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload media: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                source_url: data.source_url,
                title: data.title?.rendered || '',
                alt_text: data.alt_text || '',
                mime_type: data.mime_type,
                media_details: data.media_details,
            };
        } catch (error) {
            console.error('Failed to upload media:', error);
            return null;
        }
    }

    async setFeaturedImage(postId: number, mediaId: number): Promise<boolean> {
        if (!this.baseUrl || !this.authHeader) return false;
        try {
            const response = await fetch(this.getApiUrl(`posts/${postId}`), {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ featured_media: mediaId }),
            });
            return response.ok;
        } catch (error) {
            console.error(`Failed to set featured image for post ${postId}:`, error);
            return false;
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
