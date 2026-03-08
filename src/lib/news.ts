import { XMLParser } from 'fast-xml-parser';

export interface TrendItem {
    title: string;
    link: string;
    pubDate: string;
    description?: string;
    source?: string;
}

const NEWS_API_KEY = process.env.NEWS_API_KEY;

export class NewsService {

    async getTrends(geo: string = 'US'): Promise<TrendItem[]> {
        // Default to Google Trends RSS as it requires no key
        // Google Trends RSS is flaky, using fallback if it fails
        const rssUrl = `https://trends.google.com/trending/rss?geo=${geo}`;

        try {
            const response = await fetch(rssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch trends: ${response.status} ${response.statusText}`);
            }

            const xmlData = await response.text();
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const jObj = parser.parse(xmlData);

            const items = jObj.rss?.channel?.item;

            if (!items) return [];

            const trendItems: TrendItem[] = (Array.isArray(items) ? items : [items]).map((item: { title: string; link?: string; 'ht:news_item'?: { 'ht:news_item_url': string }; pubDate: string; description?: string }) => ({
                title: item.title,
                link: item.link || item['ht:news_item']?.['ht:news_item_url'] || '#', // Google Trends specific fallback
                pubDate: item.pubDate,
                description: item.description,
                source: 'Google Trends'
            }));

            return trendItems;

        } catch (error) {
            console.warn('Failed to fetch trends, using fallback data:', error);
            // Fallback data so the UI doesn't look empty
            return [
                {
                    title: "Artificial Intelligence",
                    link: "https://trends.google.com/trends/explore?q=Artificial+Intelligence",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data"
                },
                {
                    title: "Next.js 15",
                    link: "https://trends.google.com/trends/explore?q=Next.js",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data"
                },
                {
                    title: "WordPress Development",
                    link: "https://trends.google.com/trends/explore?q=WordPress",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data"
                }
            ];
        }
    }

    // Placeholder for NewsAPI if we want to add it later
    async getNews(_query: string): Promise<TrendItem[]> {
        if (!NEWS_API_KEY) {
            console.warn("NEWS_API_KEY not set");
            return [];
        }
        // Implementation for NewsAPI would go here
        return [];
    }
}

export const newsService = new NewsService();
