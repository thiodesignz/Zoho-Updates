/**
 * Enhanced Netlify Function - Always Shows Last Available Update
 * This version tries harder to find content and shows the most recent update found
 */

const https = require('https');
const http = require('http');

// Configuration with explicit URLs found in research
const CONFIG = {
  PRODUCTS: [
    // CRM & Sales
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', updates_url: 'https://www.zoho.com/crm/whats-new/release-notes.html' },
    { name: 'Zoho SalesIQ', homepage: 'https://www.zoho.com/salesiq/', updates_url: null },
    { name: 'Zoho Campaigns', homepage: 'https://www.zoho.com/campaigns/', updates_url: null },
    
    // Finance
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', updates_url: 'https://www.zoho.com/us/books/whats-new.html' },
    { name: 'Zoho Invoice', homepage: 'https://www.zoho.com/invoice/', updates_url: null },
    { name: 'Zoho Billing', homepage: 'https://www.zoho.com/billing/', updates_url: null },
    { name: 'Zoho Expense', homepage: 'https://www.zoho.com/expense/', updates_url: null },
    { name: 'Zoho Inventory', homepage: 'https://www.zoho.com/inventory/', updates_url: null },
    { name: 'Zoho Subscriptions', homepage: 'https://www.zoho.com/subscriptions/', updates_url: null },
    
    // Support & Service  
    { name: 'Zoho Desk', homepage: 'https://www.zoho.com/desk/', updates_url: 'https://www.zoho.com/desk/release-notes.html' },
    { name: 'Zoho FSM', homepage: 'https://www.zoho.com/fieldservice/', updates_url: 'https://www.zoho.com/fsm/release-notes.html' },
    { name: 'Zoho Assist', homepage: 'https://www.zoho.com/assist/', updates_url: null },
    { name: 'Zoho Lens', homepage: 'https://www.zoho.com/lens/', updates_url: null },
    
    // Productivity & Collaboration  
    { name: 'Zoho Mail', homepage: 'https://www.zoho.com/mail/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho WorkDrive', homepage: 'https://www.zoho.com/workdrive/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho Writer', homepage: 'https://www.zoho.com/writer/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho Sheet', homepage: 'https://www.zoho.com/sheet/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho Show', homepage: 'https://www.zoho.com/show/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho Cliq', homepage: 'https://www.zoho.com/cliq/', updates_url: 'https://www.zoho.com/workplace/whats-new.html' },
    { name: 'Zoho Connect', homepage: 'https://www.zoho.com/connect/', updates_url: null },
    { name: 'Zoho Projects', homepage: 'https://www.zoho.com/projects/', updates_url: null },
    { name: 'Zoho Meeting', homepage: 'https://www.zoho.com/meeting/', updates_url: null },
    { name: 'Zoho Docs', homepage: 'https://www.zoho.com/docs/', updates_url: null },
    
    // Development & Analytics
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/' },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', updates_url: 'https://www.zoho.com/analytics/whats-new/release-notes.html' },
    { name: 'Zoho Flow', homepage: 'https://www.zoho.com/flow/', updates_url: 'https://www.zoho.com/flow/release-notes/' },
    { name: 'Zoho Deluge', homepage: 'https://www.zoho.com/deluge/', updates_url: 'https://www.zoho.com/deluge/help/release-notes.html' },
    { name: 'Zoho Forms', homepage: 'https://www.zoho.com/forms/', updates_url: null },
    
    // Business Operations
    { name: 'Zoho People', homepage: 'https://www.zoho.com/people/', updates_url: null },
    { name: 'Zoho Recruit', homepage: 'https://www.zoho.com/recruit/', updates_url: null },
    { name: 'Zoho Payroll', homepage: 'https://www.zoho.com/payroll/', updates_url: null },
    { name: 'Zoho Bookings', homepage: 'https://www.zoho.com/bookings/', updates_url: 'https://www.zoho.com/bookings/help/release-notes.html' },
    { name: 'Zoho Sign', homepage: 'https://www.zoho.com/sign/', updates_url: null },
    
    // Marketing & Web
    { name: 'Zoho Sites', homepage: 'https://www.zoho.com/sites/', updates_url: null },
    { name: 'Zoho Social', homepage: 'https://www.zoho.com/social/', updates_url: null },
    { name: 'Zoho Survey', homepage: 'https://www.zoho.com/survey/', updates_url: null },
    { name: 'Zoho PageSense', homepage: 'https://www.zoho.com/pagesense/', updates_url: null },
    { name: 'Zoho Backstage', homepage: 'https://www.zoho.com/backstage/', updates_url: null },
    
    // Mobile & Utilities
    { name: 'Zoho Notebook', homepage: 'https://www.zoho.com/notebook/', updates_url: null },
    { name: 'Zoho Vault', homepage: 'https://www.zoho.com/vault/', updates_url: null },
    { name: 'Zoho ShowTime', homepage: 'https://www.zoho.com/showtime/', updates_url: null },
    
    // Specialized
    { name: 'Zoho One', homepage: 'https://www.zoho.com/one/', updates_url: null },
    { name: 'Zoho Catalyst', homepage: 'https://catalyst.zoho.com/', updates_url: null }
  ],
  
  USER_AGENT: 'ZohoUpdatesBot/1.0',
  REQUEST_DELAY: 2000,
  MAX_UPDATES_PER_PRODUCT: 5
};

const UPDATE_PATHS = ['/whats-new', '/whatsnew', '/updates', '/release-notes', '/release-notes/', '/changelog', '/blog'];

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
    console.log('Starting enhanced scrape...');
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: []
    };

    // Process products (limit for function timeout)
    const productsToProcess = CONFIG.PRODUCTS.slice(0, 15);
    
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      console.log(`Processing: ${product.name}`);
      
      try {
        const productResult = await scrapeProductUpdatesEnhanced(product);
        results.products.push(productResult);
        
        // Rate limiting
        if (i < productsToProcess.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
      } catch (error) {
        console.error(`Error processing ${product.name}:`, error);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          updates: [],
          status: 'error',
          error_message: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
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

// Enhanced scraping function that tries multiple approaches
async function scrapeProductUpdatesEnhanced(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    updates_url: product.updates_url || null,
    updates: [],
    status: 'error',
    error_message: null,
    source_type: product.updates_url ? 'explicit' : 'discovered'
  };

  try {
    const baseUrl = getBaseUrl(product.homepage);
    
    // Check robots.txt
    if (await isBlockedByRobots(baseUrl)) {
      result.status = 'source_blocked_by_robots';
      return result;
    }

    let allUpdates = [];
    let updatesUrl = product.updates_url;
    
    // Try explicit URL first
    if (updatesUrl) {
      console.log(`Trying explicit URL: ${updatesUrl}`);
      const updates = await scrapeUpdatesFromUrl(updatesUrl);
      allUpdates = allUpdates.concat(updates);
      result.updates_url = updatesUrl;
    }
    
    // If no explicit URL or no updates found, try discovery
    if (!updatesUrl || allUpdates.length === 0) {
      console.log(`Trying auto-discovery for: ${product.name}`);
      updatesUrl = await discoverUpdatesUrl(product.homepage);
      
      if (updatesUrl) {
        result.updates_url = updatesUrl;
        result.source_type = 'discovered';
        const discoveredUpdates = await scrapeUpdatesFromUrl(updatesUrl);
        allUpdates = allUpdates.concat(discoveredUpdates);
      }
    }
    
    // If still no updates, try scraping the homepage directly
    if (allUpdates.length === 0) {
      console.log(`Trying homepage scraping for: ${product.name}`);
      result.updates_url = product.homepage;
      const homepageUpdates = await scrapeHomepageForUpdates(product.homepage, product.name);
      allUpdates = allUpdates.concat(homepageUpdates);
    }
    
    // Process and deduplicate updates
    if (allUpdates.length > 0) {
      const uniqueUpdates = deduplicateUpdates(allUpdates);
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

// Enhanced homepage scraping - looks for any content that might be updates
async function scrapeHomepageForUpdates(homepage, productName) {
  try {
    const html = await fetchUrl(homepage, 10000);
    const updates = [];
    
    // Look for news/updates sections
    const newsPatterns = [
      /<(?:div|section|article)[^>]*(?:news|update|announcement|release)[^>]*>[\s\S]*?<\/(?:div|section|article)>/gi,
      /<(?:h[1-6])[^>]*>([^<]*(?:news|update|new|release|announcement|feature)[^<]*)<\/h[1-6]>/gi,
      /<(?:div|p)[^>]*class[^>]*(?:news|update|latest)[^>]*>[\s\S]*?<\/(?:div|p)>/gi
    ];
    
    for (const pattern of newsPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && updates.length < 3) {
        if (match[1]) {
          const title = match[1].trim();
          if (title.length > 10 && title.length < 200) {
            updates.push({
              title: title,
              date: new Date().toISOString().split('T')[0],
              summary: 'Latest information from homepage',
              link: homepage
            });
          }
        }
      }
    }
    
    // If no news patterns found, look for any recent content
    if (updates.length === 0) {
      const generalPatterns = [
        /<h[1-4][^>]*>([^<]{20,150})<\/h[1-4]>/gi,
        /<(?:div|p)[^>]*class[^>]*(?:feature|highlight)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,100})<\/h[1-6]>/gi
      ];
      
      for (const pattern of generalPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && updates.length < 2) {
          const title = match[1].trim();
          if (title.length > 15 && !title.toLowerCase().includes('cookie')) {
            updates.push({
              title: `${productName}: ${title}`,
              date: new Date().toISOString().split('T')[0],
              summary: 'Recent content from product homepage',
              link: homepage
            });
          }
        }
      }
    }
    
    return updates;
    
  } catch (error) {
    console.error(`Homepage scraping failed: ${error}`);
    return [];
  }
}

// Enhanced HTML parsing with multiple strategies
function parseUpdatesFromHtml(html, baseUrl) {
  const updates = [];
  
  // Strategy 1: Look for structured update content
  const structuredPatterns = [
    // Release notes and changelog patterns
    /<(?:div|article|section)[^>]*(?:release|update|changelog|news)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?<\/(?:div|article|section)>/gi,
    // List item updates
    /<li[^>]*>[\s\S]*?<(?:h[1-6]|strong|b)[^>]*>([^<]+)<\/(?:h[1-6]|strong|b)>[\s\S]*?<\/li>/gi,
    // Date-based entries
    /<(?:div|p)[^>]*>[^<]*(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\w+\s+\d{1,2},?\s+\d{4})[^<]*<\/(?:div|p)>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi
  ];
  
  for (const pattern of structuredPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && updates.length < CONFIG.MAX_UPDATES_PER_PRODUCT * 3) {
      const updateHtml = match[0];
      const title = match[1] ? match[1].trim() : '';
      
      if (title && title.length > 10 && title.length < 300) {
        const update = parseUpdateItem(updateHtml, baseUrl, title);
        if (update) {
          updates.push(update);
        }
      }
    }
  }
  
  // Strategy 2: If no structured content, look for any headings
  if (updates.length === 0) {
    const headingPattern = /<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi;
    let match;
    
    while ((match = headingPattern.exec(html)) !== null && updates.length < 5) {
      const title = match[1].trim();
      if (title && !title.toLowerCase().includes('cookie') && !title.toLowerCase().includes('privacy')) {
        updates.push({
          title,
          date: new Date().toISOString().split('T')[0],
          summary: 'Recent content found on updates page',
          link: baseUrl
        });
      }
    }
  }
  
  return deduplicateUpdates(updates);
}

// Improved update parsing
function parseUpdateItem(html, baseUrl, title = null) {
  try {
    // Extract title if not provided
    if (!title) {
      const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) || 
                        html.match(/<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>/i);
      title = titleMatch ? titleMatch[1].trim() : 'Update Available';
    }
    
    if (title.length < 5) return null;
    
    // Extract date with better patterns
    let date = new Date().toISOString().split('T')[0];
    const datePatterns = [
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
      /(\w+\s+\d{1,2},?\s+\d{4})/,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = html.match(pattern);
      if (dateMatch) {
        try {
          const parsedDate = new Date(dateMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    
    // Extract summary with better logic
    let summary = 'Click to view details';
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (textContent.length > title.length + 20) {
      const remainingText = textContent.replace(title, '').trim();
      const sentences = remainingText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences[0] && sentences[0].length > 10) {
        summary = sentences[0].trim().substring(0, 200);
        if (sentences[0].length > 200) summary += '...';
      }
    }
    
    // Extract link
    let link = baseUrl;
    const linkMatch = html.match(/<a[^>]+href=["']([^"']+)["']/i);
    if (linkMatch) {
      let href = linkMatch[1];
      if (href.startsWith('/')) {
        const base = getBaseUrl(baseUrl);
        href = base + href;
      } else if (!href.startsWith('http')) {
        href = baseUrl;
      }
      link = href;
    }
    
    return { title, date, summary, link };
    
  } catch (error) {
    return null;
  }
}

// Deduplicate updates by title similarity
function deduplicateUpdates(updates) {
  const unique = [];
  const seenTitles = new Set();
  
  for (const update of updates) {
    const normalizedTitle = update.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      unique.push(update);
    }
  }
  
  // Sort by date (newest first)
  return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Rest of the utility functions remain the same...
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

async function discoverUpdatesUrl(homepage) {
  const baseUrl = getBaseUrl(homepage);
  
  for (const path of UPDATE_PATHS) {
    try {
      const testUrl = baseUrl + path;
      const exists = await testUrlExists(testUrl);
      if (exists) {
        console.log(`Found updates page: ${testUrl}`);
        return testUrl;
      }
    } catch (e) {
      // Continue trying
    }
  }
  
  return null;
}

async function scrapeUpdatesFromUrl(url) {
  try {
    const html = await fetchUrl(url, 12000);
    return parseUpdatesFromHtml(html, url);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return [];
  }
}

function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, timeout = 10000) {
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