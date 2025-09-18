/**
 * Zoho Product Updates Scraper - Specialized for product-specific updates
 * File: netlify/functions/scraper-products.js
 */

const https = require('https');
const http = require('http');

const CONFIG = {
  PRODUCTS: [
    // CRM & Sales
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho SalesIQ', homepage: 'https://www.zoho.com/salesiq/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho Campaigns', homepage: 'https://www.zoho.com/campaigns/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho Social', homepage: 'https://www.zoho.com/social/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho Motivator', homepage: 'https://www.zoho.com/motivator/', updates_url: null, category: 'CRM & Sales' },
    
    // Finance
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', updates_url: 'https://www.zoho.com/us/books/whats-new.html', category: 'Finance' },
    { name: 'Zoho Invoice', homepage: 'https://www.zoho.com/invoice/', updates_url: null, category: 'Finance' },
    { name: 'Zoho Billing', homepage: 'https://www.zoho.com/billing/', updates_url: null, category: 'Finance' },
    { name: 'Zoho Expense', homepage: 'https://www.zoho.com/expense/', updates_url: null, category: 'Finance' },
    { name: 'Zoho Inventory', homepage: 'https://www.zoho.com/inventory/', updates_url: null, category: 'Finance' },
    { name: 'Zoho Subscriptions', homepage: 'https://www.zoho.com/subscriptions/', updates_url: null, category: 'Finance' },
    
    // Support & Service
    { name: 'Zoho Desk', homepage: 'https://www.zoho.com/desk/', updates_url: 'https://www.zoho.com/desk/release-notes.html', category: 'Support' },
    { name: 'Zoho FSM', homepage: 'https://www.zoho.com/fieldservice/', updates_url: 'https://www.zoho.com/fsm/release-notes.html', category: 'Support' },
    { name: 'Zoho Assist', homepage: 'https://www.zoho.com/assist/', updates_url: null, category: 'Support' },
    { name: 'Zoho Lens', homepage: 'https://www.zoho.com/lens/', updates_url: null, category: 'Support' },
    
    // Development & Analytics
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/', category: 'Development' },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', updates_url: 'https://www.zoho.com/analytics/whats-new/release-notes.html', category: 'Development' },
    { name: 'Zoho Flow', homepage: 'https://www.zoho.com/flow/', updates_url: 'https://www.zoho.com/flow/release-notes/', category: 'Development' },
    { name: 'Zoho Deluge', homepage: 'https://www.zoho.com/deluge/', updates_url: 'https://www.zoho.com/deluge/help/release-notes.html', category: 'Development' },
    { name: 'Zoho Forms', homepage: 'https://www.zoho.com/forms/', updates_url: null, category: 'Development' },
    
    // Other key products
    { name: 'Zoho One', homepage: 'https://www.zoho.com/one/', updates_url: null, category: 'Other' },
    { name: 'Zoho Catalyst', homepage: 'https://catalyst.zoho.com/', updates_url: null, category: 'Development' }
  ],
  
  USER_AGENT: 'ZohoProductsBot/1.0',
  REQUEST_DELAY: 1000,
  MAX_UPDATES_PER_PRODUCT: 4,
  FETCH_TIMEOUT: 8000
};

const UPDATE_PATHS = ['/whats-new', '/updates', '/release-notes', '/changelog'];

const UPDATE_TYPE_PATTERNS = {
  'New Features': /\b(new|introducing|launch|feature|added|released)\b/i,
  'Improvements': /\b(enhanced|improved|better|optimized|upgrade|updated)\b/i,
  'Bug Fixes': /\b(fixed|resolved|bug|issue|corrected|patch)\b/i,
  'Security': /\b(security|vulnerability|secure|authentication)\b/i,
  'API Changes': /\b(API|integration|endpoint|webhook|developer)\b/i
};

const PRIORITY_PATTERNS = {
  'Critical': /\b(critical|urgent|security|vulnerability)\b/i,
  'Major': /\b(major|significant|release|version|launch)\b/i
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
    console.log('Starting product updates scrape...');
    const startTime = Date.now();
    
    const results = {
      fetched_at: new Date().toISOString(),
      source_type: 'products',
      products: [],
      categories: [...new Set(CONFIG.PRODUCTS.map(p => p.category))],
      summary: {
        total_products: CONFIG.PRODUCTS.length,
        products_with_updates: 0,
        total_updates: 0,
        by_category: {}
      }
    };

    for (let i = 0; i < CONFIG.PRODUCTS.length; i++) {
      const product = CONFIG.PRODUCTS[i];
      
      // Time management
      const elapsed = Date.now() - startTime;
      if (elapsed > 8500) {
        console.log(`Stopping early due to time limit. Processed ${i}/${CONFIG.PRODUCTS.length} products.`);
        break;
      }
      
      console.log(`Processing product ${i+1}/${CONFIG.PRODUCTS.length}: ${product.name}`);
      
      try {
        const productResult = await scrapeProduct(product);
        results.products.push(productResult);
        
        // Update statistics
        if (productResult.updates && productResult.updates.length > 0) {
          results.summary.products_with_updates++;
          results.summary.total_updates += productResult.updates.length;
        }
        
        // Category statistics
        const category = productResult.category;
        if (!results.summary.by_category[category]) {
          results.summary.by_category[category] = { products: 0, updates: 0 };
        }
        results.summary.by_category[category].products++;
        results.summary.by_category[category].updates += productResult.updates ? productResult.updates.length : 0;
        
        if (i < CONFIG.PRODUCTS.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
        
      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: product.category,
          updates: [],
          status: 'error',
          error_message: error.message
        });
      }
    }

    console.log(`Product scrape completed. Found ${results.summary.total_updates} updates across ${results.summary.products_with_updates} products.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Products function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: true, 
        message: error.message,
        source_type: 'products',
        products: []
      })
    };
  }
};

async function scrapeProduct(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: product.category,
    updates_url: product.updates_url || null,
    updates: [],
    status: 'error',
    error_message: null,
    source_type: product.updates_url ? 'explicit' : 'discovered'
  };

  try {
    // Skip robots.txt check for speed
    let allUpdates = [];
    let updatesUrl = product.updates_url;
    
    // Try explicit URL first
    if (updatesUrl) {
      const updates = await scrapeProductUrl(updatesUrl, product.name);
      allUpdates = allUpdates.concat(updates);
      result.updates_url = updatesUrl;
    }
    
    // If no explicit URL or no updates found, try discovery
    if (!updatesUrl || allUpdates.length === 0) {
      updatesUrl = await discoverUpdatesUrl(product.homepage);
      
      if (updatesUrl) {
        result.updates_url = updatesUrl;
        result.source_type = 'discovered';
        const discoveredUpdates = await scrapeProductUrl(updatesUrl, product.name);
        allUpdates = allUpdates.concat(discoveredUpdates);
      }
    }
    
    // If still no updates, try homepage scraping
    if (allUpdates.length === 0) {
      result.updates_url = product.homepage;
      const homepageUpdates = await scrapeProductUrl(product.homepage, product.name);
      allUpdates = allUpdates.concat(homepageUpdates);
    }
    
    // Process and classify updates
    if (allUpdates.length > 0) {
      const classifiedUpdates = allUpdates.map(update => ({
        ...update,
        type: classifyUpdateType(update.title, update.summary),
        priority: classifyPriority(update.title, update.summary),
        category: product.category
      }));
      
      const uniqueUpdates = deduplicateUpdates(classifiedUpdates);
      result.updates = uniqueUpdates.slice(0, CONFIG.MAX_UPDATES_PER_PRODUCT);
      result.status = 'ok';
    } else {
      result.status = 'no_updates_found';
      result.error_message = 'No updates found on any checked pages';
    }

  } catch (error) {
    result.error_message = error.message;
  }

  return result;
}

async function scrapeProductUrl(url, productName) {
  try {
    const html = await fetchUrl(url);
    return parseProductUpdates(html, url, productName);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return [];
  }
}

function parseProductUpdates(html, baseUrl, productName) {
  const updates = [];
  
  // Product-specific patterns for release notes and updates
  const productPatterns = [
    // Release notes patterns
    /<(?:div|section)[^>]*class[^>]*(?:release|update|changelog|version)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
    /<(?:li|div)[^>]*class[^>]*(?:update|version|release)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
    
    // Version-specific patterns
    /<h[1-6][^>]*>([^<]*(?:version|v\d+|\d+\.\d+|release|update)[^<]*)<\/h[1-6]>/gi,
    
    // Generic product page headings (worked well in debug)
    /<h[1-4][^>]*>([^<]{20,180})<\/h[1-4]>/gi,
    
    // Article patterns
    /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi
  ];
  
  for (const pattern of productPatterns) {
    let match;
    let patternMatches = 0;
    
    while ((match = pattern.exec(html)) !== null && patternMatches < 8) {
      if (match[1]) {
        const title = match[1].trim();
        if (isValidProductTitle(title)) {
          const contextStart = Math.max(0, match.index - 300);
          const contextEnd = Math.min(html.length, match.index + 400);
          const context = html.substring(contextStart, contextEnd);
          
          const update = {
            title: title,
            date: extractDateFromContext(context) || new Date().toISOString().split('T')[0],
            summary: extractProductSummary(context, title, productName),
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

function isValidProductTitle(title) {
  if (!title || title.length < 15 || title.length > 250) return false;
  
  const blacklist = [
    'cookie', 'privacy', 'terms', 'sign in', 'sign up', 'login', 'register',
    'home', 'about', 'contact', 'help', 'support', '404', 'error', 'navigation'
  ];
  
  const lowerTitle = title.toLowerCase();
  return !blacklist.some(word => lowerTitle.includes(word));
}

function extractProductSummary(context, title, productName) {
  const textContent = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutTitle = textContent.replace(title, '').trim();
  
  // Look for description-like content
  const sentences = withoutTitle.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences[0] && sentences[0].length > 20) {
    let summary = sentences[0].trim();
    if (summary.length > 160) {
      summary = summary.substring(0, 160) + '...';
    }
    return summary;
  }
  
  return `Update from ${productName}`;
}

function classifyUpdateType(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  
  const scores = {};
  
  for (const [type, pattern] of Object.entries(UPDATE_TYPE_PATTERNS)) {
    if (pattern.test(text)) {
      scores[type] = (scores[type] || 0) + 1;
    }
  }
  
  // Return the type with highest score, or 'General' if no matches
  const maxScore = Math.max(...Object.values(scores), 0);
  if (maxScore === 0) return 'General';
  
  return Object.keys(scores).find(type => scores[type] === maxScore);
}

function classifyPriority(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  
  for (const [priority, pattern] of Object.entries(PRIORITY_PATTERNS)) {
    if (pattern.test(text)) {
      return priority;
    }
  }
  
  return 'Normal';
}

async function discoverUpdatesUrl(homepage) {
  const baseUrl = getBaseUrl(homepage);
  
  for (const path of UPDATE_PATHS) {
    try {
      const testUrl = baseUrl + path;
      const exists = await testUrlExists(testUrl);
      if (exists) {
        return testUrl;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

function extractDateFromContext(context) {
  const datePatterns = [
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i
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

function testUrlExists(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}