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
        const rssUrl = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`;

        try {
            const response = await fetch(rssUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch trends: ${response.statusText}`);
            }

            const xmlData = await response.text();
            const parser = new XMLParser();
            const jObj = parser.parse(xmlData);

            const items = jObj.rss?.channel?.item;

            if (!items) return [];

            const trendItems: TrendItem[] = (Array.isArray(items) ? items : [items]).map((item: any) => ({
                title: item.title,
                link: item.link || item['ht:news_item']?.['ht:news_item_url'], // Google Trends specific
                pubDate: item.pubDate,
                description: item.description,
                source: 'Google Trends'
            }));

            return trendItems;

        } catch (error) {
            console.error('Failed to fetch trends:', error);
            return [];
        }
    }

    // Placeholder for NewsAPI if we want to add it later
    async getNews(query: string): Promise<TrendItem[]> {
        if (!NEWS_API_KEY) {
            console.warn("NEWS_API_KEY not set");
            return [];
        }
        // Implementation for NewsAPI would go here
        return [];
    }
}

export const newsService = new NewsService();
