# Zoho Product Updates Tracker

A lightweight system that automatically tracks and displays the latest product updates for all Zoho products. The system consists of a Google Apps Script scraper that runs daily and a static HTML frontend that displays the updates in a clean, searchable interface.

## How It Works

The system uses a Google Apps Script that reads your list of Zoho products, discovers their update pages (respecting robots.txt), scrapes recent updates, and exposes them via a JSON API. A static HTML site fetches this data, displays it in searchable cards, and caches results locally for 24 hours.

## Files Overview

- `google-apps-script/Code.gs` - Main Google Apps Script that scrapes updates
- `google-apps-script/appsscript.json` - Apps Script manifest with permissions
- `index.html` - Frontend HTML with responsive layout
- `style.css` - Modern CSS styling with animations
- `script.js` - Frontend JavaScript with search and caching
- `products_config.csv` - Template for your Zoho products list

## Setup Instructions

### Step 1: Prepare Your Products List

Create a Google Sheet with these columns:
- **Column A**: Product Name (e.g., "Zoho CRM")
- **Column B**: Homepage Link (e.g., "https://www.zoho.com/crm/")
- **Column C**: Updates URL (optional - if specific update page known)

You can use the provided `products_config.csv` as a template.

### Step 2: Deploy Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default `Code.gs` content with the provided `Code.gs` file
4. Replace the `appsscript.json` content with the provided manifest
5. In `Code.gs`, update the `CONFIG` object:
   ```javascript
   const CONFIG = {
     SHEET_ID: 'your-google-sheet-id-here', // Get from Sheet URL
     SHEET_RANGE: 'Sheet1!A:C', // Adjust if different
     // ... other settings
   };
   ```

6. **Deploy as Web App**:
   - Click "Deploy" > "New Deployment"
   - Choose type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
   - Copy the web app URL

7. **Set up Daily Trigger**:
   - In the Apps Script editor, run the `setupTrigger()` function once
   - This creates a daily trigger that runs at 9 AM

8. **Grant Permissions**:
   - When first running, you'll need to authorize:
     - Google Sheets access (to read your products list)
     - External requests (to scrape update pages)
     - Script properties (for caching)

### Step 3: Configure Frontend

1. In `script.js`, update the `CONFIG` object:
   ```javascript
   const CONFIG = {
     API_URL: 'your-apps-script-web-app-url-here',
     // ... other settings
   };
   ```

2. Host the static files (`index.html`, `style.css`, `script.js`) on any web server:
   - GitHub Pages
   - Netlify
   - Vercel
   - Any web hosting service

### Step 4: Test the System

1. **Test the scraper**: Run the `testScraper()` function in Apps Script to test with a few products
2. **Test the API**: Visit your Apps Script web app URL to see the JSON output
3. **Test the frontend**: Open your hosted website and verify it loads the data

## Features

### Backend (Google Apps Script)
- ✅ Reads products from Google Sheets or CSV
- ✅ Discovers update pages automatically using common paths
- ✅ Respects robots.txt files
- ✅ Rate limiting (2-second delays between requests)
- ✅ Caches results and serves via JSON API
- ✅ Daily automated runs via triggers
- ✅ Error handling and status reporting

### Frontend (Static HTML)
- ✅ Responsive card-based layout
- ✅ Real-time search filtering
- ✅ Client-side caching (24-hour duration)
- ✅ Manual refresh capability
- ✅ Graceful error handling and offline support
- ✅ Admin panel for raw data inspection (`?admin=true`)
- ✅ Clean, modern UI with animations

## Configuration Options

### Google Apps Script Settings

```javascript
const CONFIG = {
  // Data source
  SHEET_ID: 'your-sheet-id',           // Google Sheet ID
  SHEET_RANGE: 'Sheet1!A:C',           // Range to read
  CSV_URL: '',                         // Alternative: published CSV URL
  
  // Scraping behavior
  USER_AGENT: 'ZohoUpdatesBot/1.0',    // Identify your scraper
  REQUEST_DELAY: 2000,                 // Milliseconds between requests
  MAX_UPDATES_PER_PRODUCT: 5,          // Max updates to store per product
};
```

### Frontend Settings

```javascript
const CONFIG = {
  API_URL: 'your-web-app-url',         // Apps Script endpoint
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours cache
  ANIMATION_DELAY: 100,                 // Card animation stagger
};
```

## Alternative: Node.js Serverless Version

If you prefer not to use Google Apps Script, here's a basic Node.js version for Netlify/Vercel:

### `netlify/functions/scraper.js` (Netlify Functions)

```javascript
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Content-Type': 'application/json'
  };
  
  try {
    // Your scraping logic here (similar to Apps Script)
    const products = await scrapeAllProducts();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        fetched_at: new Date().toISOString(),
        products
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### `package.json` for Node.js version:

```json
{
  "dependencies": {
    "node-fetch": "^2.6.7",
    "cheerio": "^1.0.0-rc.12"
  }
}
```

## Important Notes & Compliance

### Respecting Zoho's Terms of Service
- ✅ The scraper checks `robots.txt` before scraping any domain
- ✅ Implements rate limiting (2-second delays between requests)
- ✅ Uses a polite User-Agent string
- ✅ Only scrapes publicly available update pages
- ⚠️ **Recommendation**: Check if Zoho provides official RSS feeds or APIs for your products

### Rate Limiting & Best Practices
- Only runs once per day to minimize server load
- Caches results to avoid repeated requests
- Respects robots.txt disallow directives
- Uses reasonable request delays
- Fails gracefully when access is restricted

### Troubleshooting

**Common Issues:**

1. **"API endpoint not configured"**
   - Update `API_URL` in `script.js` with your Apps Script web app URL

2. **"No data available"**
   - Check your Google Sheet ID and range in `Code.gs`
   - Verify sheet permissions allow script access
   - Run `testScraper()` function to debug

3. **"Blocked by robots.txt"**
   - Some products may block automated access
   - The system will show appropriate messages for these cases

4. **Updates not refreshing**
   - Check if the daily trigger is set up: run `setupTrigger()`
   - Verify the script has proper permissions
   - Check the Apps Script execution log for errors

**Debugging Steps:**

1. Test the Google Sheet connection:
   ```javascript
   // In Apps Script, run this function
   function testSheet() {
     const products = getProductList();
     console.log('Found products:', products.length);
   }
   ```

2. Test individual product scraping:
   ```javascript
   function testSingleProduct() {
     const product = {
       name: 'Zoho CRM',
       homepage: 'https://www.zoho.com/crm/',
       updates_url: null
     };
     const result = scrapeProductUpdates(product);
     console.log('Result:', result);
   }
   ```

3. Check the JSON API output by visiting your web app URL directly

## Security Notes

- The Apps Script runs with your Google account permissions
- Only requires read access to your specified Google Sheet
- Makes outbound HTTP requests to scrape public pages
- No sensitive data is stored or transmitted
- Frontend uses client-side caching only (no server-side data storage)

## Customization

### Adding More Products
Simply add rows to your Google Sheet with the product name and homepage URL.

### Customizing Update Detection
Modify the `UPDATE_PATHS` and `UPDATE_KEYWORDS` arrays in `Code.gs` to improve update page discovery.

### Styling Changes
Modify `style.css` to match your preferred design. The CSS uses CSS Grid and Flexbox for responsive layouts.

### Different Data Sources
Replace the Google Sheets functions with CSV parsing or direct array definitions if preferred.

---

## Support

If you encounter issues:

1. Check the Google Apps Script execution log for errors
2. Verify all URLs and IDs are correctly configured
3. Test with a small subset of products first
4. Ensure proper permissions are granted to the script

For advanced customization, modify the scraping logic in `parseUpdatesFromHtml()` to better match specific Zoho product page structures.