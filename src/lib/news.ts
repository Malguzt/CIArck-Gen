import { XMLParser } from 'fast-xml-parser';

export interface TrendItem {
    title: string;
    link: string;
    pubDate: string;
    description?: string;
    source?: string;
    context?: string;
    category?: string;
}

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_NEWS_BASE_URL = 'https://news.google.com/rss/search';

const GLOBAL_TRAVEL_REMOTE_CATEGORIES = [
    { label: 'Travel', query: 'travel industry OR tourism trends OR travel demand' },
    { label: 'Remote Work', query: 'remote work OR work from anywhere OR distributed teams' },
    { label: 'Insurance', query: 'travel insurance OR health insurance for expats OR international coverage' },
    { label: 'Technology', query: 'travel technology OR ai for travel OR digital tools for nomads' },
    { label: 'Migration Law', query: 'immigration law updates OR visa policy changes OR border rules' },
    { label: 'Destinations', query: 'top destinations OR emerging destinations OR tourism recovery' },
    { label: 'Tourism Events', query: 'tourism event OR travel expo OR international tourism fair' },
    { label: 'Digital Nomads', query: 'digital nomad visa OR nomad communities OR remote worker relocation' },
];

export class NewsService {

    async getTrends(): Promise<TrendItem[]> {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

        try {
            const feedResults = await Promise.all(
                GLOBAL_TRAVEL_REMOTE_CATEGORIES.map(async ({ label, query }) => {
                    const rssUrl = `${GOOGLE_NEWS_BASE_URL}?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
                    const response = await fetch(rssUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch category ${label}: ${response.status} ${response.statusText}`);
                    }

                    const xmlData = await response.text();
                    const jObj = parser.parse(xmlData);
                    const items = jObj.rss?.channel?.item;
                    if (!items) return [] as TrendItem[];

                    const parsedItems = (Array.isArray(items) ? items : [items])
                        .slice(0, 12)
                        .map((item: any) => ({
                            title: item.title || '',
                            link: item.link || '#',
                            pubDate: item.pubDate || new Date().toUTCString(),
                            description: item.description || '',
                            source: typeof item.source === 'string' ? item.source : item.source?.['#text'] || 'Google News',
                            category: label,
                        }))
                        .filter((item: TrendItem) => Boolean(item.title && item.link));

                    return parsedItems;
                })
            );

            const allItems = feedResults.flat();
            const uniqueMap = new Map<string, TrendItem>();

            for (const item of allItems) {
                const key = `${item.title.toLowerCase()}|${item.link}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, item);
                }
            }

            return Array.from(uniqueMap.values())
                .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
                .slice(0, 80);

        } catch (error) {
            console.warn('Failed to fetch categorized global news, using fallback data:', error);
            // Fallback data so the UI doesn't look empty
            return [
                {
                    title: "Artificial Intelligence",
                    link: "https://trends.google.com/trends/explore?q=Artificial+Intelligence",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data",
                    category: "Technology"
                },
                {
                    title: "Digital Nomad Visas",
                    link: "https://news.google.com/search?q=digital+nomad+visa",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data",
                    category: "Digital Nomads"
                },
                {
                    title: "Global Tourism Recovery",
                    link: "https://news.google.com/search?q=global+tourism+recovery",
                    pubDate: new Date().toUTCString(),
                    source: "Fallback Data",
                    category: "Travel"
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
