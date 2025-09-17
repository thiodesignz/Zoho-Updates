/**
 * Vercel Serverless Function - Zoho Product Updates Scraper
 * Deploy this to Vercel for automatic scraping
 */

import https from 'https';
import http from 'http';

// Configuration
const CONFIG = {
  // Your products - add your Zoho products here (from your CSV)
  PRODUCTS: [
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', updates_url: 'https://www.zoho.com/crm/whats-new/' },
    { name: 'Zoho SalesIQ', homepage: 'https://www.zoho.com/salesiq/', updates_url: null },
    { name: 'Zoho Campaigns', homepage: 'https://www.zoho.com/campaigns/', updates_url: null },
    { name: 'Zoho Survey', homepage: 'https://www.zoho.com/survey/', updates_url: null },
    { name: 'Zoho Sites', homepage: 'https://www.zoho.com/sites/', updates_url: null },
    { name: 'Zoho Social', homepage: 'https://www.zoho.com/social/', updates_url: null },
    { name: 'Zoho Contact Manager', homepage: 'https://www.zoho.com/contactmanager/', updates_url: null },
    { name: 'Zoho Mail', homepage: 'https://www.zoho.com/mail/', updates_url: null },
    { name: 'Zoho Docs', homepage: 'https://www.zoho.com/docs/', updates_url: null },
    { name: 'Zoho Projects', homepage: 'https://www.zoho.com/projects/', updates_url: null },
    { name: 'Zoho Connect', homepage: 'https://www.zoho.com/connect/', updates_url: null },
    { name: 'Zoho Bug Tracker', homepage: 'https://www.zoho.com/bugtracker/', updates_url: null },
    { name: 'Zoho Meeting', homepage: 'https://www.zoho.com/meeting/', updates_url: null },
    { name: 'Zoho Vault', homepage: 'https://www.zoho.com/vault/', updates_url: null },
    { name: 'Zoho ShowTime', homepage: 'https://www.zoho.com/showtime/', updates_url: null },
    { name: 'Zoho Books', homepage: 'https://www.zoho.com/books/', updates_url: 'https://www.zoho.com/books/whats-new/' },
    { name: 'Zoho Invoice', homepage: 'https://www.zoho.com/invoice/', updates_url: null },
    { name: 'Zoho Billing', homepage: 'https://www.zoho.com/billing/', updates_url: null },
    { name: 'Zoho Expense', homepage: 'https://www.zoho.com/expense/', updates_url: null },
    { name: 'Zoho Assist', homepage: 'https://www.zoho.com/assist/', updates_url: null },
    { name: 'Zoho Inventory', homepage: 'https://www.zoho.com/inventory/', updates_url: null },
    { name: 'Zoho Subscriptions', homepage: 'https://www.zoho.com/subscriptions/', updates_url: null },
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: null },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', updates_url: null },
    { name: 'Zoho Forms', homepage: 'https://www.zoho.com/forms/', updates_url: null },
    { name: 'Zoho Flow', homepage: 'https://www.zoho.com/flow/', updates_url: null },
    { name: 'Zoho Deluge', homepage: 'https://www.zoho.com/deluge/', updates_url: null },
    { name: 'Zoho Sign', homepage: 'https://www.zoho.com/sign/', updates_url: null },
    { name: 'Zoho Notebook', homepage: 'https://www.zoho.com/notebook/', updates_url: null },
    { name: 'Zoho Writer', homepage: 'https://www.zoho.com/writer/', updates_url: null },
    { name: 'Zoho Sheet', homepage: 'https://www.zoho.com/sheet/', updates_url: null },
    { name: 'Zoho Show', homepage: 'https://www.zoho.com/show/', updates_url: null },
    { name: 'Zoho WorkDrive', homepage: 'https://www.zoho.com/workdrive/', updates_url: null },
    { name: 'Zoho Cliq', homepage: 'https://www.zoho.com/cliq/', updates_url: null },
    { name: 'Zoho People', homepage: 'https://www.zoho.com/people/', updates_url: null },
    { name: 'Zoho Recruit', homepage: 'https://www.zoho.com/recruit/', updates_url: null },
    { name: 'Zoho Payroll', homepage: 'https://www.zoho.com/payroll/', updates_url: null },
    { name: 'Zoho One', homepage: 'https://www.zoho.com/one/', updates_url: null },
    { name: 'Zoho Desk', homepage: 'https://www.zoho.com/desk/', updates_url: 'https://www.zoho.com/desk/whats-new/' },
    { name: 'Zoho FSM', homepage: 'https://www.zoho.com/fieldservice/', updates_url: null },
    // Add more products as needed - you can add all 92 from your CSV
  ],
  
  USER_AGENT: 'ZohoUpdatesBot/1.0',
  REQUEST_DELAY: 1000, // Reduced for Vercel's 10s timeout
  MAX_UPDATES_PER_PRODUCT: 3
};

const UPDATE_PATHS = ['/whats-new', '/whatsnew', '/updates', '/release-notes', '/changelog'];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Starting scrape...');
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: []
    };

    // Process products (limited for Vercel timeout)
    const productsToProcess = CONFIG.PRODUCTS.slice(0, 8); // Limit for timeout
    
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      console.log(`Processing: ${product.name}`);
      
      try {
        const productResult = await scrapeProductUpdates(product);
        results.products.push(productResult);
        
        // Small delay to be polite
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

    res.status(200).json(results);

  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message,
      fetched_at: new Date().toISOString(),
      products: []
    });
  }
}

async function scrapeProductUpdates(product) {
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
    
    // Quick robots.txt check (simplified for speed)
    if (await isBlockedByRobots(baseUrl)) {
      result.status = 'source_blocked_by_robots';
      return result;
    }

    let updatesUrl = product.updates_url;
    
    if (!updatesUrl) {
      updatesUrl = await discoverUpdatesUrl(product.homepage);
    }

    if (!updatesUrl) {
      result.status = 'no_updates_found';
      return result;
    }

    result.updates_url = updatesUrl;
    
    const updates = await scrapeUpdatesFromUrl(updatesUrl);
    
    if (updates && updates.length > 0) {
      result.updates = updates;
      result.status = 'ok';
    } else {
      result.status = 'no_updates_found';
    }

  } catch (error) {
    result.error_message = error.message;
  }

  return result;
}

async function isBlockedByRobots(baseUrl) {
  try {
    const robotsText = await fetchUrl(baseUrl + '/robots.txt', 3000); // Quick timeout
    return robotsText.toLowerCase().includes('disallow: /');
  } catch (error) {
    return false; // Assume allowed if can't check
  }
}

async function discoverUpdatesUrl(homepage) {
  const baseUrl = getBaseUrl(homepage);
  
  for (const path of UPDATE_PATHS) {
    try {
      const testUrl = baseUrl + path;
      const isValid = await testUrlExists(testUrl);
      if (isValid) {
        return testUrl;
      }
    } catch (e) {
      // Continue
    }
  }
  
  return null;
}

async function scrapeUpdatesFromUrl(url) {
  try {
    const html = await fetchUrl(url, 8000);
    return parseUpdatesFromHtml(html, url);
  } catch (error) {
    return [];
  }
}

function parseUpdatesFromHtml(html, baseUrl) {
  const updates = [];
  
  // Look for headings that might be updates
  const headingPattern = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  
  while ((match = headingPattern.exec(html)) !== null) {
    const title = match[1].trim();
    
    if (title.length > 10 && title.length < 200) {
      // Try to find a date near this heading
      const surroundingText = html.substring(
        Math.max(0, match.index - 500), 
        Math.min(html.length, match.index + 1000)
      );
      
      let date = new Date().toISOString().split('T')[0];
      const dateMatch = surroundingText.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})|(\w+ \d{1,2},? \d{4})/);
      if (dateMatch) {
        try {
          const parsedDate = new Date(dateMatch[0]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          }
        } catch (e) {
          // Keep default
        }
      }
      
      updates.push({
        title,
        date,
        summary: 'Click to view details',
        link: baseUrl
      });
      
      if (updates.length >= CONFIG.MAX_UPDATES_PER_PRODUCT) break;
    }
  }
  
  return updates.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Utility functions
function getBaseUrl(url) {
  const matches = url.match(/^(https?:\/\/[^\/]+)/);
  return matches ? matches[1] : url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      headers: { 'User-Agent': CONFIG.USER_AGENT }
    }, (res) => {
      if (res.statusCode !== 200) {
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
      reject(new Error('Timeout'));
    });
  });
}

function testUrlExists(url, timeout = 3000) {
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