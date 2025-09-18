/**
 * Enhanced Netlify Function - Zoho Updates Scraper with Categorization
 * Includes product categorization and update classification
 */

const https = require('https');
const http = require('http');

// Enhanced configuration with categorized products
const CONFIG = {
  PRODUCTS: [
    // News & General Sources (Priority - Most content-rich)
    { name: 'Zoho Blog', homepage: 'https://www.zoho.com/blog/', updates_url: 'https://www.zoho.com/blog/', category: 'News' },
    { name: 'Zoho Community', homepage: 'https://help.zoho.com/portal/en/community', updates_url: 'https://help.zoho.com/portal/en/community', category: 'News' },
    { name: 'Zoho Press Releases', homepage: 'https://www.zoho.com/press.html', updates_url: 'https://www.zoho.com/press.html', category: 'News' },
    { name: 'Zoho In The News', homepage: 'https://www.zoho.com/inthenews.html', updates_url: 'https://www.zoho.com/inthenews.html', category: 'News' },
    { name: 'Zoho Newsletter', homepage: 'https://www.zoho.com/newsletter.html', updates_url: 'https://www.zoho.com/newsletter.html', category: 'News' },
    { name: 'Zoho Creator Community News', homepage: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', updates_url: 'https://help.zoho.com/portal/en/community/zoho-creator/news-and-updates', category: 'News' },
    { name: 'Zoho News Details', homepage: 'https://www.zoho.com/inthenews-detail.html', updates_url: 'https://www.zoho.com/inthenews-detail.html', category: 'News' },
    { name: 'Zoho Influence News', homepage: 'https://www.zoho.com/r/influence/in-the-news', updates_url: 'https://www.zoho.com/r/influence/in-the-news', category: 'News' },
    
    // CRM & Sales
    { name: 'Zoho CRM', homepage: 'https://www.zoho.com/crm/', updates_url: 'https://www.zoho.com/crm/whats-new/release-notes.html', category: 'CRM & Sales' },
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
    
    // Productivity & Collaboration
    { name: 'Zoho Mail', homepage: 'https://www.zoho.com/mail/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho WorkDrive', homepage: 'https://www.zoho.com/workdrive/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho Writer', homepage: 'https://www.zoho.com/writer/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho Sheet', homepage: 'https://www.zoho.com/sheet/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho Show', homepage: 'https://www.zoho.com/show/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho Cliq', homepage: 'https://www.zoho.com/cliq/', updates_url: 'https://www.zoho.com/workplace/whats-new.html', category: 'Productivity' },
    { name: 'Zoho Connect', homepage: 'https://www.zoho.com/connect/', updates_url: null, category: 'Productivity' },
    { name: 'Zoho Projects', homepage: 'https://www.zoho.com/projects/', updates_url: null, category: 'Productivity' },
    { name: 'Zoho Meeting', homepage: 'https://www.zoho.com/meeting/', updates_url: null, category: 'Productivity' },
    
    // Development & Analytics
    { name: 'Zoho Creator', homepage: 'https://www.zoho.com/creator/', updates_url: 'https://www.zoho.com/creator/release-notes/', category: 'Development' },
    { name: 'Zoho Analytics', homepage: 'https://www.zoho.com/analytics/', updates_url: 'https://www.zoho.com/analytics/whats-new/release-notes.html', category: 'Development' },
    { name: 'Zoho Flow', homepage: 'https://www.zoho.com/flow/', updates_url: 'https://www.zoho.com/flow/release-notes/', category: 'Development' },
    { name: 'Zoho Deluge', homepage: 'https://www.zoho.com/deluge/', updates_url: 'https://www.zoho.com/deluge/help/release-notes.html', category: 'Development' },
    { name: 'Zoho Forms', homepage: 'https://www.zoho.com/forms/', updates_url: null, category: 'Development' },
    
    // HR & Operations
    { name: 'Zoho People', homepage: 'https://www.zoho.com/people/', updates_url: null, category: 'HR' },
    { name: 'Zoho Recruit', homepage: 'https://www.zoho.com/recruit/', updates_url: null, category: 'HR' },
    { name: 'Zoho Payroll', homepage: 'https://www.zoho.com/payroll/', updates_url: null, category: 'HR' },
    { name: 'Zoho Bookings', homepage: 'https://www.zoho.com/bookings/', updates_url: 'https://www.zoho.com/bookings/help/release-notes.html', category: 'HR' },
    { name: 'Zoho Sign', homepage: 'https://www.zoho.com/sign/', updates_url: null, category: 'HR' },
    
    // Marketing & Web
    { name: 'Zoho Sites', homepage: 'https://www.zoho.com/sites/', updates_url: null, category: 'Marketing' },
    { name: 'Zoho PageSense', homepage: 'https://www.zoho.com/pagesense/', updates_url: null, category: 'Marketing' },
    { name: 'Zoho Backstage', homepage: 'https://www.zoho.com/backstage/', updates_url: null, category: 'Marketing' },
    { name: 'Zoho Survey', homepage: 'https://www.zoho.com/survey/', updates_url: null, category: 'Marketing' },
    
    // Other
    { name: 'Zoho One', homepage: 'https://www.zoho.com/one/', updates_url: null, category: 'Other' },
    { name: 'Zoho Catalyst', homepage: 'https://catalyst.zoho.com/', updates_url: null, category: 'Development' }
  ],
  
  USER_AGENT: 'ZohoUpdatesBot/1.0',
  REQUEST_DELAY: 1500,
  MAX_UPDATES_PER_PRODUCT: 3
};

const UPDATE_PATHS = ['/whats-new', '/whatsnew', '/updates', '/release-notes', '/release-notes/', '/changelog', '/blog', '/news'];

// Update classification patterns
const UPDATE_TYPE_PATTERNS = {
  'New Features': [
    /\b(new|introducing|launch|launched|added|released|announcing)\b/i,
    /\bfeature\b/i,
    /\bversion\s+\d+/i
  ],
  'Improvements': [
    /\b(enhanced|improved|better|optimized|upgrade|updated)\b/i,
    /\b(performance|speed|efficiency)\b/i
  ],
  'Bug Fixes': [
    /\b(fixed|resolved|corrected|bug|issue|problem)\b/i,
    /\bpatch\b/i
  ],
  'Security': [
    /\b(security|patch|vulnerability|secure)\b/i,
    /\b(authentication|authorization|encryption)\b/i
  ],
  'API Changes': [
    /\bAPI\b/i,
    /\b(integration|endpoint|webhook|developer)\b/i
  ]
};

const PRIORITY_PATTERNS = {
  'Critical': [
    /\b(critical|urgent|important|security|vulnerability)\b/i,
    /\b(major\s+bug|critical\s+fix)\b/i
  ],
  'Major': [
    /\b(major|significant|release|version)\b/i,
    /\b(new\s+feature|launch)\b/i
  ]
};

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
    console.log('Starting enhanced scrape with categorization...');
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: [],
      categories: getUniqueCategories(),
      summary: {
        total_products: 0,
        products_with_updates: 0,
        total_updates: 0,
        by_category: {}
      }
    };

    // Process products with enhanced categorization
    const productsToProcess = CONFIG.PRODUCTS.slice(0, 35); // Increased limit for news sources
    
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      console.log(`Processing: ${product.name} (${product.category})`);
      
      try {
        const productResult = await scrapeProductUpdatesEnhanced(product);
        results.products.push(productResult);
        
        // Update summary statistics
        results.summary.total_products++;
        if (productResult.updates && productResult.updates.length > 0) {
          results.summary.products_with_updates++;
          results.summary.total_updates += productResult.updates.length;
        }
        
        // Category statistics
        const category = productResult.category || 'Other';
        if (!results.summary.by_category[category]) {
          results.summary.by_category[category] = {
            products: 0,
            updates: 0
          };
        }
        results.summary.by_category[category].products++;
        results.summary.by_category[category].updates += productResult.updates ? productResult.updates.length : 0;
        
        // Rate limiting
        if (i < productsToProcess.length - 1) {
          await sleep(CONFIG.REQUEST_DELAY);
        }
      } catch (error) {
        console.error(`Error processing ${product.name}:`, error);
        results.products.push({
          name: product.name,
          homepage: product.homepage,
          category: product.category || 'Other',
          updates: [],
          status: 'error',
          error_message: error.message
        });
      }
    }

    console.log(`Scraping completed. Found ${results.summary.total_updates} updates across ${results.summary.products_with_updates} products`);

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

// Get unique categories from product list
function getUniqueCategories() {
  const categories = [...new Set(CONFIG.PRODUCTS.map(p => p.category || 'Other'))];
  return categories.sort();
}

// Enhanced scraping function with categorization
async function scrapeProductUpdatesEnhanced(product) {
  const result = {
    name: product.name,
    homepage: product.homepage,
    category: product.category || 'Other',
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
    
    // Process and classify updates
    if (allUpdates.length > 0) {
      const classifiedUpdates = allUpdates.map(update => ({
        ...update,
        type: classifyUpdateType(update.title, update.summary),
        priority: classifyPriority(update.title, update.summary),
        category: product.category || 'Other'
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

// Classify update type based on content
function classifyUpdateType(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  
  const scores = {};
  
  for (const [type, patterns] of Object.entries(UPDATE_TYPE_PATTERNS)) {
    scores[type] = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[type]++;
      }
    }
  }
  
  // Return the type with highest score, or 'General' if no matches
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'General';
  
  return Object.keys(scores).find(type => scores[type] === maxScore);
}

// Classify update priority
function classifyPriority(title, summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  
  for (const [priority, patterns] of Object.entries(PRIORITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return priority;
      }
    }
  }
  
  return 'Normal';
}

// Enhanced homepage/blog scraping for news sources
async function scrapeHomepageForUpdates(homepage, productName) {
  try {
    const html = await fetchUrl(homepage, 15000);
    const updates = [];
    
    // Enhanced patterns for different Zoho news sources
    const newsPatterns = {
      // Zoho Blog specific patterns
      blog: [
        /<article[^>]*class[^>]*post[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi,
        /<div[^>]*class[^>]*blog-post[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>/gi,
        /<div[^>]*class[^>]*entry[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>/gi
      ],
      
      // Community patterns
      community: [
        /<div[^>]*class[^>]*topic[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<tr[^>]*class[^>]*topic[^>]*>[\s\S]*?<a[^>]*>([^<]{15,200})<\/a>/gi,
        /<li[^>]*class[^>]*discussion[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<div[^>]*class[^>]*forum-post[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi
      ],
      
      // Press release patterns
      press: [
        /<div[^>]*class[^>]*press[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi,
        /<article[^>]*class[^>]*news[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi,
        /<div[^>]*class[^>]*release[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi,
        /<li[^>]*class[^>]*news-item[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,250})<\/h[1-6]>/gi
      ],
      
      // Newsletter patterns
      newsletter: [
        /<div[^>]*class[^>]*newsletter[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<article[^>]*class[^>]*newsletter[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<div[^>]*class[^>]*edition[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi
      ],
      
      // General news patterns
      general: [
        /<div[^>]*class[^>]*news[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<article[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{20,200})<\/h[1-6]>[\s\S]*?<\/article>/gi,
        /<li[^>]*class[^>]*item[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi,
        /<div[^>]*class[^>]*card[^>]*>[\s\S]*?<h[1-6][^>]*>([^<]{15,200})<\/h[1-6]>/gi
      ]
    };
    
    // Determine which patterns to use based on URL
    let patternsToUse = newsPatterns.general;
    if (homepage.includes('/blog/')) {
      patternsToUse = [...newsPatterns.blog, ...newsPatterns.general];
    } else if (homepage.includes('/community')) {
      patternsToUse = [...newsPatterns.community, ...newsPatterns.general];
    } else if (homepage.includes('/press')) {
      patternsToUse = [...newsPatterns.press, ...newsPatterns.general];
    } else if (homepage.includes('/newsletter')) {
      patternsToUse = [...newsPatterns.newsletter, ...newsPatterns.general];
    }
    
    // Apply selected patterns
    for (const pattern of patternsToUse) {
      let match;
      while ((match = pattern.exec(html)) !== null && updates.length < 8) {
        if (match[1]) {
          const title = match[1].trim();
          if (title.length > 15 && title.length < 300 && 
              !title.toLowerCase().includes('cookie') && 
              !title.toLowerCase().includes('privacy') &&
              !title.toLowerCase().includes('terms of') &&
              !title.toLowerCase().includes('404') &&
              !title.toLowerCase().includes('error')) {
            
            // Extract date and link from surrounding context
            const contextStart = Math.max(0, match.index - 800);
            const contextEnd = Math.min(html.length, match.index + 1200);
            const context = html.substring(contextStart, contextEnd);
            
            let date = extractDateFromContext(context);
            let summary = extractSummaryFromContext(context, title);
            let link = extractLinkFromContext(context, homepage);
            
            updates.push({
              title: title,
              date: date,
              summary: summary,
              link: link
            });
          }
        }
      }
    }
    
    // If still no updates, try more aggressive headline extraction
    if (updates.length === 0) {
      const headlinePatterns = [
        /<h[1-3][^>]*>([^<]{20,180})<\/h[1-3]>/gi,
        /<a[^>]*class[^>]*title[^>]*>([^<]{20,150})<\/a>/gi,
        /<span[^>]*class[^>]*title[^>]*>([^<]{20,150})<\/span>/gi
      ];
      
      for (const pattern of headlinePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && updates.length < 3) {
          const title = match[1].trim();
          if (title.length > 20 && 
              !title.toLowerCase().includes('cookie') && 
              !title.toLowerCase().includes('privacy') &&
              !title.toLowerCase().includes('sign in') &&
              !title.toLowerCase().includes('sign up')) {
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
    console.error(`Homepage scraping failed for ${homepage}: ${error}`);
    return [];
  }
}

// Extract link from context
function extractLinkFromContext(context, fallbackUrl) {
  // Look for links in the context
  const linkPatterns = [
    /<a[^>]+href=["']([^"']+)["'][^>]*>/i,
    /href=["']([^"']+)["']/i
  ];
  
  for (const pattern of linkPatterns) {
    const match = context.match(pattern);
    if (match && match[1]) {
      let href = match[1];
      
      // Convert relative URLs to absolute
      if (href.startsWith('/')) {
        const baseUrl = getBaseUrl(fallbackUrl);
        href = baseUrl + href;
      } else if (!href.startsWith('http')) {
        href = fallbackUrl;
      }
      
      // Validate the URL looks reasonable
      if (href.includes('zoho.com') && !href.includes('javascript:')) {
        return href;
      }
    }
  }
  
  return fallbackUrl;
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

// Parse individual update item
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

// Discover updates URL
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

// Scrape updates from specific URL
async function scrapeUpdatesFromUrl(url, productName = '') {
  try {
    const html = await fetchUrl(url, 15000);
    return parseUpdatesFromHtml(html, url, productName);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return [];
  }
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