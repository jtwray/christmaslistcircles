interface ScrapedData {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('Failed to scrape URL');
    }
    return await response.json();
  } catch (error) {
    console.error('Error scraping URL:', error);
    throw error;
  }
}
