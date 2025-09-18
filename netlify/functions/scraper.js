/**
 * Optimized Production Scraper - Memory & Time Efficient
 * Reduced scope for better reliability within Netlify function limits
 */

const https = require('https');
const http = require('http');

// Optimized configuration - focus on high-value sources
const CONFIG = {
  PRODUCTS: [
    // High-priority news sources (most content-rich)
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', updates_url: 'https://www.zoho.com/blog/', category: 'News' },
    { name: 'Zoho Community', homepage: 'https://help.zoho.com/portal/en/community', updates_url: 'https://help.zoho.com/portal/en/community', category: 'News' },
    { name: 'Zoho Press Releases', homepage: 'https://www.zoho.com/press.html', updates_url: 'https://www.zoho.com/press.html', category: 'News' },
    
    // Core CRM & Sales (homepage scraping works)
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho SalesIQ', homepage: 'https://www.zoho.com/salesiq/', updates_url: null, category: 'CRM & Sales' },
    
    // Key Finance products
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', updates_url: null, category: 'Finance' },
    { name: 'Zoho Invoice', homepage: 'https://www.zoho.com/invoice/', updates_url: null, category: 'Finance' },
    
    // Important Support products
    { name: 'Zoho Desk', homepage: 'https://www.zoho.com/desk/', updates_url: null, category: 'Support' },
    { name: 'Zoho Assist', homepage: 'https://www.zoho.com/assist/', updates_url: null, category: 'Support' },
    
    // Core Productivity
    { name: 'Zoho Mail', homepage: 'https://www.zoho.com/mail/', updates_url: null, category: 'Productivity' },
    { name: 'Zoho WorkDrive', homepage: 'https://www.zoho.com/workdrive/', updates_url: null, category: 'Productivity' },
    
    // Key Development tools
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/', category: 'Development' },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', updates_url: null, category: 'Development' },
    
    // HR essentials
    { name: 'Zoho People', homepage: 'https://www.zoho.com/people/', updates_url: null, category: 'HR' },
    
    // Other important
    { name: 'Zoho One', homepage: 'https://www.zoho.com/one/', updates_url: null, category: 'Other' }
  ],
  
  USER_AGENT: 'ZohoUpdatesBot/1.0',
  REQUEST_DELAY: 1000, // Reduced delay
  MAX_UPDATES_PER_PRODUCT: 3, // Reduced to save memory
  FETCH_TIMEOUT: 8000, // Reduced timeout
  MAX_HTML_SIZE: 50000 // Limit HTML processing
};

const UPDATE_PATHS = ['/whats-new', '/updates', '/release-notes'];

// Simplified classification patterns
const UPDATE_TYPE_PATTERNS = {
  'New Features': /\b(new|introducing|launch|feature)\b/i,
  'Improvements': /\b(enhanced|improved|better|optimized)\b/i,
  'Bug Fixes': /\b(fixed|resolved|bug|issue)\b/i,
  'Security': /\b(security|patch|vulnerability)\b/i
};

// Main Netlify function handler
exports.handler = async (event, context) => {
  // Set function timeout context
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Starting optimized scrape...');
    const startTime = Date.now();
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: [],
      categories: ['News', 'CRM & Sales', 'Finance', 'Support', 'Productivity', 'Development', 'HR', 'Other'],
      summary: {
        total_products: CONFIG.PRODUCTS.length,
        products_with_updates: 0,
        total_updates: 0
      }
    };

    // Process products with time limits
    for (let i = 0; i < CONFIG.PRODUCTS.length; i++) {
      const product = CONFIG.PRODUCTS[i];
      
      // Check if we're running out of time (Netlify has 10s limit)
      const elapsed = Date.now() - startTime;
      if (elapsed > 8000) { // Stop at 8 seconds to leave buffer
        console.log(`Stopping early due to time limit. Processed ${i}/${CONFIG.PRODUCTS.length} products.`);
        break;
      }
      
      console.log(`Processing ${i+1}/${CONFIG.PRODUCTS.length}: ${product.name}`);
      
      try {
        const productResult = await scrapeProductOptimized(product);
        results.products.push(productResult);
        
        if (productResult.updates && productResult.updates.length > 0) {
          results.summary.products_with_updates++;
          results.summary.total_updates += productResult.updates.length;
        }
        
        // Minimal delay to avoid overwhelming servers
        if (i < CONFIG.PRODUCTS.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
        
      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: product.category || 'Other',
          updates: [],
          status: 'error',
          error_message: 'Processing timeout or error'
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Scraping completed in ${totalTime}ms. Found ${results.summary.total_updates} updates.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: true, 
        message: error.message,
        fetched_at: new Date().toISOString(),
        products: []
      })
    };
  }
};

// Optimized product scraping
async function scrapeProductOptimized(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: product.category || 'Other',
    updates_url: product.updates_url || product.homepage,
    updates: [],
    status: 'error',
    error_message: null,
    source_type: product.updates_url ? 'explicit' : 'discovered'
  };

  try {
    // Skip robots.txt check for speed (assume allowed)
    let allUpdates = [];
    
    // Try the most likely URL first
    const urlToTry = product.updates_url || product.homepage;
    const updates = await scrapeUrlOptimized(urlToTry, product.name);
    allUpdates = allUpdates.concat(updates);
    
    // If no updates and no explicit URL, try one discovery attempt
    if (allUpdates.length === 0 && !product.updates_url) {
      const discoveredUrl = await quickDiscovery(product.homepage);
      if (discoveredUrl) {
        const discoveredUpdates = await scrapeUrlOptimized(discoveredUrl, product.name);
        allUpdates = allUpdates.concat(discoveredUpdates);
        result.updates_url = discoveredUrl;
        result.source_type = 'discovered';
      }
    }
    
    // Process results
    if (allUpdates.length > 0) {
      const classifiedUpdates = allUpdates.map(update => ({
        ...update,
        type: classifyUpdateTypeSimple(update.title),
        priority: 'Normal',
        category: product.category || 'Other'
      }));
      
      result.updates = deduplicateUpdatesSimple(classifiedUpdates).slice(0, CONFIG.MAX_UPDATES_PER_PRODUCT);
      result.status = 'ok';
    } else {
      result.status = 'no_updates_found';
    }

  } catch (error) {
    result.error_message = error.message;
  }

  return result;
}

// Optimized URL scraping
async function scrapeUrlOptimized(url, productName) {
  try {
    const html = await fetchUrlOptimized(url);
    
    // Truncate HTML if too large
    const htmlToProcess = html.length > CONFIG.MAX_HTML_SIZE ? 
      html.substring(0, CONFIG.MAX_HTML_SIZE) : html;
    
    return parseUpdatesOptimized(htmlToProcess, url, productName);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return [];
  }
}

// Optimized HTML parsing - focus on most common patterns
function parseUpdatesOptimized(html, baseUrl, productName) {
  const updates = [];
  
  // Use only the most successful patterns from debug
  const patterns = [
    // Generic headings (worked well for CRM)
    /<h[1-4][^>]*>([^<]{15,150})<\/h[1-4]>/gi,
    // Simple article pattern
    /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,150})<\/h[1-6]>/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    let count = 0;
    
    while ((match = pattern.exec(html)) !== null && count < 5) {
      if (match[1]) {
        const title = match[1].trim();
        if (isValidTitleSimple(title)) {
          updates.push({
            title: title,
            date: new Date().toISOString().split('T')[0],
            summary: `Update from ${productName}`,
            link: baseUrl
          });
          count++;
        }
      }
    }
    
    // Stop after first successful pattern
    if (updates.length > 0) break;
  }
  
  return updates;
}

// Simplified title validation
function isValidTitleSimple(title) {
  if (!title || title.length < 15 || title.length > 200) return false;
  
  const blacklist = ['cookie', 'privacy', 'sign in', 'login', '404', 'error'];
  const lowerTitle = title.toLowerCase();
  
  return !blacklist.some(word => lowerTitle.includes(word));
}

// Simplified update type classification
function classifyUpdateTypeSimple(title) {
  const lowerTitle = title.toLowerCase();
  
  for (const [type, pattern] of Object.entries(UPDATE_TYPE_PATTERNS)) {
    if (pattern.test(lowerTitle)) {
      return type;
    }
  }
  
  return 'General';
}

// Quick discovery - try only the most common paths
async function quickDiscovery(homepage) {
  const baseUrl = getBaseUrl(homepage);
  
  for (const path of UPDATE_PATHS) {
    try {
      const testUrl = baseUrl + path;
      const exists = await testUrlExistsQuick(testUrl);
      if (exists) {
        return testUrl;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// Simplified deduplication
function deduplicateUpdatesSimple(updates) {
  const unique = [];
  const seenTitles = new Set();
  
  for (const update of updates) {
    const key = update.title.toLowerCase().substring(0, 30);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      unique.push(update);
    }
  }
  
  return unique;
}

// Optimized fetch with shorter timeout
function fetchUrlOptimized(url) {
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
      let size = 0;
      
      res.on('data', chunk => {
        size += chunk.length;
        // Limit total download size
        if (size > CONFIG.MAX_HTML_SIZE * 2) {
          req.destroy();
          reject(new Error('Response too large'));
          return;
        }
        data += chunk;
      });
      
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(CONFIG.FETCH_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Quick URL existence check
function testUrlExistsQuick(url) {
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

// Utility functions
function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}