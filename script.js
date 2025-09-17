/**
 * Zoho Product Updates - Frontend JavaScript
 * Updated for Vercel deployment
 */

// Configuration - Update this with your Vercel deployment URL
const CONFIG = {
    // Replace with your Vercel deployment URL after deployment
    API_URL: 'https://68caf9f24f3a8324f5c07469--zohoupdates.netlify.app/.netlify/functions/scraper'
    // Local storage settings
    CACHE_KEY: 'zoho_updates_cache',
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // UI settings
    ANIMATION_DELAY: 100 // Stagger card animations
};

// Global state
let currentData = null;
let filteredProducts = [];
let isLoading = false;

// DOM elements
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('error-message'),
    productsGrid: document.getElementById('products-grid'),
    searchInput: document.getElementById('search'),
    refreshBtn: document.getElementById('refresh-btn'),
    retryBtn: document.getElementById('retry-btn'),
    lastUpdated: document.getElementById('last-updated'),
    cacheNotice: document.getElementById('cache-notice'),
    emptyState: document.getElementById('empty-state'),
    adminPanel: document.getElementById('admin-panel'),
    closeAdmin: document.getElementById('close-admin'),
    rawJson: document.getElementById('raw-json')
};

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing Zoho Updates Tracker...');
    
    // Check for admin mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showAdminPanel();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    loadData();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        clearCache();
        loadData(true);
    });
    
    // Retry button
    elements.retryBtn.addEventListener('click', () => {
        loadData(true);
    });
    
    // Admin panel
    elements.closeAdmin?.addEventListener('click', hideAdminPanel);
    
    // Close admin panel on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.adminPanel.classList.contains('hidden')) {
            hideAdminPanel();
        }
    });
    
    // Close admin panel on background click
    elements.adminPanel?.addEventListener('click', (e) => {
        if (e.target === elements.adminPanel) {
            hideAdminPanel();
        }
    });
}

/**
 * Load data from API or cache
 */
async function loadData(forceRefresh = false) {
    if (isLoading) return;
    
    console.log('Loading data...', forceRefresh ? '(forced refresh)' : '');
    
    setLoadingState(true);
    hideError();
    
    try {
        let data = null;
        let fromCache = false;
        
        if (!forceRefresh) {
            // Try to load from cache first
            data = getCachedData();
            if (data) {
                fromCache = true;
                console.log('Using cached data');
            }
        }
        
        if (!data) {
            // Fetch from API
            console.log('Fetching from API...');
            const response = await fetchWithTimeout(CONFIG.API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }, 30000); // 30 second timeout
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            data = await response.json();
            
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format received');
            }
            
            if (data.error) {
                throw new Error(data.message || 'API returned an error');
            }
            
            // Cache the data
            setCachedData(data);
            console.log('Data fetched and cached successfully');
        }
        
        // Process and display data
        currentData = data;
        filteredProducts = data.products || [];
        
        renderProducts();
        updateStatusBar(data.fetched_at, fromCache);
        
        setLoadingState(false);
        
    } catch (error) {
        console.error('Error loading data:', error);
        handleLoadError(error);
    }
}

/**
 * Fetch with timeout
 */
function fetchWithTimeout(url, options, timeout) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (!currentData || !currentData.products) {
        return;
    }
    
    if (!query) {
        filteredProducts = currentData.products;
    } else {
        filteredProducts = currentData.products.filter(product =>
            product.name.toLowerCase().includes(query)
        );
    }
    
    renderProducts();
}

/**
 * Render products grid
 */
function renderProducts() {
    if (!filteredProducts || filteredProducts.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    // Clear existing products
    elements.productsGrid.innerHTML = '';
    
    // Create product cards with staggered animation
    filteredProducts.forEach((product, index) => {
        const card = createProductCard(product);
        card.style.animationDelay = `${index * CONFIG.ANIMATION_DELAY}ms`;
        elements.productsGrid.appendChild(card);
    });
    
    // Show the grid
    elements.productsGrid.classList.remove('hidden');
    
    console.log(`Rendered ${filteredProducts.length} products`);
}

/**
 * Create a product card element
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Determine source type indicator
    const sourceClass = product.source_type === 'explicit' ? 'explicit' : 'discovered';
    const sourceText = product.source_type === 'explicit' ? 'Manual' : 'Auto';
    
    card.innerHTML = `
        <div class="product-header">
            <div>
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <div class="product-source">
                    <span class="source-indicator ${sourceClass}"></span>
                    ${sourceText}
                </div>
            </div>
            <a href="${escapeHtml(product.homepage)}" target="_blank" rel="noopener" class="homepage-link">
                Visit
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        </div>
        
        <div class="updates-section">
            ${renderUpdatesSection(product)}
        </div>
    `;
    
    return card;
}

/**
 * Render updates section for a product
 */
function renderUpdatesSection(product) {
    // Handle different status states
    if (product.status === 'source_blocked_by_robots') {
        return `
            <div class="status-blocked">
                🤖 Access blocked by robots.txt
                <br>
                <a href="${escapeHtml(product.homepage)}" target="_blank" class="fallback-link">
                    Visit product page
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
    }
    
    if (product.status === 'error') {
        return `
            <div class="status-error">
                ⚠️ ${escapeHtml(product.error_message || 'Error loading updates')}
                <br>
                <a href="${escapeHtml(product.homepage)}" target="_blank" class="fallback-link">
                    Visit product page
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
    }
    
    if (!product.updates || product.updates.length === 0) {
        const updatesUrl = product.updates_url || product.homepage;
        return `
            <div class="no-updates">
                <div class="no-updates-icon">📰</div>
                <h4>No recent updates found</h4>
                <p>Check the source page for the latest information</p>
                <a href="${escapeHtml(updatesUrl)}" target="_blank" class="fallback-link">
                    View source page
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
    }
    
    // Render updates
    const updatesHtml = product.updates.slice(0, 3).map(update => `
        <div class="update-item">
            <div class="update-title">
                <a href="${escapeHtml(update.link)}" target="_blank" rel="noopener">
                    ${escapeHtml(update.title)}
                </a>
            </div>
            <div class="update-meta">
                <span class="update-date">${formatDate(update.date)}</span>
                <a href="${escapeHtml(update.link)}" target="_blank" rel="noopener" class="update-link">
                    Read more →
                </a>
            </div>
            ${update.summary ? `<div class="update-summary">${escapeHtml(update.summary)}</div>` : ''}
        </div>
    `).join('');
    
    return `
        <div class="updates-header">
            <span class="updates-title">Latest Updates</span>
            <span class="updates-count">${product.updates.length}</span>
        </div>
        ${updatesHtml}
        ${product.updates.length > 3 ? `
            <div style="text-align: center; margin-top: 15px;">
                <a href="${escapeHtml(product.updates_url || product.homepage)}" target="_blank" class="fallback-link">
                    View all ${product.updates.length} updates →
                </a>
            </div>
        ` : ''}
    `;
}

/**
 * Update status bar with last updated time
 */
function updateStatusBar(fetchedAt, fromCache) {
    if (fetchedAt) {
        const date = new Date(fetchedAt);
        const formattedDate = date.toLocaleString();
        elements.lastUpdated.textContent = `Last updated: ${formattedDate}`;
    }
    
    if (fromCache) {
        elements.cacheNotice.classList.remove('hidden');
    } else {
        elements.cacheNotice.classList.add('hidden');
    }
}

/**
 * Set loading state
 */
function setLoadingState(loading) {
    isLoading = loading;
    
    if (loading) {
        elements.loading.classList.remove('hidden');
        elements.productsGrid.classList.add('hidden');
        elements.refreshBtn.disabled = true;
    } else {
        elements.loading.classList.add('hidden');
        elements.refreshBtn.disabled = false;
    }
}

/**
 * Handle load error
 */
function handleLoadError(error) {
    console.error('Load error:', error);
    
    setLoadingState(false);
    elements.productsGrid.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    
    // Try to show cached data as fallback
    const cachedData = getCachedData();
    if (cachedData) {
        console.log('Showing cached data as fallback');
        currentData = cachedData;
        filteredProducts = cachedData.products || [];
        renderProducts();
        updateStatusBar(cachedData.fetched_at, true);
        elements.cacheNotice.classList.remove('hidden');
        return;
    }
    
    // Show error state
    let errorMessage = 'Unable to load updates. Please check your connection and try again.';
    
    if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be busy, please try again.';
    } else if (error.message.includes('API returned')) {
        errorMessage = 'Server error. Please try again later.';
    } else if (CONFIG.API_URL.includes('your-project-name')) {
        errorMessage = 'API endpoint not configured. Please update the API_URL in script.js with your Vercel deployment URL.';
    }
    
    elements.errorMessage.textContent = errorMessage;
    elements.error.classList.remove('hidden');
}

/**
 * Hide error state
 */
function hideError() {
    elements.error.classList.add('hidden');
}

/**
 * Show empty state
 */
function showEmptyState() {
    elements.productsGrid.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
}

/**
 * Hide empty state
 */
function hideEmptyState() {
    elements.emptyState.classList.add('hidden');
}

/**
 * Cache management
 */
function getCachedData() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        const cacheTime = new Date(data.cached_at).getTime();
        
        if (now - cacheTime > CONFIG.CACHE_DURATION) {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        }
        
        return data.data;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCachedData(data) {
    try {
        const cacheObj = {
            cached_at: new Date().toISOString(),
            data: data
        };
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
        console.error('Error writing cache:', error);
    }
}

function clearCache() {
    try {
        localStorage.removeItem(CONFIG.CACHE_KEY);
        console.log('Cache cleared');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

/**
 * Admin panel functions
 */
function showAdminPanel() {
    if (currentData) {
        elements.rawJson.textContent = JSON.stringify(currentData, null, 2);
    } else {
        elements.rawJson.textContent = 'No data loaded yet.';
    }
    elements.adminPanel.classList.remove('hidden');
}

function hideAdminPanel() {
    elements.adminPanel.classList.add('hidden');
    
    // Remove admin parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete('admin');
    window.history.replaceState({}, document.title, url.pathname + url.search);
}

/**
 * Utility functions
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return dateStr;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}