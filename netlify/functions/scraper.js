/**
 * Simplified Working Scraper - Single Function Approach
 * Based on successful debug patterns, minimal complexity
 */

const https = require('https');
const http = require('http');

// Minimal, focused configuration
const CONFIG = {
  PRODUCTS: [
    // Start with just the most reliable sources
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', category: 'News' },
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', category: 'CRM & Sales' },
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', category: 'Finance' },
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/', category: 'Development' },
    { name: 'Zoho Desk', homepage: 'https://www.zoho.com/desk/', category: 'Support' },
    { name: 'Zoho Mail', homepage: 'https://www.zoho.com/mail/', category: 'Productivity' },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', category: 'Development' },
    { name: 'Zoho People', homepage: 'https://www.zoho.com/people/', category: 'HR' }
  ],
  
  USER_AGENT: 'ZohoBot/1.0',
  REQUEST_DELAY: 800,
  MAX_UPDATES_PER_PRODUCT: 3,
  FETCH_TIMEOUT: 6000,
  MAX_PROCESSING_TIME: 7000 // Stop processing after 7 seconds
};

exports.handler = async (event, context) => {
  // Optimize function settings
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
    console.log('Starting simplified scraper...');
    const startTime = Date.now();
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: [],
      categories: ['News', 'CRM & Sales', 'Finance', 'Support', 'Productivity', 'Development', 'HR'],
      summary: {
        total_products: 0,
        products_with_updates: 0,
        total_updates: 0
      }
    };

    // Process products with strict time management
    for (let i = 0; i < CONFIG.PRODUCTS.length; i++) {
      const product = CONFIG.PRODUCTS[i];
      
      // Stop if we're running out of time
      const elapsed = Date.now() - startTime;
      if (elapsed > CONFIG.MAX_PROCESSING_TIME) {
        console.log(`Time limit reached. Processed ${i}/${CONFIG.PRODUCTS.length} products.`);
        break;
      }
      
      console.log(`Processing ${i+1}/${CONFIG.PRODUCTS.length}: ${product.name}`);
      
      try {
        const productResult = await scrapeProductSimple(product);
        results.products.push(productResult);
        
        if (productResult.updates && productResult.updates.length > 0) {
          results.summary.products_with_updates++;
          results.summary.total_updates += productResult.updates.length;
        }
        
        // Short delay
        if (i < CONFIG.PRODUCTS.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
        
      } catch (error) {
        console.error(`Error with ${product.name}:`, error.message);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: product.category,
          updates: [],
          status: 'error',
          error_message: 'Processing failed'
        });
      }
    }

    results.summary.total_products = results.products.length;
    
    console.log(`Completed in ${Date.now() - startTime}ms. Found ${results.summary.total_updates} updates.`);

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

async function scrapeProductSimple(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: product.category,
    updates_url: product.updates_url || product.homepage,
    updates: [],
    status: 'no_updates_found',
    source_type: product.updates_url ? 'explicit' : 'discovered'
  };

  try {
    // Try the most likely URL
    const urlToTry = product.updates_url || product.homepage;
    const updates = await scrapeUrlSimple(urlToTry, product.name);
    
    if (updates.length > 0) {
      // Simple classification
      const classifiedUpdates = updates.map(update => ({
        ...update,
        type: classifySimple(update.title),
        priority: 'Normal',
        category: product.category
      }));
      
      result.updates = classifiedUpdates.slice(0, CONFIG.MAX_UPDATES_PER_PRODUCT);
      result.status = 'ok';
    }

  } catch (error) {
    result.status = 'error';
    result.error_message = error.message;
  }

  return result;
}

async function scrapeUrlSimple(url, productName) {
  try {
    const html = await fetchUrlSimple(url);
    return parseHtmlSimple(html, url, productName);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return [];
  }
}

function parseHtmlSimple(html, baseUrl, productName) {
  const updates = [];
  
  // Use only the most successful pattern from debug testing
  const headingPattern = /<h[1-4][^>]*>([^<]{15,150})<\/h[1-4]>/gi;
  
  let match;
  let count = 0;
  
  while ((match = headingPattern.exec(html)) !== null && count < 5) {
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
  
  return updates;
}

function isValidTitleSimple(title) {
  if (!title || title.length < 15 || title.length > 150) return false;
  
  const blacklist = ['cookie', 'privacy', 'sign in', 'login', '404', 'error', 'home', 'about'];
  const lowerTitle = title.toLowerCase();
  
  return !blacklist.some(word => lowerTitle.includes(word));
}

function classifySimple(title) {
  const lowerTitle = title.toLowerCase();
  
  if (/\b(new|launch|feature|introducing)\b/i.test(lowerTitle)) return 'New Features';
  if (/\b(improved|enhanced|better|optimized)\b/i.test(lowerTitle)) return 'Improvements';
  if (/\b(fixed|bug|issue|resolved)\b/i.test(lowerTitle)) return 'Bug Fixes';
  if (/\b(security|patch)\b/i.test(lowerTitle)) return 'Security';
  
  return 'General';
}

function fetchUrlSimple(url) {
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
        if (size > 100000) { // Limit to 100KB
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
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}