/**
 * Enhanced Netlify Function - Includes Zoho News & Blog Sources
 * Now scrapes from general Zoho news sources in addition to product-specific pages
 */

const https = require('https');
const http = require('http');

// Configuration with explicit URLs + general news sources
const CONFIG = {
  PRODUCTS: [
    // General Zoho News Sources (NEW)
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', updates_url: 'https://www.zoho.com/blog/', source_type: 'explicit' },
    { name: 'Zoho Community News', homepage: 'https://help.zoho.com/portal/en/community', updates_url: 'https://help.zoho.com/portal/en/community', source_type: 'explicit' },
    { name: 'Zoho Press Releases', homepage: 'https://www.zoho.com/press.html', updates_url: 'https://www.zoho.com/press.html', source_type: 'explicit' },
    { name: 'Zoho In The News', homepage: 'https://www.zoho.com/inthenews.html', updates_url: 'https://www.zoho.com/inthenews.html', source_type: 'explicit' },
    { name: 'Zoho Newsletter', homepage: 'https://www.zoho.com/newsletter.html', updates_url: 'https://www.zoho.com/newsletter.html', source_type: 'explicit' },
    { name: 'Zoho Creator News', homepage: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', updates_url: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', source_type: 'explicit' },
    
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
  REQUEST_DELAY: 1500, // Slightly faster since we have more sources
  MAX_UPDATES_PER_PRODUCT: 3 // Reduced to handle more sources
};

const UPDATE_PATHS = ['/whats-new', '/whatsnew', '/updates', '/release-notes', '/release-notes/', '/changelog', '/blog', '/news'];

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
    console.log('Starting enhanced scrape with news sources...');
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: []
    };

    // Process products - including news sources
    const productsToProcess = CONFIG.PRODUCTS.slice(0, 20); // Increased limit
    
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
      const updates = await scrapeUpdatesFromUrl(updatesUrl, product.name);
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
        const discoveredUpdates = await scrapeUpdatesFromUrl(updatesUrl, product.name);
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

// Enhanced homepage/blog scraping for news sources
async function scrapeHomepageForUpdates(homepage, productName) {
  try {
    const html = await fetchUrl(homepage, 12000);
    const updates = [];
    
    // Enhanced patterns for news/blog sites
    const newsPatterns = [
      // Blog post patterns
      /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi,
      // News item patterns
      /<(?:div|li)[^>]*class[^>]*(?:post|article|news|item)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,150})<\/h[1-6]>[\s\S]*?<\/(?:div|li)>/gi,
      // Press release patterns
      /<(?:div|section)[^>]*class[^>]*(?:press|release|announcement)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>/gi,
      // General heading patterns
      /<h[1-4][^>]*>([^<]*(?:release|update|new|announcement|feature|launch)[^<]*)<\/h[1-4]>/gi
    ];
    
    for (const pattern of newsPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && updates.length < 5) {
        if (match[1]) {
          const title = match[1].trim();
          if (title.length > 15 && title.length < 250) {
            
            // Extract date from surrounding context
            const contextStart = Math.max(0, match.index - 500);
            const contextEnd = Math.min(html.length, match.index + 1000);
            const context = html.substring(contextStart, contextEnd);
            
            let date = extractDateFromContext(context);
            
            // Extract better summary
            let summary = extractSummaryFromContext(context, title);
            
            updates.push({
              title: title,
              date: date,
              summary: summary,
              link: homepage
            });
          }
        }
      }
    }
    
    // If no news patterns found, look for any recent content
    if (updates.length === 0) {
      const generalPatterns = [
        /<h[1-4][^>]*>([^<]{20,180})<\/h[1-4]>/gi,
        /<(?:div|p)[^>]*class[^>]*(?:title|headline)[^>]*>[\s\S]*?<[^>]*>([^<]{20,150})<\/[^>]*>/gi
      ];
      
      for (const pattern of generalPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && updates.length < 3) {
          const title = match[1].trim();
          if (title.length > 20 && !title.toLowerCase().includes('cookie') && !title.toLowerCase().includes('privacy')) {
            updates.push({
              title: title,
              date: new Date().toISOString().split('T')[0],
              summary: `Latest from ${productName}`,
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

// Enhanced date extraction
function extractDateFromContext(context) {
  const datePatterns = [
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i,
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i
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
  
  return new Date().toISOString().split('T')[0];
}

// Enhanced summary extraction
function extractSummaryFromContext(context, title) {
  const textContent = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Remove the title from text content
  const withoutTitle = textContent.replace(title, '').trim();
  
  // Find sentences after the title
  const sentences = withoutTitle.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences[0] && sentences[0].length > 20) {
    let summary = sentences[0].trim();
    if (summary.length > 200) {
      summary = summary.substring(0, 200) + '...';
    }
    return summary;
  }
  
  return 'Recent update from Zoho - click to read more';
}

// Enhanced HTML parsing with multiple strategies
function parseUpdatesFromHtml(html, baseUrl, productName = '') {
  const updates = [];
  
  // Strategy 1: Look for blog/news specific patterns
  const blogPatterns = [
    // Blog post entries
    /<(?:article|div)[^>]*class[^>]*(?:post|entry|article)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>[\s\S]*?<\/(?:article|div)>/gi,
    // News items
    /<(?:div|li)[^>]*class[^>]*(?:news|item|update)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,
    // Community posts
    /<(?:div|section)[^>]*class[^>]*(?:topic|community)[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi
  ];
  
  for (const pattern of blogPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && updates.length < CONFIG.MAX_UPDATES_PER_PRODUCT * 2) {
      const updateHtml = match[0];
      const title = match[1] ? match[1].trim() : '';
      
      if (title && title.length > 15 && title.length < 300) {
        const update = parseUpdateItem(updateHtml, baseUrl, title);
        if (update) {
          updates.push(update);
        }
      }
    }
  }
  
  // Strategy 2: Generic heading extraction
  if (updates.length === 0) {
    const headingPattern = /<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>/gi;
    let match;
    
    while ((match = headingPattern.exec(html)) !== null && updates.length < 3) {
      const title = match[1].trim();
      if (title && !title.toLowerCase().includes('cookie') && !title.toLowerCase().includes('privacy')) {
        updates.push({
          title,
          date: new Date().toISOString().split('T')[0],
          summary: `Latest update from ${productName || 'Zoho'}`,
          link: baseUrl
        });
      }
    }
  }
  
  return deduplicateUpdates(updates);
}

// Rest of the utility functions remain the same...
function parseUpdateItem(html, baseUrl, title = null) {
  try {
    if (!title) {
      const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) || 
                        html.match(/<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>/i);
      title = titleMatch ? titleMatch[1].trim() : 'Update Available';
    }
    
    if (title.length < 5) return null;
    
    let date = extractDateFromContext(html);
    let summary = extractSummaryFromContext(html, title);
    
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
      continue;
    }
  }
  
  return null;
}

async function scrapeUpdatesFromUrl(url, productName = '') {
  try {
    const html = await fetchUrl(url, 15000);
    return parseUpdatesFromHtml(html, url, productName);
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