/**
 * Main Zoho Updates Aggregator - Combines News + Products
 * File: netlify/functions/scraper.js
 */

const https = require('https');
const http = require('http');

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
    console.log('Starting main aggregator...');
    const startTime = Date.now();
    
    // Get the base URL for making internal function calls
    const baseUrl = getBaseUrl(event);
    
    const results = {
      fetched_at: new Date().toISOString(),
      products: [],
      categories: ['News', 'CRM & Sales', 'Finance', 'Support', 'Productivity', 'Development', 'HR', 'Marketing', 'Other'],
      summary: {
        total_products: 0,
        products_with_updates: 0,
        total_updates: 0,
        by_category: {},
        by_source: {
          news: { products: 0, updates: 0 },
          products: { products: 0, updates: 0 }
        }
      }
    };

    try {
      // Fetch from both specialized functions in parallel
      console.log('Fetching from specialized functions...');
      
      const [newsResponse, productsResponse] = await Promise.allSettled([
        fetchFromFunction(`${baseUrl}/.netlify/functions/scraper-news`),
        fetchFromFunction(`${baseUrl}/.netlify/functions/scraper-products`)
      ]);

      // Process news results
      if (newsResponse.status === 'fulfilled' && newsResponse.value.products) {
        console.log(`News function returned ${newsResponse.value.products.length} sources`);
        results.products = results.products.concat(newsResponse.value.products);
        results.summary.by_source.news.products = newsResponse.value.products.length;
        results.summary.by_source.news.updates = newsResponse.value.summary?.total_updates || 0;
      } else {
        console.error('News function failed:', newsResponse.reason?.message || 'Unknown error');
      }

      // Process products results
      if (productsResponse.status === 'fulfilled' && productsResponse.value.products) {
        console.log(`Products function returned ${productsResponse.value.products.length} products`);
        results.products = results.products.concat(productsResponse.value.products);
        results.summary.by_source.products.products = productsResponse.value.products.length;
        results.summary.by_source.products.updates = productsResponse.value.summary?.total_updates || 0;
      } else {
        console.error('Products function failed:', productsResponse.reason?.message || 'Unknown error');
      }

      // Calculate overall statistics
      results.summary.total_products = results.products.length;
      results.summary.products_with_updates = results.products.filter(p => p.updates && p.updates.length > 0).length;
      results.summary.total_updates = results.products.reduce((sum, p) => sum + (p.updates ? p.updates.length : 0), 0);

      // Calculate category statistics
      results.products.forEach(product => {
        const category = product.category || 'Other';
        if (!results.summary.by_category[category]) {
          results.summary.by_category[category] = { products: 0, updates: 0 };
        }
        results.summary.by_category[category].products++;
        results.summary.by_category[category].updates += product.updates ? product.updates.length : 0;
      });

      const totalTime = Date.now() - startTime;
      console.log(`Aggregation completed in ${totalTime}ms. Total: ${results.summary.total_updates} updates from ${results.summary.total_products} sources.`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results)
      };

    } catch (aggregationError) {
      console.error('Aggregation error:', aggregationError);
      
      // Fallback: try to return at least some data
      if (results.products.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...results,
            warning: 'Partial data - some sources may have failed'
          })
        };
      }
      
      throw aggregationError;
    }

  } catch (error) {
    console.error('Main function error:', error);
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

function fetchFromFunction(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      headers: { 
        'User-Agent': 'ZohoAggregator/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Function returned ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Function call timeout'));
    });
  });
}

function getBaseUrl(event) {
  // Try to determine the base URL from the event
  const headers = event.headers || {};
  const host = headers.host || headers.Host;
  const protocol = headers['x-forwarded-proto'] || 'https';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback - this would need to be updated with your actual domain
  return 'https://your-site-name.netlify.app';
}