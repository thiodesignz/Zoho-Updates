/**
 * Zoho News Sources Scraper - Specialized for news content
 * File: netlify/functions/scraper-news.js
 */

const https = require('https');
const http = require('http');

const CONFIG = {
  PRODUCTS: [
    // All your requested news sources
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', updates_url: 'https://www.zoho.com/blog/', category: 'News' },
    { name: 'Zoho Community', homepage: 'https://help.zoho.com/portal/en/community', updates_url: 'https://help.zoho.com/portal/en/community', category: 'News' },
    { name: 'Zoho Press Releases', homepage: 'https://www.zoho.com/press.html', updates_url: 'https://www.zoho.com/press.html', category: 'News' },
    { name: 'Zoho In The News', homepage: 'https://www.zoho.com/inthenews.html', updates_url: 'https://www.zoho.com/inthenews.html', category: 'News' },
    { name: 'Zoho Newsletter', homepage: 'https://www.zoho.com/newsletter.html', updates_url: 'https://www.zoho.com/newsletter.html', category: 'News' },
    { name: 'Zoho Creator Community News', homepage: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', updates_url: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', category: 'News' },
    { name: 'Zoho News Details', homepage: 'https://www.zoho.com/inthenews-detail.html', updates_url: 'https://www.zoho.com/inthenews-detail.html', category: 'News' },
    { name: 'Zoho Influence News', homepage: 'https://www.zoho.com/r/influence/in-the-news', updates_url: 'https://www.zoho.com/r/influence/in-the-news', category: 'News' }
  ],
  
  USER_AGENT: 'ZohoNewsBot/1.0',
  REQUEST_DELAY: 1200,
  MAX_UPDATES_PER_PRODUCT: 5,
  FETCH_TIMEOUT: 10000
};

const UPDATE_TYPE_PATTERNS = {
  'New Features': /\b(new|introducing|launch|feature|announcing)\b/i,
  'Improvements': /\b(enhanced|improved|better|optimized|upgrade)\b/i,
  'Bug Fixes': /\b(fixed|resolved|bug|issue|patch)\b/i,
  'Security': /\b(security|vulnerability|secure)\b/i,
  'Press Release': /\b(press|release|announcement|partnership|acquisition)\b/i
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Starting news sources scrape...');
    const startTime = Date.now();
    
    const results = {
      fetched_at: new Date().toISOString(),
      source_type: 'news',
      products: [],
      summary: {
        total_sources: CONFIG.PRODUCTS.length,
        sources_with_updates: 0,
        total_updates: 0
      }
    };

    for (let i = 0; i < CONFIG.PRODUCTS.length; i++) {
      const product = CONFIG.PRODUCTS[i];
      
      // Time management
      const elapsed = Date.now() - startTime;
      if (elapsed > 8000) {
        console.log(`Stopping early due to time limit. Processed ${i}/${CONFIG.PRODUCTS.length} sources.`);
        break;
      }
      
      console.log(`Processing news source ${i+1}/${CONFIG.PRODUCTS.length}: ${product.name}`);
      
      try {
        const productResult = await scrapeNewsSource(product);
        results.products.push(productResult);
        
        if (productResult.updates && productResult.updates.length > 0) {
          results.summary.sources_with_updates++;
          results.summary.total_updates += productResult.updates.length;
        }
        
        if (i < CONFIG.PRODUCTS.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
        
      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: 'News',
          updates: [],
          status: 'error',
          error_message: error.message
        });
      }
    }

    console.log(`News scrape completed. Found ${results.summary.total_updates} news items.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('News function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: true, 
        message: error.message,
        source_type: 'news',
        products: []
      })
    };
  }
};

async function scrapeNewsSource(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: 'News',
    updates_url: product.updates_url || product.homepage,
    updates: [],
    status: 'error',
    source_type: 'explicit'
  };

  try {
    const urlToScrape = product.updates_url || product.homepage;
    const updates = await scrapeNewsUrl(urlToScrape, product.name);
    
    if (updates.length > 0) {
      const classifiedUpdates = updates.map(update => ({
        ...update,
        type: classifyNewsType(update.title, update.summary),
        priority: classifyNewsPriority(update.title),
        category: 'News'
      }));
      
      result.updates = deduplicateUpdates(classifiedUpdates).slice(0, CONFIG.MAX_UPDATES_PER_PRODUCT);
      result.status = 'ok';
    } else {
      result.status = 'no_updates_found';
    }

  } catch (error) {
    result.error_message = error.message;
  }

  return result;
}

async function scrapeNewsUrl(url, sourceName) {
  try {
    const html = await fetchUrl(url);
    return parseNewsContent(html, url, sourceName);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return [];
  }
}

function parseNewsContent(html, baseUrl, sourceName) {
  const updates = [];
  
  // News-specific patterns optimized for different Zoho news sources
  const newsPatterns = [
    // Blog patterns
    /<article[^>]*class[^>]*post[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi,
    /<div[^>]*class[^>]*blog-post[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>/gi,
    
    // Press release patterns
    /<div[^>]*class[^>]*press[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi,
    /<li[^>]*class[^>]*news-item[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi,
    
    // Community patterns
    /<div[^>]*class[^>]*topic[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
    /<tr[^>]*class[^>]*topic[^>]*>[\s\S]*?<a[^>]*>([^<]{15,200})<\/a>/gi,
    
    // Newsletter patterns
    /<div[^>]*class[^>]*newsletter[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
    
    // Generic news patterns
    /<div[^>]*class[^>]*news[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
    /<h[1-4][^>]*>([^<]{20,180})<\/h[1-4]>/gi
  ];
  
  for (const pattern of newsPatterns) {
    let match;
    let patternMatches = 0;
    
    while ((match = pattern.exec(html)) !== null && patternMatches < 10) {
      if (match[1]) {
        const title = match[1].trim();
        if (isValidNewsTitle(title)) {
          const contextStart = Math.max(0, match.index - 400);
          const contextEnd = Math.min(html.length, match.index + 600);
          const context = html.substring(contextStart, contextEnd);
          
          const update = {
            title: title,
            date: extractDateFromContext(context) || new Date().toISOString().split('T')[0],
            summary: extractNewsySummary(context, title, sourceName),
            link: extractLinkFromContext(context, baseUrl)
          };
          
          updates.push(update);
          patternMatches++;
        }
      }
    }
    
    // Stop after first successful pattern to avoid duplicates
    if (updates.length > 0) break;
  }
  
  return updates;
}

function isValidNewsTitle(title) {
  if (!title || title.length < 15 || title.length > 300) return false;
  
  const blacklist = [
    'cookie', 'privacy', 'terms', 'sign in', 'sign up', 'login', 'register',
    'home', 'about', 'contact', 'help', 'support', '404', 'error', 'search'
  ];
  
  const lowerTitle = title.toLowerCase();
  return !blacklist.some(word => lowerTitle.includes(word));
}

function extractNewsySummary(context, title, sourceName) {
  const textContent = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutTitle = textContent.replace(title, '').trim();
  
  // Look for summary-like content
  const sentences = withoutTitle.split(/[.!?]+/).filter(s => s.trim().length > 25);
  
  if (sentences[0] && sentences[0].length > 25) {
    let summary = sentences[0].trim();
    if (summary.length > 180) {
      summary = summary.substring(0, 180) + '...';
    }
    return summary;
  }
  
  // Fallback summary based on source
  if (sourceName.includes('Blog')) return 'Latest blog post from Zoho';
  if (sourceName.includes('Press')) return 'Official press release from Zoho';
  if (sourceName.includes('Community')) return 'Community discussion and updates';
  if (sourceName.includes('News')) return 'Zoho in the news coverage';
  
  return 'Recent news from Zoho';
}

function classifyNewsType(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  
  for (const [type, pattern] of Object.entries(UPDATE_TYPE_PATTERNS)) {
    if (pattern.test(text)) {
      return type;
    }
  }
  
  return 'News';
}

function classifyNewsPriority(title) {
  const lowerTitle = title.toLowerCase();
  
  if (/\b(breaking|urgent|important|major|significant)\b/i.test(lowerTitle)) {
    return 'Major';
  }
  
  if (/\b(acquisition|partnership|funding|launch|release)\b/i.test(lowerTitle)) {
    return 'Major';
  }
  
  return 'Normal';
}

function extractDateFromContext(context) {
  const datePatterns = [
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i,
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = context.match(pattern);
    if (match) {
      try {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

function extractLinkFromContext(context, fallbackUrl) {
  const linkMatch = context.match(/<a[^>]+href=["']([^"']+)["']/i);
  if (linkMatch && linkMatch[1]) {
    let href = linkMatch[1];
    
    if (href.startsWith('/')) {
      const baseUrl = getBaseUrl(fallbackUrl);
      href = baseUrl + href;
    } else if (!href.startsWith('http')) {
      href = fallbackUrl;
    }
    
    if (href.includes('zoho.com') && !href.includes('javascript:')) {
      return href;
    }
  }
  
  return fallbackUrl;
}

function deduplicateUpdates(updates) {
  const unique = [];
  const seenTitles = new Set();
  
  for (const update of updates) {
    const normalizedTitle = update.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!seenTitles.has(normalizedTitle) && normalizedTitle.length > 10) {
      seenTitles.add(normalizedTitle);
      unique.push(update);
    }
  }
  
  return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      headers: { 'User-Agent': CONFIG.USER_AGENT }
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(CONFIG.FETCH_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}