/**
 * Enhanced Zoho Product Updates - Frontend JavaScript with Categorization
 */

// Configuration
const CONFIG = {
    API_URL: 'https://zohoupdates.netlify.app/.netlify/functions/scraper',
    CACHE_KEY: 'zoho_updates_cache',
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    ANIMATION_DELAY: 100
};

// Product categories mapping
const PRODUCT_CATEGORIES = {
    'CRM & Sales': [
        'Zoho CRM', 'Zoho SalesIQ', 'Zoho Campaigns', 'Zoho Social', 
        'Zoho Motivator', 'Zoho SalesInbox', 'Zoho CRM Plus', 'Zoho MarketingHub'
    ],
    'Finance': [
        'Zoho Books', 'Zoho Invoice', 'Zoho Billing', 'Zoho Expense', 
        'Zoho Inventory', 'Zoho Subscriptions'
    ],
    'Support': [
        'Zoho Desk', 'Zoho FSM', 'Zoho Assist', 'Zoho Lens', 'Zoho TeamInbox'
    ],
    'Productivity': [
        'Zoho Mail', 'Zoho WorkDrive', 'Zoho Writer', 'Zoho Sheet', 'Zoho Show', 
        'Zoho Cliq', 'Zoho Connect', 'Zoho Projects', 'Zoho Meeting', 'Zoho Docs'
    ],
    'Development': [
        'Zoho Creator', 'Zoho Analytics', 'Zoho Flow', 'Zoho Deluge', 
        'Zoho Forms', 'Zoho Catalyst', 'Zoho Developer'
    ],
    'HR': [
        'Zoho People', 'Zoho Recruit', 'Zoho Payroll', 'Zoho Bookings', 
        'Zoho Sign', 'Zoho Qntrl', 'Zoho Orchestly'
    ],
    'Marketing': [
        'Zoho Sites', 'Zoho PageSense', 'Zoho Backstage', 'Zoho Survey'
    ],
    'News': [
        'Zoho Blog', 'Zoho Community News', 'Zoho Press Releases', 
        'Zoho In The News', 'Zoho Newsletter', 'Zoho Creator News'
    ],
    'Other': [
        'Zoho One', 'Zoho Notebook', 'Zoho Vault', 'Zoho ShowTime', 'Zoho Marketplace'
    ]
};

// Update type classification patterns
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

// Priority classification patterns
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
        const updateTypes = ['All', 'New Features', 'Improvements', 'Bug Fixes', 'Security', 'API Changes'];
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
    
    // Close admin panel on background click
    elements.adminPanel?.addEventListener('click', (e) => {
        if (e.target === elements.adminPanel) {
            hideAdminPanel();
        }
    });
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
 * Categorize a product
 */
function categorizeProduct(productName) {
    for (const [category, products] of Object.entries(PRODUCT_CATEGORIES)) {
        if (products.some(product => 
            productName.toLowerCase().includes(product.toLowerCase()) || 
            product.toLowerCase().includes(productName.toLowerCase())
        )) {
            return category;
        }
    }
    return 'Other';
}

/**
 * Classify update type
 */
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

/**
 * Classify update priority
 */
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

/**
 * Process products with categorization
 */
function processProductsWithCategories(products) {
    return products.map(product => {
        const category = categorizeProduct(product.name);
        
        const categorizedUpdates = product.updates ? product.updates.map(update => ({
            ...update,
            type: classifyUpdateType(update.title, update.summary),
            priority: classifyPriority(update.title, update.summary),
            category: category
        })) : [];
        
        return {
            ...product,
            category: category,
            updates: categorizedUpdates,
            updateStats: {
                total: categorizedUpdates.length,
                byType: categorizedUpdates.reduce((acc, update) => {
                    acc[update.type] = (acc[update.type] || 0) + 1;
                    return acc;
                }, {}),
                byPriority: categorizedUpdates.reduce((acc, update) => {
                    acc[update.priority] = (acc[update.priority] || 0) + 1;
                    return acc;
                }, {})
            }
        };
    });
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
    updateCategoryStats();
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
            data = getCachedData();
            if (data) {
                fromCache = true;
                console.log('Using cached data');
            }
        }
        
        if (!data) {
            console.log('Fetching from API...');
            const response = await fetchWithTimeout(CONFIG.API_URL, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }, 30000);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format received');
            }
            
            if (data.error) {
                throw new Error(data.message || 'API returned an error');
            }
            
            setCachedData(data);
            console.log('Data fetched and cached successfully');
        }
        
        // Process with categorization
        const categorizedProducts = processProductsWithCategories(data.products || []);
        
        currentData = {
            ...data,
            products: categorizedProducts
        };
        
        filteredProducts = categorizedProducts;
        
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
 * Create enhanced product card
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
 * Render updates section with type and priority badges
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
    
    // Render updates with badges
    const updatesHtml = product.updates.slice(0, 3).map(update => {
        const typeColor = getUpdateTypeColor(update.type);
        const priorityBadge = update.priority !== 'Normal' ? 
            `<span class="priority-badge priority-${update.priority.toLowerCase()}">${update.priority}</span>` : '';
        
        return `
            <div class="update-item">
                <div class="update-title">
                    <a href="${escapeHtml(update.link)}" target="_blank" rel="noopener">
                        ${escapeHtml(update.title)}
                    </a>
                    <div>
                        <span class="update-type-badge" style="background-color: ${typeColor};">${update.type}</span>
                        ${priorityBadge}
                    </div>
                </div>
                <div class="update-meta">
                    <span class="update-date">${formatDate(update.date)}</span>
                    <a href="${escapeHtml(update.link)}" target="_blank" rel="noopener" class="update-link">
                        Read more →
                    </a>
                </div>
                ${update.summary ? `<div class="update-summary">${escapeHtml(update.summary)}</div>` : ''}
            </div>
        `;
    }).join('');
    
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
 * Get color for update type badges
 */
function getUpdateTypeColor(type) {
    const colors = {
        'New Features': '#48bb78',
        'Improvements': '#4299e1',
        'Bug Fixes': '#ed8936',
        'Security': '#e53e3e',
        'API Changes': '#805ad5',
        'General': '#718096'
    };
    return colors[type] || colors['General'];
}

/**
 * Update category statistics
 */
function updateCategoryStats() {
    if (!elements.categoryStats || !currentData) return;
    
    const stats = {};
    currentData.products.forEach(product => {
        const category = product.category;
        if (!stats[category]) {
            stats[category] = { products: 0, updates: 0 };
        }
        stats[category].products++;
        stats[category].updates += product.updates ? product.updates.length : 0;
    });
    
    const statsHtml = Object.entries(stats)
        .sort(([,a], [,b]) => b.updates - a.updates)
        .map(([category, data]) => `
            <div class="stat-item">
                <span class="stat-category">${category}</span>
                <span class="stat-count">${data.products} products, ${data.updates} updates</span>
            </div>
        `).join('');
    
    elements.categoryStats.innerHTML = `
        <h3>Category Overview</h3>
        <div class="stats-grid">
            ${statsHtml}
        </div>
    `;
    
    elements.categoryStats.classList.remove('hidden');
}

/**
 * Update filter summary
 */
function updateFilterSummary() {
    if (!elements.filterSummary) return;
    
    const totalProducts = currentData ? currentData.products.length : 0;
    const filteredCount = filteredProducts.length;
    
    if (filteredCount === totalProducts) {
        elements.filterSummary.classList.add('hidden');
        return;
    }
    
    elements.filterSummary.innerHTML = `
        Showing ${filteredCount} of ${totalProducts} products
    `;
    elements.filterSummary.classList.remove('hidden');
}

/**
 * Update active filters display
 */
function updateActiveFilters() {
    if (!elements.activeFilters) return;
    
    const activeFilters = [];
    
    if (selectedFilters.category !== 'All') {
        activeFilters.push({
            type: 'category',
            value: selectedFilters.category,
            label: `Category: ${selectedFilters.category}`
        });
    }
    
    if (selectedFilters.updateType !== 'All') {
        activeFilters.push({
            type: 'updateType',
            value: selectedFilters.updateType,
            label: `Type: ${selectedFilters.updateType}`
        });
    }
    
    if (selectedFilters.priority !== 'All') {
        activeFilters.push({
            type: 'priority',
            value: selectedFilters.priority,
            label: `Priority: ${selectedFilters.priority}`
        });
    }
    
    const searchQuery = elements.searchInput.value.trim();
    if (searchQuery) {
        activeFilters.push({
            type: 'search',
            value: searchQuery,
            label: `Search: "${searchQuery}"`
        });
    }
    
    if (activeFilters.length === 0) {
        elements.activeFilters.innerHTML = '';
        return;
    }
    
    const filtersHtml = activeFilters.map(filter => `
        <div class="active-filter">
            ${filter.label}
            <span class="remove-filter" onclick="removeFilter('${filter.type}', '${filter.value}')">×</span>
        </div>
    `).join('');
    
    elements.activeFilters.innerHTML = filtersHtml;
}

/**
 * Remove active filter
 */
function removeFilter(type, value) {
    if (type === 'category') {
        selectedFilters.category = 'All';
        elements.categoryFilter.value = 'All';
    } else if (type === 'updateType') {
        selectedFilters.updateType = 'All';
        elements.updateTypeFilter.value = 'All';
    } else if (type === 'priority') {
        selectedFilters.priority = 'All';
        elements.priorityFilter.value = 'All';
    } else if (type === 'search') {
        elements.searchInput.value = '';
    }
    
    applyFilters();
}

/**
 * Update status bar
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
        elements.categoryStats.classList.add('hidden');
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
    elements.categoryStats.classList.add('hidden');
    
    // Try to show cached data as fallback
    const cachedData = getCachedData();
    if (cachedData) {
        console.log('Showing cached data as fallback');
        const categorizedProducts = processProductsWithCategories(cachedData.products || []);
        currentData = { ...cachedData, products: categorizedProducts };
        filteredProducts = categorizedProducts;
        renderProducts();
        updateStatusBar(cachedData.fetched_at, true);
        updateCategoryStats();
        updateFilterSummary();
        updateActiveFilters();
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
        errorMessage = 'API endpoint not configured. Please update the API_URL in script.js with your deployment URL.';
    }
    
    elements.errorMessage.textContent = errorMessage;
    elements.error.classList.remove('hidden');
}

/**
 * Show/hide states
 */
function hideError() {
    elements.error.classList.add('hidden');
}

function showEmptyState() {
    elements.productsGrid.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
}

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
function fetchWithTimeout(url, options, timeout) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

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
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
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

// Make removeFilter available globally for onclick handlers
window.removeFilter = removeFilter;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}