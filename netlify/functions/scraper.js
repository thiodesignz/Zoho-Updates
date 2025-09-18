/**
 * DEBUG VERSION - Enhanced Netlify Function with Detailed Logging
 * This version will help us understand why updates aren't being found
 */

const https = require('https');
const http = require('http');

// Test with a smaller, focused set first
const CONFIG = {
  PRODUCTS: [
    // Test with known working sources first
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', updates_url: 'https://www.zoho.com/blog/', category: 'News' },
    { name: 'Zoho CRM - Homepage Test', homepage: 'https://www.zoho.com/crm/', updates_url: null, category: 'CRM & Sales' },
    { name: 'Zoho CRM - Updates Page', homepage: 'https://www.zoho.com/crm/', updates_url: 'https://www.zoho.com/crm/whats-new/', category: 'CRM & Sales' },
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/', category: 'Development' },
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', updates_url: 'https://www.zoho.com/us/books/whats-new.html', category: 'Finance' }
  ],
  
  USER_AGENT: 'ZohoUpdatesBot/1.0',
  REQUEST_DELAY: 2000, // Increased delay
  MAX_UPDATES_PER_PRODUCT: 5
};

const UPDATE_PATHS = ['/whats-new', '/whatsnew', '/updates', '/release-notes', '/changelog', '/blog', '/news'];

// Main Netlify function handler
exports.handler = async (event, context) => {
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
    console.log('=== DEBUG SCRAPER STARTED ===');
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: [],
      debug_info: {
        total_processed: 0,
        successful_scrapes: 0,
        failed_scrapes: 0,
        details: []
      }
    };

    // Process each product with detailed logging
    for (let i = 0; i < CONFIG.PRODUCTS.length; i++) {
      const product = CONFIG.PRODUCTS[i];
      console.log(`\n--- Processing ${i+1}/${CONFIG.PRODUCTS.length}: ${product.name} ---`);
      
      try {
        const productResult = await scrapeProductWithDebug(product);
        results.products.push(productResult);
        results.debug_info.total_processed++;
        
        if (productResult.updates && productResult.updates.length > 0) {
          results.debug_info.successful_scrapes++;
        } else {
          results.debug_info.failed_scrapes++;
        }
        
        results.debug_info.details.push({
          product: product.name,
          status: productResult.status,
          updates_found: productResult.updates ? productResult.updates.length : 0,
          error: productResult.error_message || null
        });
        
        // Rate limiting
        if (i < CONFIG.PRODUCTS.length - 1) {
          console.log(`Waiting ${CONFIG.REQUEST_DELAY}ms before next request...`);
          await sleep(CONFIG.REQUEST_DELAY);
        }
        
      } catch (error) {
        console.error(`ERROR processing ${product.name}:`, error);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: product.category || 'Other',
          updates: [],
          status: 'error',
          error_message: error.message
        });
        results.debug_info.failed_scrapes++;
      }
    }

    console.log('\n=== SCRAPING SUMMARY ===');
    console.log(`Total processed: ${results.debug_info.total_processed}`);
    console.log(`Successful: ${results.debug_info.successful_scrapes}`);
    console.log(`Failed: ${results.debug_info.failed_scrapes}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('FUNCTION ERROR:', error);
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

// Enhanced scraping with debug information
async function scrapeProductWithDebug(product) {
  console.log(`Scraping: ${product.name}`);
  console.log(`Homepage: ${product.homepage}`);
  console.log(`Updates URL: ${product.updates_url || 'null (will auto-discover)'}`);
  
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: product.category || 'Other',
    updates_url: product.updates_url || null,
    updates: [],
    status: 'error',
    error_message: null,
    source_type: product.updates_url ? 'explicit' : 'discovered',
    debug_info: {
      robots_checked: false,
      robots_blocked: false,
      urls_tried: [],
      html_length: 0,
      patterns_matched: 0
    }
  };

  try {
    const baseUrl = getBaseUrl(product.homepage);
    console.log(`Base URL: ${baseUrl}`);
    
    // Check robots.txt
    console.log('Checking robots.txt...');
    const robotsBlocked = await isBlockedByRobots(baseUrl);
    result.debug_info.robots_checked = true;
    result.debug_info.robots_blocked = robotsBlocked;
    
    if (robotsBlocked) {
      console.log('❌ Blocked by robots.txt');
      result.status = 'source_blocked_by_robots';
      return result;
    }
    console.log('✅ Robots.txt allows scraping');

    let allUpdates = [];
    let updatesUrl = product.updates_url;
    
    // Try explicit URL first
    if (updatesUrl) {
      console.log(`Trying explicit URL: ${updatesUrl}`);
      result.debug_info.urls_tried.push(updatesUrl);
      const updates = await scrapeUrlWithDebug(updatesUrl, product.name, result.debug_info);
      allUpdates = allUpdates.concat(updates);
      result.updates_url = updatesUrl;
    }
    
    // If no explicit URL or no updates found, try discovery
    if (!updatesUrl || allUpdates.length === 0) {
      console.log('Trying auto-discovery...');
      updatesUrl = await discoverUpdatesUrl(product.homepage, result.debug_info);
      
      if (updatesUrl) {
        console.log(`✅ Discovered updates URL: ${updatesUrl}`);
        result.updates_url = updatesUrl;
        result.source_type = 'discovered';
        const discoveredUpdates = await scrapeUrlWithDebug(updatesUrl, product.name, result.debug_info);
        allUpdates = allUpdates.concat(discoveredUpdates);
      } else {
        console.log('❌ No updates URL discovered');
      }
    }
    
    // If still no updates, try scraping the homepage directly
    if (allUpdates.length === 0) {
      console.log('Trying homepage scraping...');
      result.updates_url = product.homepage;
      result.debug_info.urls_tried.push(product.homepage);
      const homepageUpdates = await scrapeUrlWithDebug(product.homepage, product.name, result.debug_info);
      allUpdates = allUpdates.concat(homepageUpdates);
    }
    
    // Process results
    if (allUpdates.length > 0) {
      console.log(`✅ Found ${allUpdates.length} updates`);
      const uniqueUpdates = deduplicateUpdates(allUpdates);
      result.updates = uniqueUpdates.slice(0, CONFIG.MAX_UPDATES_PER_PRODUCT);
      result.status = 'ok';
      
      // Log sample update
      if (result.updates[0]) {
        console.log(`Sample update: "${result.updates[0].title}"`);
      }
    } else {
      console.log('❌ No updates found');
      result.status = 'no_updates_found';
      result.error_message = 'No updates found on any checked pages';
    }

  } catch (error) {
    console.error(`Scraping error for ${product.name}:`, error);
    result.error_message = error.message;
  }

  return result;
}

// Enhanced URL scraping with debug info
async function scrapeUrlWithDebug(url, productName, debugInfo) {
  try {
    console.log(`Fetching: ${url}`);
    const html = await fetchUrl(url, 15000);
    debugInfo.html_length = html.length;
    console.log(`HTML length: ${html.length} characters`);
    
    if (html.length < 100) {
      console.log('⚠️ HTML content is very short, might be empty or error page');
      return [];
    }
    
    // Log a sample of the HTML to see what we're working with
    const htmlSample = html.substring(0, 500).replace(/\s+/g, ' ');
    console.log(`HTML sample: ${htmlSample}...`);
    
    const updates = parseUpdatesWithDebug(html, url, productName, debugInfo);
    console.log(`Parsed ${updates.length} updates from this URL`);
    
    return updates;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return [];
  }
}

// Enhanced HTML parsing with debug info
function parseUpdatesWithDebug(html, baseUrl, productName, debugInfo) {
  const updates = [];
  let patternsMatched = 0;
  
  console.log('Trying different parsing patterns...');
  
  // Strategy 1: Look for common update patterns
  const updatePatterns = [
    // Release notes patterns
    { name: 'Release Notes', pattern: /<(?:div|section|article)[^>]*class[^>]*(?:release|update|changelog)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi },
    // Blog post patterns
    { name: 'Blog Posts', pattern: /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi },
    // News patterns
    { name: 'News Items', pattern: /<(?:div|li)[^>]*class[^>]*(?:news|item|post)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi },
    // Generic heading patterns
    { name: 'Generic Headings', pattern: /<h[1-4][^>]*>([^<]{20,180})<\/h[1-4]>/gi }
  ];
  
  for (const patternInfo of updatePatterns) {
    console.log(`Trying pattern: ${patternInfo.name}`);
    let match;
    let matchCount = 0;
    
    while ((match = patternInfo.pattern.exec(html)) !== null && updates.length < 10) {
      if (match[1]) {
        const title = match[1].trim();
        if (isValidTitle(title)) {
          matchCount++;
          patternsMatched++;
          
          const update = {
            title: title,
            date: extractDateFromContext(html, match.index) || new Date().toISOString().split('T')[0],
            summary: `Update from ${productName}`,
            link: baseUrl
          };
          
          updates.push(update);
          console.log(`  ✅ Found: "${title.substring(0, 50)}..."`);
        }
      }
    }
    
    console.log(`  Pattern "${patternInfo.name}" found ${matchCount} matches`);
    if (matchCount > 0) break; // Stop after first successful pattern
  }
  
  debugInfo.patterns_matched = patternsMatched;
  
  if (updates.length === 0) {
    console.log('❌ No updates found with any pattern');
    // Try to find ANY headings for debugging
    const anyHeadings = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    console.log(`Found ${anyHeadings.length} total headings on page`);
    if (anyHeadings.length > 0) {
      console.log(`Sample headings: ${anyHeadings.slice(0, 3).map(h => h.replace(/<[^>]+>/g, '')).join(', ')}`);
    }
  }
  
  return deduplicateUpdates(updates);
}

// Validate if a title looks like a real update
function isValidTitle(title) {
  if (!title || title.length < 10 || title.length > 300) return false;
  
  // Filter out common non-update content
  const blacklist = [
    'cookie', 'privacy', 'terms', 'sign in', 'sign up', 'login', 'register',
    'home', 'about', 'contact', 'help', 'support', '404', 'error', 'page not found'
  ];
  
  const lowerTitle = title.toLowerCase();
  return !blacklist.some(word => lowerTitle.includes(word));
}

// Extract date from surrounding context
function extractDateFromContext(html, position) {
  const contextStart = Math.max(0, position - 300);
  const contextEnd = Math.min(html.length, position + 300);
  const context = html.substring(contextStart, contextEnd);
  
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

// Discover updates URL with debug info
async function discoverUpdatesUrl(homepage, debugInfo) {
  const baseUrl = getBaseUrl(homepage);
  
  for (const path of UPDATE_PATHS) {
    try {
      const testUrl = baseUrl + path;
      console.log(`Testing discovery URL: ${testUrl}`);
      debugInfo.urls_tried.push(testUrl);
      
      const exists = await testUrlExists(testUrl);
      if (exists) {
        console.log(`✅ Found updates page: ${testUrl}`);
        return testUrl;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// Check robots.txt
async function isBlockedByRobots(baseUrl) {
  try {
    const robotsText = await fetchUrl(baseUrl + '/robots.txt', 5000);
    const lines = robotsText.split('\n');
    let inUserAgentSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.substring(11).trim();
        inUserAgentSection = (agent === '*');
      } else if (inUserAgentSection && trimmed.startsWith('disallow:')) {
        const path = trimmed.substring(9).trim();
        if (path === '/' || path === '') {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Deduplicate updates
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

// Utility functions
function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, timeout = 12000) {
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
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function testUrlExists(url, timeout = 5000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}