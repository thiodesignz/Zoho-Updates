/**
 * Enhanced Frontend JavaScript - Multi-Function Support
 * Updated to work with specialized scraper functions
 */

// Configuration with fallback options
const CONFIG = {
    // Main aggregator endpoint (combines all sources)
    API_URL: 'https://your-site-name.netlify.app/.netlify/functions/scraper',
    
    // Individual function endpoints (fallback options)
    ENDPOINTS: {
        news: 'https://your-site-name.netlify.app/.netlify/functions/scraper-news',
        products: 'https://your-site-name.netlify.app/.netlify/functions/scraper-products'
    },
    
    CACHE_KEY: 'zoho_updates_cache',
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    ANIMATION_DELAY: 100
};

// Product categories mapping
const PRODUCT_CATEGORIES = {
    'News': ['Zoho Blog', 'Zoho Community', 'Zoho Press', 'Zoho Newsletter'],
    'CRM & Sales': ['Zoho CRM', 'Zoho SalesIQ', 'Zoho Campaigns', 'Zoho Social', 'Zoho Motivator'],
    'Finance': ['Zoho Books', 'Zoho Invoice', 'Zoho Billing', 'Zoho Expense', 'Zoho Inventory'],
    'Support': ['Zoho Desk', 'Zoho FSM', 'Zoho Assist', 'Zoho Lens'],
    'Productivity': ['Zoho Mail', 'Zoho WorkDrive', 'Zoho Writer', 'Zoho Sheet', 'Zoho Show', 'Zoho Cliq'],
    'Development': ['Zoho Creator', 'Zoho Analytics', 'Zoho Flow', 'Zoho Deluge', 'Zoho Forms'],
    'HR': ['Zoho People', 'Zoho Recruit', 'Zoho Payroll', 'Zoho Bookings'],
    'Marketing': ['Zoho Sites', 'Zoho PageSense', 'Zoho Backstage', 'Zoho Survey'],
    'Other': ['Zoho One', 'Zoho Catalyst']
};

// Global state
let currentData = null;
let filteredProducts = [];
let selectedFilters = {
    category: 'All',
    updateType: 'All',
    priority: 'All'
};
let isLoading = false;

// DOM elements
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('error-message'),
    productsGrid: document.getElementById('products-grid'),
    searchInput: document.getElementById('search'),
    categoryFilter: document.getElementById('category-filter'),
    updateTypeFilter: document.getElementById('update-type-filter'),
    priorityFilter: document.getElementById('priority-filter'),
    refreshBtn: document.getElementById('refresh-btn'),
    retryBtn: document.getElementById('retry-btn'),
    lastUpdated: document.getElementById('last-updated'),
    cacheNotice: document.getElementById('cache-notice'),
    emptyState: document.getElementById('empty-state'),
    adminPanel: document.getElementById('admin-panel'),
    closeAdmin: document.getElementById('close-admin'),
    rawJson: document.getElementById('raw-json'),
    categoryStats: document.getElementById('category-stats'),
    filterSummary: document.getElementById('filter-summary'),
    activeFilters: document.getElementById('active-filters')
};

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing Enhanced Zoho Updates Tracker...');
    
    setupEventListeners();
    setupFilters();
    loadData();
    
    // Check for admin mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showAdminPanel();
    }
}

/**
 * Setup category and type filters
 */
function setupFilters() {
    // Category filter
    if (elements.categoryFilter) {
        const categories = ['All', ...Object.keys(PRODUCT_CATEGORIES)];
        elements.categoryFilter.innerHTML = categories.map(cat => 
            `<option value="${cat}">${cat}</option>`
        ).join('');
    }
    
    // Update type filter
    if (elements.updateTypeFilter) {
        const updateTypes = ['All', 'New Features', 'Improvements', 'Bug Fixes', 'Security', 'API Changes', 'Press Release', 'News'];
        elements.updateTypeFilter.innerHTML = updateTypes.map(type => 
            `<option value="${type}">${type}</option>`
        ).join('');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Filter changes
    elements.categoryFilter?.addEventListener('change', handleFilterChange);
    elements.updateTypeFilter?.addEventListener('change', handleFilterChange);
    elements.priorityFilter?.addEventListener('change', handleFilterChange);
    
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
}

/**
 * Enhanced data loading with fallback support
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
            data = getCachedData();
            if (data) {
                fromCache = true;
                console.log('Using cached data');
            }
        }
        
        if (!data) {
            console.log('Fetching from API...');
            
            // Try main aggregator first
            try {
                data = await fetchWithRetry(CONFIG.API_URL);
                console.log('Successfully fetched from main aggregator');
            } catch (mainError) {
                console.log('Main aggregator failed, trying individual functions...', mainError.message);
                
                // Fallback: fetch from individual functions
                try {
                    data = await fetchFromIndividualFunctions();
                    console.log('Successfully fetched from individual functions');
                } catch (fallbackError) {
                    console.error('All fetch methods failed:', fallbackError.message);
                    throw new Error('Unable to fetch from any source');
                }
            }
            
            if (!data || !data.products) {
                throw new Error('Invalid data format received');
            }
            
            setCachedData(data);
            console.log('Data fetched and cached successfully');
        }
        
        // Process and display data
        currentData = data;
        filteredProducts = data.products || [];
        
        renderProducts();
        updateStatusBar(data.fetched_at, fromCache);
        updateCategoryStats();
        updateFilterSummary();
        updateActiveFilters();
        
        setLoadingState(false);
        
    } catch (error) {
        console.error('Error loading data:', error);
        handleLoadError(error);
    }
}

/**
 * Fetch from individual functions as fallback
 */
async function fetchFromIndividualFunctions() {
    console.log('Attempting to fetch from individual functions...');
    
    const results = {
        fetched_at: new Date().toISOString(),
        products: [],
        categories: Object.keys(PRODUCT_CATEGORIES),
        summary: {
            total_products: 0,
            products_with_updates: 0,
            total_updates: 0,
            by_category: {}
        }
    };
    
    // Try to fetch from both news and products functions
    const promises = [
        fetchWithRetry(CONFIG.ENDPOINTS.news).catch(e => ({ error: e.message, products: [] })),
        fetchWithRetry(CONFIG.ENDPOINTS.products).catch(e => ({ error: e.message, products: [] }))
    ];
    
    const [newsResult, productsResult] = await Promise.all(promises);
    
    // Combine results
    if (newsResult.products) {
        results.products = results.products.concat(newsResult.products);
    }
    
    if (productsResult.products) {
        results.products = results.products.concat(productsResult.products);
    }
    
    if (results.products.length === 0) {
        throw new Error('No data from any function');
    }
    
    // Calculate summary
    results.summary.total_products = results.products.length;
    results.summary.products_with_updates = results.products.filter(p => p.updates && p.updates.length > 0).length;
    results.summary.total_updates = results.products.reduce((sum, p) => sum + (p.updates ? p.updates.length : 0), 0);
    
    return results;
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, maxRetries = 2) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetchWithTimeout(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }, 30000);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || 'API returned an error');
            }
            
            return data;
            
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            
            if (i === maxRetries) {
                throw error;
            }
            
            // Wait before retry
            await sleep(1000 * (i + 1));
        }
    }
}

/**
 * Handle filter changes
 */
function handleFilterChange(event) {
    const filterId = event.target.id;
    const value = event.target.value;
    
    if (filterId === 'category-filter') {
        selectedFilters.category = value;
    } else if (filterId === 'update-type-filter') {
        selectedFilters.updateType = value;
    } else if (filterId === 'priority-filter') {
        selectedFilters.priority = value;
    }
    
    applyFilters();
}

/**
 * Apply all filters
 */
function applyFilters() {
    if (!currentData || !currentData.products) return;
    
    const searchQuery = elements.searchInput.value.toLowerCase().trim();
    
    filteredProducts = currentData.products.filter(product => {
        // Search filter
        const matchesSearch = !searchQuery || 
            product.name.toLowerCase().includes(searchQuery);
        
        // Category filter
        const matchesCategory = selectedFilters.category === 'All' || 
            product.category === selectedFilters.category;
        
        // Update type filter
        const matchesUpdateType = selectedFilters.updateType === 'All' || 
            (product.updates && product.updates.some(update => update.type === selectedFilters.updateType));
        
        // Priority filter
        const matchesPriority = selectedFilters.priority === 'All' ||
            (product.updates && product.updates.some(update => update.priority === selectedFilters.priority));
        
        return matchesSearch && matchesCategory && matchesUpdateType && matchesPriority;
    });
    
    renderProducts();
    updateFilterSummary();
    updateActiveFilters();
}

/**
 * Render products grid (keeping existing implementation)
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
 * Create enhanced product card (keeping existing implementation)
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Category badge with proper CSS class
    const categoryClass = product.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const categoryBadge = `<span class="category-badge category-${categoryClass}">${product.category}</span>`;
    
    // Source indicator
    const sourceClass = product.source_type === 'explicit' ? 'explicit' : 'discovered';
    const sourceText = product.source_type === 'explicit' ? 'Manual' : 'Auto';
    
    card.innerHTML = `
        <div class="product-header">
            <div>
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <div class="product-meta">
                    ${categoryBadge}
                    <div class="product-source">
                        <span class="source-indicator ${sourceClass}"></span>
                        ${sourceText}
                    </div>
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
 * Render updates section (keeping existing implementation but enhanced)
 */
function renderUpdatesSection(product) {
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
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
    }