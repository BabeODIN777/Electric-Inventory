// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.time('App initialization');
    
    // Initialize core systems first
    initTabs();
    initAddItem();
    initInventory();
    initSettings();
    initModal();
    initSettingsTabs();  // Add this
    
    // Load data
    loadCompanies();
    loadInventory();
    loadSettings();
    
    // Initialize OCR system
    console.log('Initializing OCR system...');
    try {
        ocrProcessor = new InvoiceOCRProcessor();
        console.log('OCR system initialized');
    } catch (error) {
        console.error('Failed to initialize OCR system:', error);
    }
    
    // Initialize data optimizer
    try {
        dataOptimizer = new DataOptimizer();
        console.log('Data optimizer initialized');
    } catch (error) {
        console.error('Failed to initialize data optimizer:', error);
    }
    
    // Update UI
    updateStats();
    updateAppDate();
    
    // Setup auto-backup
    setupAutoBackup();
    
    // Auto-optimize if needed
    setTimeout(() => {
        if (dataOptimizer) {
            dataOptimizer.autoOptimize();
            updateDataStats();
        }
    }, 1000);
    
    console.timeEnd('App initialization');
    console.log('App fully initialized');
});

// Update app date
function updateAppDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    document.getElementById('app-date').textContent = now.toLocaleDateString('km-KH', options);
}

// Tab Navigation
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show active tab pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Refresh data when switching to inventory tab
            if (tabId === 'inventory') {
                loadInventory();
                loadCompanyFilter();
                loadCategoryFilter();
            }
        });
    });
}

// Initialize Modal
function initModal() {
    const modal = document.getElementById('company-modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    const addCompanyBtn = document.getElementById('add-new-company');
    const addCompanyBtn2 = document.getElementById('add-company-btn');
    
    // Open modal for adding new company
    addCompanyBtn.addEventListener('click', () => openCompanyModal());
    addCompanyBtn2.addEventListener('click', () => openCompanyModal());
    
    // Close modal
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
            resetCompanyForm();
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            resetCompanyForm();
        }
    });
    
    // Handle company form submission
    document.getElementById('company-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCompany();
    });
}

// Open company modal
function openCompanyModal(companyId = null) {
    const modal = document.getElementById('company-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('company-form');
    
    if (companyId) {
        // Edit mode
        const companies = JSON.parse(localStorage.getItem('companies')) || [];
        const company = companies.find(c => c.id === companyId);
        
        if (company) {
            title.textContent = 'កែប្រែក្រុមហ៊ុន';
            document.getElementById('modal-company-id').value = company.id;
            document.getElementById('modal-company-name').value = company.name;
            document.getElementById('modal-company-code').value = company.code || '';
            document.getElementById('modal-company-contact').value = company.contact || '';
            document.getElementById('modal-company-phone').value = company.phone || '';
            document.getElementById('modal-company-email').value = company.email || '';
            document.getElementById('modal-company-notes').value = company.notes || '';
        }
    } else {
        // Add mode
        title.textContent = 'បន្ថែមក្រុមហ៊ុនថ្មី';
        resetCompanyForm();
    }
    
    modal.classList.add('active');
}

// Reset company form
function resetCompanyForm() {
    const form = document.getElementById('company-form');
    form.reset();
    document.getElementById('modal-company-id').value = '';
    document.getElementById('modal-title').textContent = 'បន្ថែមក្រុមហ៊ុនថ្មី';
}

// Save company
function saveCompany() {
    const companyId = document.getElementById('modal-company-id').value;
    const companyName = document.getElementById('modal-company-name').value.trim();
    
    if (!companyName) {
        alert('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន!');
        return;
    }
    
    const company = {
        id: companyId || Date.now(),
        name: companyName,
        code: document.getElementById('modal-company-code').value.trim(),
        contact: document.getElementById('modal-company-contact').value.trim(),
        phone: document.getElementById('modal-company-phone').value.trim(),
        email: document.getElementById('modal-company-email').value.trim(),
        notes: document.getElementById('modal-company-notes').value.trim(),
        createdAt: companyId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    let companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    if (companyId) {
        // Update existing company
        const index = companies.findIndex(c => c.id === parseInt(companyId));
        if (index !== -1) {
            companies[index] = { ...companies[index], ...company };
        }
    } else {
        // Add new company
        companies.push(company);
    }
    
    localStorage.setItem('companies', JSON.stringify(companies));
    
    // Close modal and reset form
    document.getElementById('company-modal').classList.remove('active');
    resetCompanyForm();
    
    // Update UI
    loadCompanies();
    loadCompanyFilter();
    loadCompanySelect();
    
    alert(companyId ? 'ក្រុមហ៊ុនត្រូវបានកែប្រែដោយជោគជ័យ!' : 'ក្រុមហ៊ុនត្រូវបានបន្ថែមដោយជោគជ័យ!');
}

// Load companies for select dropdown
function loadCompanies() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const companyListBody = document.getElementById('company-list-body');
    
    companyListBody.innerHTML = '';
    
    if (companies.length === 0) {
        companyListBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px; color: #6c757d;">
                    <i class="fas fa-building" style="font-size: 2.5rem; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    មិនទាន់មានក្រុមហ៊ុនទេ។ សូមបន្ថែមក្រុមហ៊ុនថ្មី!
                </td>
            </tr>
        `;
        return;
    }
    
    // Get inventory to count items per company
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    
    companies.forEach((company, index) => {
        const itemCount = inventory.filter(item => item.company === company.name).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong>${company.name}</strong>
                ${company.code ? `<br><small class="text-muted">កូដ: ${company.code}</small>` : ''}
                ${company.contact ? `<br><small>ទំនាក់ទំនង: ${company.contact}</small>` : ''}
            </td>
            <td>${itemCount} ទំនិញ</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="openCompanyModal(${company.id})">
                        <i class="fas fa-edit"></i> កែប្រែ
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteCompany(${company.id})" ${itemCount > 0 ? 'disabled title="មិនអាចលុប ព្រោះមានទំនិញជាប់ទាក់ទង"' : ''}>
                        <i class="fas fa-trash"></i> លុប
                    </button>
                </div>
            </td>
        `;
        
        if (itemCount > 0) {
            row.querySelector('.delete-btn').classList.add('disabled');
        }
        
        companyListBody.appendChild(row);
    });
}

// Delete company
function deleteCompany(companyId) {
    if (!confirm('តើអ្នកពិតជាចង់លុបក្រុមហ៊ុននេះមែនឬទេ?')) return;
    
    let companies = JSON.parse(localStorage.getItem('companies')) || [];
    companies = companies.filter(c => c.id !== companyId);
    
    localStorage.setItem('companies', JSON.stringify(companies));
    loadCompanies();
    loadCompanyFilter();
    loadCompanySelect();
    
    alert('ក្រុមហ៊ុនត្រូវបានលុបដោយជោគជ័យ!');
}

// Load company select for add item form
function loadCompanySelect() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const select = document.getElementById('item-company');
    
    // Save current value
    const currentValue = select.value;
    
    // Clear existing options except first one
    select.innerHTML = '<option value="">-- ជ្រើសរើសក្រុមហ៊ុន --</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name + (company.code ? ` (${company.code})` : '');
        select.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (currentValue && companies.some(c => c.name === currentValue)) {
        select.value = currentValue;
    }
}

// Load company filter for inventory
function loadCompanyFilter() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const select = document.getElementById('filter-company');
    
    // Save current value
    const currentValue = select.value;
    
    // Clear existing options except "All"
    select.innerHTML = '<option value="all">ទាំងអស់</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
    
    // Restore selected value
    if (currentValue) {
        select.value = currentValue;
    }
}

// Load category filter for inventory
function loadCategoryFilter() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const select = document.getElementById('filter-category');
    
    // Get unique categories
    const categories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
    
    // Save current value
    const currentValue = select.value;
    
    // Clear existing options except "All"
    select.innerHTML = '<option value="all">ទាំងអស់</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    // Restore selected value
    if (currentValue) {
        select.value = currentValue;
    }
}

// Add Item Tab
function initAddItem() {
    const form = document.getElementById('add-item-form');
    const resetBtn = document.getElementById('reset-form');
    const dateInput = document.getElementById('item-date');
    
    // Load company select
    loadCompanySelect();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const company = document.getElementById('item-company').value.trim();
        const itemName = document.getElementById('item-name').value.trim();
        const quantity = parseInt(document.getElementById('item-quantity').value);
        const price = parseFloat(document.getElementById('item-price').value) || 0;
        const date = document.getElementById('item-date').value;
        const category = document.getElementById('item-category').value.trim();
        const notes = document.getElementById('item-notes').value.trim();
        
        if (!company) {
            alert('សូមជ្រើសរើសក្រុមហ៊ុន!');
            return;
        }
        
        if (!itemName || isNaN(quantity) || quantity < 0) {
            alert('សូមបញ្ចូលឈ្មោះទំនិញ និងចំនួនដែលត្រឹមត្រូវ!');
            return;
        }
        
        const item = {
            id: Date.now(),
            company: company,
            name: itemName,
            quantity: quantity,
            price: price,
            date: date,
            category: category,
            notes: notes,
            addedDate: new Date().toISOString()
        };
        
        // Get existing inventory
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventory.push(item);
        
        // Save to localStorage
        localStorage.setItem('inventory', JSON.stringify(inventory));
        
        // Update UI
        addRecentItem(item);
        updateStats();
        loadCategoryFilter();
        
        // Reset form
        form.reset();
        dateInput.value = today;
        
        alert('ទំនិញត្រូវបានបន្ថែមដោយជោគជ័យ!');
        
        // Switch to inventory tab
        document.querySelector('[data-tab="inventory"]').click();
    });
    
    resetBtn.addEventListener('click', () => {
        form.reset();
        dateInput.value = today;
    });
}

// Inventory Management
function initInventory() {
    // Export to Excel
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    
    // Export to CSV
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    
    // Print inventory
    document.getElementById('print-inventory').addEventListener('click', printInventory);
    
    // Delete all items
    document.getElementById('delete-all').addEventListener('click', () => {
        if (confirm('តើអ្នកពិតជាចង់លុបទំនិញទាំងអស់មែនឬទេ?')) {
            localStorage.removeItem('inventory');
            loadInventory();
            updateStats();
            loadCategoryFilter();
            alert('ទំនិញទាំងអស់ត្រូវបានលុបដោយជោគជ័យ!');
        }
    });
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('filter-company').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-stock').value = 'all';
        document.getElementById('search-items').value = '';
        document.getElementById('sort-by').value = 'date-desc';
        loadInventory();
    });
    
    // Initialize filters event listeners
    initFilters();
    
    // Initialize table sorting
    initTableSorting();
}

// Initialize filters
function initFilters() {
    const filterCompany = document.getElementById('filter-company');
    const filterCategory = document.getElementById('filter-category');
    const filterStock = document.getElementById('filter-stock');
    const sortBy = document.getElementById('sort-by');
    const searchItems = document.getElementById('search-items');
    
    // Add event listeners for filters
    [filterCompany, filterCategory, filterStock, sortBy].forEach(filter => {
        filter.addEventListener('change', () => {
            loadInventory();
        });
    });
    
    // Add debounced search
    let searchTimeout;
    searchItems.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadInventory();
        }, 300);
    });
}

// Initialize table sorting
function initTableSorting() {
    const headers = document.querySelectorAll('#inventory-table th[data-sort]');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.getAttribute('data-sort');
            const currentSort = document.getElementById('sort-by').value;
            let newSort;
            
            // Determine new sort direction
            if (currentSort.startsWith(sortKey)) {
                newSort = currentSort.endsWith('-asc') ? `${sortKey}-desc` : `${sortKey}-asc`;
            } else {
                newSort = `${sortKey}-asc`;
            }
            
            document.getElementById('sort-by').value = newSort;
            loadInventory();
        });
    });
}

// Load inventory from localStorage with filters
function loadInventory() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const tbody = document.getElementById('inventory-list');
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const lowStockThreshold = settings.lowStockThreshold || 5;
    
    // Apply filters
    const filterCompany = document.getElementById('filter-company').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterStock = document.getElementById('filter-stock').value;
    const searchTerm = document.getElementById('search-items').value.toLowerCase();
    const sortBy = document.getElementById('sort-by').value;
    
    // Filter by company
    if (filterCompany !== 'all') {
        inventory = inventory.filter(item => item.company === filterCompany);
    }
    
    // Filter by category
    if (filterCategory !== 'all') {
        inventory = inventory.filter(item => item.category === filterCategory);
    }
    
    // Filter by stock status
    if (filterStock !== 'all') {
        switch(filterStock) {
            case 'in-stock':
                inventory = inventory.filter(item => item.quantity > lowStockThreshold);
                break;
            case 'out-of-stock':
                inventory = inventory.filter(item => item.quantity === 0);
                break;
            case 'low-stock':
                inventory = inventory.filter(item => item.quantity > 0 && item.quantity <= lowStockThreshold);
                break;
        }
    }
    
    // Search filter
    if (searchTerm) {
        inventory = inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.company.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm)) ||
            (item.notes && item.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort inventory
    inventory.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'quantity-asc':
                return a.quantity - b.quantity;
            case 'quantity-desc':
                return b.quantity - a.quantity;
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'company-asc':
                return (a.company || '').localeCompare(b.company || '');
            case 'company-desc':
                return (b.company || '').localeCompare(a.company || '');
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });
    
    // Clear table
    tbody.innerHTML = '';
    
    if (inventory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 50px; color: #6c757d;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; display: block; opacity: 0.5;"></i>
                    <h3 style="margin-bottom: 10px;">មិនមានទំនិញតាមលក្ខខណ្ឌដែលបានជ្រើសរើស</h3>
                    <p>សូមផ្លាស់ប្តូរតម្រង ឬបន្ថែមទំនិញថ្មី។</p>
                </td>
            </tr>
        `;
        updateShowingCount(0, 0);
        return;
    }
    
    // Get currency from settings
    const currency = settings.currency || '$';
    
    // Populate table
    inventory.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Add class for stock status
        if (item.quantity === 0) {
            row.classList.add('out-of-stock');
        } else if (item.quantity <= lowStockThreshold) {
            row.classList.add('low-stock');
        }
        
        // Format date
        const formattedDate = formatDate(item.date, settings.dateFormat);
        
        // Format price with currency
        const formattedPrice = formatPrice(item.price, currency);
        
        row.innerHTML = `
            <td><strong>${item.company}</strong></td>
            <td>
                <div style="font-weight: 600; color: #1e3c72;">${item.name}</div>
                ${item.notes ? `<small style="color: #6c757d; font-size: 0.85rem;">${item.notes}</small>` : ''}
            </td>
            <td>${item.category || '-'}</td>
            <td>
                <span class="quantity-badge">${item.quantity}</span>
                ${item.quantity === 0 ? '<span class="stock-status out-of-stock-status">អស់ស្តុក</span>' : 
                  item.quantity <= lowStockThreshold ? '<span class="stock-status low-stock-status">ស្តុកទាប</span>' : 
                  '<span class="stock-status in-stock-status">មានស្តុក</span>'}
            </td>
            <td style="font-weight: 600; color: #28a745;">${formattedPrice}</td>
            <td>${formattedDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editItem(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteItem(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update showing count
    updateShowingCount(inventory.length, JSON.parse(localStorage.getItem('inventory') || '[]').length);
    
    // Update company summary
    updateCompanySummary();
}

// Update showing count
function updateShowingCount(showing, total) {
    document.getElementById('showing-count').textContent = showing;
    document.getElementById('total-count').textContent = total;
}

// Update company summary
function updateCompanySummary() {
    const filterCompany = document.getElementById('filter-company').value;
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const currency = settings.currency || '$';
    
    let summary = '';
    
    if (filterCompany === 'all') {
        // Show summary for all companies
        const companies = JSON.parse(localStorage.getItem('companies')) || [];
        const companyCount = companies.length;
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        summary = `${companyCount} ក្រុមហ៊ុន • តម្លៃសរុប: ${formatPrice(totalValue, currency)}`;
    } else {
        // Show summary for selected company
        const companyItems = inventory.filter(item => item.company === filterCompany);
        const itemCount = companyItems.length;
        const totalValue = companyItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        summary = `${itemCount} ទំនិញ • តម្លៃសរុប: ${formatPrice(totalValue, currency)}`;
    }
    
    document.getElementById('company-summary').textContent = summary;
}

// Format price with currency
function formatPrice(price, currency) {
    const formatter = new Intl.NumberFormat('km-KH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    switch(currency) {
        case '$':
            return `$${formatter.format(price)}`;
        case '៛':
            return `${formatter.format(price)}៛`;
        case '€':
            return `€${formatter.format(price)}`;
        case '¥':
            return `¥${formatter.format(price)}`;
        default:
            return `$${formatter.format(price)}`;
    }
}

// Initialize Settings Tabs
function initSettingsTabs() {
    const settingsTabButtons = document.querySelectorAll('.settings-tab-btn');
    const settingsPanes = document.querySelectorAll('.settings-pane');
    
    settingsTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const settingsId = button.getAttribute('data-settings');
            
            // Update active tab button
            settingsTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show active tab pane
            settingsPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(settingsId + '-settings').classList.add('active');
        });
    });
    
    // Initialize OCR settings form
    initOCRSettingsForm();
}

// Initialize OCR Settings Form
function initOCRSettingsForm() {
    const form = document.getElementById('ocr-settings-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveOCRSettings();
        });
        
        // Update confidence value display
        const confidenceSlider = document.getElementById('ocr-confidence');
        const confidenceValue = document.getElementById('confidence-value');
        
        if (confidenceSlider && confidenceValue) {
            confidenceSlider.addEventListener('input', function() {
                confidenceValue.textContent = this.value + '%';
            });
        }
    }
}

// Save OCR Settings
function saveOCRSettings() {
    const settings = JSON.parse(localStorage.getItem('ocrSettings') || '{}');
    
    settings.defaultLanguage = document.getElementById('default-ocr-language').value;
    settings.confidence = parseInt(document.getElementById('ocr-confidence').value);
    settings.autoDetectItems = document.getElementById('auto-detect-items').checked;
    settings.pricePatterns = document.getElementById('price-patterns').value;
    settings.quantityPatterns = document.getElementById('quantity-patterns').value;
    
    localStorage.setItem('ocrSettings', JSON.stringify(settings));
    alert('ការកំណត់ OCR ត្រូវបានរក្សាទុក!');
}

// Initialize OCR System
function initOCRSystem() {
    // Load OCR settings
    loadOCRSettings();
    
    // Initialize OCR processor when needed
    document.querySelector('[data-tab="ocr-invoice"]').addEventListener('click', function() {
        // Initialize OCR processor on first visit to OCR tab
        if (typeof window.ocrProcessor === 'undefined') {
            window.ocrProcessor = new InvoiceOCRProcessor();
        }
    });
}

// Load OCR Settings to Form
function loadOCRSettings() {
    let settings = JSON.parse(localStorage.getItem('ocrSettings') || '{}');
    
    // Set defaults
    if (!settings.defaultLanguage) settings.defaultLanguage = 'khm';
    if (!settings.confidence) settings.confidence = 70;
    if (!settings.autoDetectItems) settings.autoDetectItems = true;
    if (!settings.pricePatterns) settings.pricePatterns = 'USD\\s*(\\d+\\.?\\d*)|\\$\\s*(\\d+\\.?\\d*)|៛\\s*(\\d+\\.?\\d*)';
    if (!settings.quantityPatterns) settings.quantityPatterns = 'QTY\\s*(\\d+)|Quantity\\s*(\\d+)|ចំនួន\\s*(\\d+)|បរិមាណ\\s*(\\d+)';
    
    // Update form if exists
    if (document.getElementById('default-ocr-language')) {
        document.getElementById('default-ocr-language').value = settings.defaultLanguage;
        document.getElementById('ocr-confidence').value = settings.confidence;
        document.getElementById('confidence-value').textContent = settings.confidence + '%';
        document.getElementById('auto-detect-items').checked = settings.autoDetectItems;
        document.getElementById('price-patterns').value = settings.pricePatterns;
        document.getElementById('quantity-patterns').value = settings.quantityPatterns;
    }
    
    localStorage.setItem('ocrSettings', JSON.stringify(settings));
}

// Settings Management
function initSettings() {
    // Company settings form
    document.getElementById('company-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCompanySettings();
    });
    
    // General settings form
    document.getElementById('general-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveGeneralSettings();
    });
    
    // Reset settings
    document.getElementById('reset-settings').addEventListener('click', () => {
        if (confirm('តើអ្នកពិតជាចង់កំណត់ការកំណត់ទាំងអស់ឡើងវិញមែនឬទេ?')) {
            const defaultSettings = {
                companyName: '',
                address: '',
                phone: '',
                email: '',
                dateFormat: 'dd/mm/yyyy',
                currency: '$',
                lowStockThreshold: 5,
                itemsPerPage: 20
            };
            
            localStorage.setItem('settings', JSON.stringify(defaultSettings));
            loadSettings();
            alert('ការកំណត់ត្រូវបានកំណត់ឡើងវិញ!');
        }
    });
    
    // Search company in settings
    document.getElementById('search-company').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#company-list tbody tr');
        
        rows.forEach(row => {
            const companyName = row.cells[1].textContent.toLowerCase();
            row.style.display = companyName.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Save company settings
function saveCompanySettings() {
    const companyName = document.getElementById('company-name').value.trim();
    
    if (!companyName) {
        alert('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុនសំខាន់!');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    settings.companyName = companyName;
    settings.address = document.getElementById('company-address').value.trim();
    settings.phone = document.getElementById('company-phone').value.trim();
    settings.email = document.getElementById('company-email').value.trim();
    
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Update company name display
    document.getElementById('company-name-display').textContent = companyName;
    
    alert('ការកំណត់ក្រុមហ៊ុនត្រូវបានរក្សាទុក!');
}

// Save general settings
function saveGeneralSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    settings.dateFormat = document.getElementById('date-format').value;
    settings.currency = document.getElementById('currency').value;
    settings.lowStockThreshold = parseInt(document.getElementById('low-stock-threshold').value) || 5;
    settings.itemsPerPage = parseInt(document.getElementById('items-per-page').value) || 20;
    
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Reload inventory to apply new settings
    loadInventory();
    updateStats();
    
    alert('ការកំណត់ទូទៅត្រូវបានរក្សាទុក!');
}

// Load settings from localStorage
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    // Company settings
    document.getElementById('company-name').value = settings.companyName || '';
    document.getElementById('company-address').value = settings.address || '';
    document.getElementById('company-phone').value = settings.phone || '';
    document.getElementById('company-email').value = settings.email || '';
    
    // General settings
    document.getElementById('date-format').value = settings.dateFormat || 'dd/mm/yyyy';
    document.getElementById('currency').value = settings.currency || '$';
    document.getElementById('low-stock-threshold').value = settings.lowStockThreshold || 5;
    document.getElementById('items-per-page').value = settings.itemsPerPage || 20;
    
    // Update company name display
    document.getElementById('company-name-display').textContent = settings.companyName || 'ក្រុមហ៊ុនរបស់អ្នក';
}

// Update statistics
function updateStats() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const lowStockThreshold = settings.lowStockThreshold || 5;
    const currency = settings.currency || '$';
    
    const totalItems = inventory.length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const totalCompanies = companies.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('out-of-stock').textContent = outOfStock;
    document.getElementById('total-companies').textContent = totalCompanies;
    document.getElementById('total-value').textContent = formatPrice(totalValue, currency);
    
    // Update recent items
    updateRecentItems();
    
    // Update data stats
    const inventorySize = JSON.stringify(inventory).length;
    const companiesSize = JSON.stringify(companies).length;
    const totalSize = ((inventorySize + companiesSize) / 1024).toFixed(2);
    document.getElementById('data-stats').innerHTML = `
        កាលបរិច្ឆេទ: <span id="app-date"></span><br>
        ទំហំទិន្នន័យ: ${totalSize} KB
    `;
    updateAppDate();
}

// Add recent item display
function addRecentItem(item) {
    const recentItemsDiv = document.getElementById('recent-items');
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const formattedDate = formatDate(item.date, settings.dateFormat);
    const currency = settings.currency || '$';
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'recent-item';
    itemDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h4>${item.name}</h4>
                <p style="color: #1e3c72; font-weight: 600;">${item.company}</p>
            </div>
            <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                ${item.quantity} គ្រឿង
            </span>
        </div>
        ${item.category ? `<p><i class="fas fa-tag"></i> ${item.category}</p>` : ''}
        <p><i class="fas fa-money-bill-wave"></i> ${formatPrice(item.price, currency)}</p>
        <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
        <small>បានបន្ថែម: ${new Date(item.addedDate).toLocaleString('km-KH')}</small>
    `;
    
    recentItemsDiv.insertBefore(itemDiv, recentItemsDiv.firstChild);
    
    // Keep only last 6 items
    const items = recentItemsDiv.querySelectorAll('.recent-item');
    if (items.length > 6) {
        recentItemsDiv.removeChild(items[items.length - 1]);
    }
}

function updateRecentItems() {
    const recentItemsDiv = document.getElementById('recent-items');
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const currency = settings.currency || '$';
    
    recentItemsDiv.innerHTML = '';
    
    // Show last 6 items
    const recentItems = inventory.slice(-6).reverse();
    
    if (recentItems.length === 0) {
        recentItemsDiv.innerHTML = `
            <div style="text-align: center; color: #6c757d; padding: 20px;">
                <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                <p>មិនទាន់មានទំនិញថ្មីៗ</p>
            </div>
        `;
        return;
    }
    
    recentItems.forEach(item => {
        const formattedDate = formatDate(item.date, settings.dateFormat);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'recent-item';
        itemDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4>${item.name}</h4>
                    <p style="color: #1e3c72; font-weight: 600;">${item.company}</p>
                </div>
                <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                    ${item.quantity} គ្រឿង
                </span>
            </div>
            ${item.category ? `<p><i class="fas fa-tag"></i> ${item.category}</p>` : ''}
            <p><i class="fas fa-money-bill-wave"></i> ${formatPrice(item.price, currency)}</p>
            <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
            <small>បានបន្ថែម: ${new Date(item.addedDate).toLocaleString('km-KH')}</small>
        `;
        recentItemsDiv.appendChild(itemDiv);
    });
}

// Format date based on settings
function formatDate(dateString, format) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    switch(format) {
        case 'dd/mm/yyyy':
            return `${day}/${month}/${year}`;
        case 'mm/dd/yyyy':
            return `${month}/${day}/${year}`;
        case 'yyyy-mm-dd':
            return `${year}-${month}-${day}`;
        default:
            return `${day}/${month}/${year}`;
    }
}

// Delete item
function deleteItem(itemId) {
    if (!confirm('តើអ្នកពិតជាចង់លុបទំនិញនេះមែនឬទេ?')) return;
    
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    inventory = inventory.filter(item => item.id !== itemId);
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    loadInventory();
    updateStats();
    loadCategoryFilter();
}

// Edit item
function editItem(itemId) {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const item = inventory.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Switch to add item tab
    document.querySelector('[data-tab="add-item"]').click();
    
    // Load companies first
    loadCompanySelect();
    
    // Fill form with item data
    setTimeout(() => {
        document.getElementById('item-company').value = item.company;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-date').value = item.date;
        document.getElementById('item-category').value = item.category || '';
        document.getElementById('item-notes').value = item.notes || '';
        
        // Update form to edit mode
        const form = document.getElementById('add-item-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Change submit button text
        submitBtn.innerHTML = '<i class="fas fa-edit"></i> កែប្រែទំនិញ';
        
        // Remove previous edit listener if exists
        form.removeEventListener('submit', handleEditSubmit);
        
        // Add edit listener
        function handleEditSubmit(e) {
            e.preventDefault();
            
            item.company = document.getElementById('item-company').value.trim();
            item.name = document.getElementById('item-name').value.trim();
            item.quantity = parseInt(document.getElementById('item-quantity').value);
            item.price = parseFloat(document.getElementById('item-price').value) || 0;
            item.date = document.getElementById('item-date').value;
            item.category = document.getElementById('item-category').value.trim();
            item.notes = document.getElementById('item-notes').value.trim();
            
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            // Reset form
            form.reset();
            document.getElementById('item-date').value = new Date().toISOString().split('T')[0];
            submitBtn.innerHTML = '<i class="fas fa-save"></i> រក្សាទុកទំនិញ';
            
            // Remove edit listener
            form.removeEventListener('submit', handleEditSubmit);
            
            loadInventory();
            updateStats();
            loadCategoryFilter();
            alert('ទំនិញត្រូវបានកែប្រែដោយជោគជ័យ!');
            
            // Switch to inventory tab
            document.querySelector('[data-tab="inventory"]').click();
        }
        
        form.addEventListener('submit', handleEditSubmit);
    }, 100);
}

// Export to Excel
function exportToExcel() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    if (inventory.length === 0) {
        alert('មិនទាន់មានទិន្នន័យទំនិញដើម្បីនាំចេញ!');
        return;
    }
    
    // Apply current filters
    const filterCompany = document.getElementById('filter-company').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterStock = document.getElementById('filter-stock').value;
    const searchTerm = document.getElementById('search-items').value.toLowerCase();
    const lowStockThreshold = settings.lowStockThreshold || 5;
    
    if (filterCompany !== 'all') {
        inventory = inventory.filter(item => item.company === filterCompany);
    }
    
    if (filterCategory !== 'all') {
        inventory = inventory.filter(item => item.category === filterCategory);
    }
    
    if (filterStock !== 'all') {
        switch(filterStock) {
            case 'in-stock':
                inventory = inventory.filter(item => item.quantity > lowStockThreshold);
                break;
            case 'out-of-stock':
                inventory = inventory.filter(item => item.quantity === 0);
                break;
            case 'low-stock':
                inventory = inventory.filter(item => item.quantity > 0 && item.quantity <= lowStockThreshold);
                break;
        }
    }
    
    if (searchTerm) {
        inventory = inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.company.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // Get currency
    const currency = settings.currency || '$';
    
    // Prepare data for Excel
    const excelData = [
        // Header
        ['ល.រ', 'ក្រុមហ៊ុន', 'ទំនិញ', 'ប្រភេទ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ', 'កំណត់ចំណាំ', 'ស្ថានភាពស្តុក'],
        // Data rows
        ...inventory.map((item, index) => {
            let stockStatus = 'មានស្តុក';
            if (item.quantity === 0) {
                stockStatus = 'អស់ស្តុក';
            } else if (item.quantity <= lowStockThreshold) {
                stockStatus = 'ស្តុកទាប';
            }
            
            return [
                index + 1,
                item.company,
                item.name,
                item.category || '-',
                item.quantity,
                formatPrice(item.price, currency),
                formatDate(item.date, settings.dateFormat),
                item.notes || '-',
                stockStatus
            ];
        })
    ];
    
    // Add summary row
    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    excelData.push(['']); // Empty row
    excelData.push(['សរុប:', '', '', '', totalQuantity, formatPrice(totalValue, currency), '', '', `${totalItems} ទំនិញ`]);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const wscols = [
        {wch: 5},   // No.
        {wch: 20},  // Company
        {wch: 30},  // Item name
        {wch: 15},  // Category
        {wch: 10},  // Quantity
        {wch: 12},  // Price
        {wch: 15},  // Date
        {wch: 25},  // Notes
        {wch: 12}   // Stock status
    ];
    ws['!cols'] = wscols;
    
    // Add company info sheet
    if (companies.length > 0) {
        const companyData = [
            ['ល.រ', 'ឈ្មោះក្រុមហ៊ុន', 'កូដ', 'ទំនាក់ទំនង', 'លេខទូរស័ព្ទ', 'អ៊ីមែល', 'កំណត់ចំណាំ'],
            ...companies.map((company, index) => [
                index + 1,
                company.name,
                company.code || '-',
                company.contact || '-',
                company.phone || '-',
                company.email || '-',
                company.notes || '-'
            ])
        ];
        
        const wsCompanies = XLSX.utils.aoa_to_sheet(companyData);
        wsCompanies['!cols'] = [
            {wch: 5},   // No.
            {wch: 25},  // Company name
            {wch: 10},  // Code
            {wch: 20},  // Contact
            {wch: 15},  // Phone
            {wch: 25},  // Email
            {wch: 30}   // Notes
        ];
        
        XLSX.utils.book_append_sheet(wb, wsCompanies, 'ក្រុមហ៊ុន');
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'ទំនិញ');
    
    // Generate filename
    const companyName = settings.companyName ? settings.companyName.replace(/\s+/g, '_') : 'Inventory';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${companyName}_ទំនិញ_${date}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
}

// Export to CSV
function exportToCSV() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    if (inventory.length === 0) {
        alert('មិនទាន់មានទិន្នន័យទំនិញដើម្បីនាំចេញ!');
        return;
    }
    
    // Get currency
    const currency = settings.currency || '$';
    
    // Prepare CSV content
    const headers = ['ល.រ', 'ក្រុមហ៊ុន', 'ទំនិញ', 'ប្រភេទ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ', 'ស្ថានភាពស្តុក'];
    const rows = inventory.map((item, index) => {
        let stockStatus = 'មានស្តុក';
        if (item.quantity === 0) {
            stockStatus = 'អស់ស្តុក';
        } else if (item.quantity <= (settings.lowStockThreshold || 5)) {
            stockStatus = 'ស្តុកទាប';
        }
        
        return [
            index + 1,
            item.company,
            `"${item.name}"`,
            item.category || '-',
            item.quantity,
            formatPrice(item.price, currency),
            formatDate(item.date, settings.dateFormat),
            stockStatus
        ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Print inventory
function printInventory() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    // Apply current filters
    const filterCompany = document.getElementById('filter-company').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterStock = document.getElementById('filter-stock').value;
    const searchTerm = document.getElementById('search-items').value.toLowerCase();
    const lowStockThreshold = settings.lowStockThreshold || 5;
    
    if (filterCompany !== 'all') {
        inventory = inventory.filter(item => item.company === filterCompany);
    }
    
    if (filterCategory !== 'all') {
        inventory = inventory.filter(item => item.category === filterCategory);
    }
    
    if (filterStock !== 'all') {
        switch(filterStock) {
            case 'in-stock':
                inventory = inventory.filter(item => item.quantity > lowStockThreshold);
                break;
            case 'out-of-stock':
                inventory = inventory.filter(item => item.quantity === 0);
                break;
            case 'low-stock':
                inventory = inventory.filter(item => item.quantity > 0 && item.quantity <= lowStockThreshold);
                break;
        }
    }
    
    if (searchTerm) {
        inventory = inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.company.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // Get currency
    const currency = settings.currency || '$';
    
    const printContent = document.getElementById('print-content');
    
    // Build printable HTML
    let html = `
        <style>
            @media print {
                @page {
                    margin: 0.5in;
                }
                body {
                    font-family: 'Khmer OS', 'Arial Unicode MS', Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px double #000;
                    padding-bottom: 20px;
                }
                .company-name {
                    font-size: 24pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #1e3c72;
                }
                .company-info {
                    font-size: 11pt;
                    color: #666;
                    margin-bottom: 5px;
                }
                .report-title {
                    font-size: 18pt;
                    margin: 25px 0;
                    text-align: center;
                    font-weight: bold;
                }
                .filter-info {
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    font-size: 10pt;
                }
                .inventory-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .inventory-table th {
                    background: #2c3e50;
                    color: white;
                    padding: 12px 8px;
                    text-align: left;
                    border: 1px solid #ddd;
                    font-weight: bold;
                }
                .inventory-table td {
                    padding: 10px 8px;
                    border: 1px solid #ddd;
                }
                .inventory-table tr:nth-child(even) {
                    background: #f9f9f9;
                }
                .quantity {
                    text-align: center;
                    font-weight: bold;
                }
                .price {
                    text-align: right;
                }
                .out-of-stock {
                    background: #ffeaea !important;
                    color: #d00;
                }
                .low-stock {
                    background: #fff3cd !important;
                }
                .summary {
                    margin-top: 30px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 5px;
                    font-size: 11pt;
                }
                .summary-item {
                    margin-bottom: 5px;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 10pt;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .page-break {
                    page-break-before: always;
                }
            }
        </style>
        <div class="print-header">
            <div class="company-name">${settings.companyName || 'ក្រុមហ៊ុន'}</div>
            <div class="company-info">${settings.address || ''}</div>
            <div class="company-info">ទូរស័ព្ទ: ${settings.phone || ''} ${settings.email ? '| អ៊ីមែល: ' + settings.email : ''}</div>
            <div class="company-info">កាលបរិច្ឆេទបោះពុម្ព: ${new Date().toLocaleDateString('km-KH')} ${new Date().toLocaleTimeString('km-KH')}</div>
        </div>
        <div class="report-title">បញ្ជីទំនិញក្នុងស្តុក</div>
    `;
    
    // Add filter info
    let filterInfo = [];
    if (filterCompany !== 'all') filterInfo.push(`ក្រុមហ៊ុន: ${filterCompany}`);
    if (filterCategory !== 'all') filterInfo.push(`ប្រភេទ: ${filterCategory}`);
    if (filterStock !== 'all') filterInfo.push(`ស្ថានភាពស្តុក: ${filterStock}`);
    if (searchTerm) filterInfo.push(`ការស្វែងរក: "${searchTerm}"`);
    
    if (filterInfo.length > 0) {
        html += `<div class="filter-info">ត្រងតាម: ${filterInfo.join(' | ')}</div>`;
    }
    
    if (inventory.length > 0) {
        // Calculate totals
        const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const outOfStockCount = inventory.filter(item => item.quantity === 0).length;
        const lowStockCount = inventory.filter(item => item.quantity > 0 && item.quantity <= lowStockThreshold).length;
        
        html += `
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>ល.រ</th>
                        <th>ក្រុមហ៊ុន</th>
                        <th>ទំនិញ</th>
                        <th>ប្រភេទ</th>
                        <th>ចំនួន</th>
                        <th>តម្លៃ</th>
                        <th>កាលបរិច្ឆេទ</th>
                        <th>ស្ថានភាព</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        inventory.forEach((item, index) => {
            let stockStatus = 'មានស្តុក';
            let rowClass = '';
            if (item.quantity === 0) {
                stockStatus = 'អស់ស្តុក';
                rowClass = 'out-of-stock';
            } else if (item.quantity <= lowStockThreshold) {
                stockStatus = 'ស្តុកទាប';
                rowClass = 'low-stock';
            }
            
            html += `
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td>${item.company}</td>
                    <td>${item.name}</td>
                    <td>${item.category || '-'}</td>
                    <td class="quantity">${item.quantity}</td>
                    <td class="price">${formatPrice(item.price, currency)}</td>
                    <td>${formatDate(item.date, settings.dateFormat)}</td>
                    <td>${stockStatus}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <div class="summary">
                <div class="summary-item"><strong>សរុបទំនិញ:</strong> ${inventory.length} ទំនិញ</div>
                <div class="summary-item"><strong>សរុបចំនួន:</strong> ${totalQuantity} គ្រឿង</div>
                <div class="summary-item"><strong>តម្លៃសរុប:</strong> ${formatPrice(totalValue, currency)}</div>
                <div class="summary-item"><strong>អស់ស្តុក:</strong> ${outOfStockCount} ទំនិញ</div>
                <div class="summary-item"><strong>ស្តុកទាប:</strong> ${lowStockCount} ទំនិញ</div>
            </div>
        `;
    } else {
        html += '<div style="text-align: center; padding: 40px; color: #666; font-size: 14pt;">មិនមានទំនិញតាមលក្ខខណ្ឌដែលបានជ្រើសរើស</div>';
    }
    
    html += `
        <div class="footer">
            <p>បង្កើតដោយ: ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ - ជំនាន់ក្រុមហ៊ុន</p>
            <p>ទំព័រ 1 នៃ 1 | បានបង្កើតនៅ: ${new Date().toLocaleString('km-KH')}</p>
        </div>
    `;
    
    printContent.innerHTML = html;
    
    // Trigger print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>បោះពុម្ពបញ្ជីទំនិញ - ${settings.companyName || 'ក្រុមហ៊ុន'}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            ${html}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 100);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Add CSS for dynamic elements
const style = document.createElement('style');
style.textContent = `
    .quantity-badge {
        display: inline-block;
        padding: 4px 8px;
        background: #e9ecef;
        border-radius: 12px;
        font-weight: bold;
        min-width: 40px;
        text-align: center;
    }
    
    .stock-status {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8rem;
        margin-left: 8px;
        font-weight: 600;
    }
    
    .out-of-stock-status {
        background: #ffeaea;
        color: #dc3545;
        border: 1px solid #f5c6cb;
    }
    
    .low-stock-status {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }
    
    .in-stock-status {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .text-muted {
        color: #6c757d !important;
    }
    
    .disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

    // Auto-backup feature
function setupAutoBackup() {
    // Backup every hour
    setInterval(createAutoBackup, 60 * 60 * 1000);
    
    // Backup when window closes
    window.addEventListener('beforeunload', function() {
        createAutoBackup();
    });
}

function createAutoBackup() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    const backup = {
        timestamp: new Date().toISOString(),
        inventory: inventory,
        companies: companies,
        settings: settings
    };
    
    // Save last 5 backups
    let backups = JSON.parse(localStorage.getItem('backups') || '[]');
    backups.push(backup);
    
    // Keep only last 5 backups
    if (backups.length > 5) {
        backups = backups.slice(-5);
    }
    
    localStorage.setItem('backups', JSON.stringify(backups));
}

// Initialize auto-backup
setupAutoBackup();
// ==============================================
// OCR INVOICE PROCESSING SYSTEM
// ==============================================

class InvoiceOCRProcessor {
    constructor() {
        this.currentImage = null;
        this.selectedAreas = [];
        this.ocrResults = [];
        this.parsedItems = [];
        this.isProcessing = false;
        this.currentStep = 0;
        this.canvas = null;
        this.ctx = null;
        this.selectionRect = null;
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.worker = null;
        
        this.initOCRProcessor();
    }
    
    initOCRProcessor() {
        this.createCanvas();
        this.setupEventListeners();
        this.loadOCRSettings();
    }
    
    createCanvas() {
        const preview = document.getElementById('image-preview');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Create selection rectangle
        this.selectionRect = document.createElement('div');
        this.selectionRect.className = 'selection-rectangle';
        this.selectionRect.style.display = 'none';
        
        preview.appendChild(this.canvas);
        preview.appendChild(this.selectionRect);
    }
    
    setupEventListeners() {
        // File upload
        const uploadInput = document.getElementById('invoice-upload');
        const dropArea = document.getElementById('drop-area');
        
        uploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.style.borderColor = '#2c5282';
                dropArea.style.background = '#ebf8ff';
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.style.borderColor = '#4a90e2';
                dropArea.style.background = '#f8fafc';
            }, false);
        });
        
        dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        // OCR buttons
        document.getElementById('select-area-btn').addEventListener('click', () => this.startAreaSelection());
        document.getElementById('clear-area-btn').addEventListener('click', () => this.clearSelectedAreas());
        document.getElementById('auto-detect-btn').addEventListener('click', () => this.autoDetectItems());
        document.getElementById('preview-ocr-btn').addEventListener('click', () => this.previewOCRResults());
        document.getElementById('add-all-items-btn').addEventListener('click', () => this.addAllItemsToInventory());
        document.getElementById('export-invoice-excel-btn').addEventListener('click', () => this.exportInvoiceToExcel());
        document.getElementById('clear-ocr-btn').addEventListener('click', () => this.resetOCRProcess());
        
        // Step navigation
        this.setupStepNavigation();
    }
    
    setupStepNavigation() {
        const steps = document.querySelectorAll('.ocr-step');
        
        // Initially show first step
        this.showStep(0);
        
        // Update progress bar
        this.updateProgressBar();
    }
    
    showStep(stepIndex) {
        document.querySelectorAll('.ocr-step').forEach((step, index) => {
            step.classList.toggle('active', index === stepIndex);
        });
        this.currentStep = stepIndex;
        this.updateProgressBar();
    }
    
    nextStep() {
        if (this.currentStep < 2) {
            this.showStep(this.currentStep + 1);
        }
    }
    
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    updateProgressBar() {
        const progress = ((this.currentStep + 1) / 3) * 100;
        document.getElementById('ocr-progress-bar').style.width = `${progress}%`;
        const stepNames = ['ការផ្ទុករូបភាព', 'ការកំណត់តំបន់', 'ការត្រួតពិនិត្យទិន្នន័យ'];
        document.getElementById('ocr-progress-text').textContent = 
            `ជំហាន ${this.currentStep + 1}/3: ${stepNames[this.currentStep]}`;
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }
    
    handleDrop(event) {
        const dt = event.dataTransfer;
        const file = dt.files[0];
        
        if (file && file.type.match('image.*')) {
            this.processImageFile(file);
        } else {
            alert('សូមផ្ទុកតែរូបភាពប៉ុណ្ណោះ!');
        }
    }
    
    async processImageFile(file) {
        try {
            this.showProcessing(true, 'កំពុងផ្ទុករូបភាព...');
            
            const imageUrl = URL.createObjectURL(file);
            await this.loadImage(imageUrl);
            
            // Update stats
            document.getElementById('image-stats').textContent = 
                `${file.name} (${Math.round(file.size / 1024)}KB)`;
            
            this.nextStep();
            this.showProcessing(false);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('មិនអាចផ្ទុករូបភាពបាន: ' + error.message);
            this.showProcessing(false);
        }
    }
    
    async loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                
                // Set canvas dimensions
                const maxWidth = 800;
                const scale = Math.min(maxWidth / img.width, 1);
                this.canvas.width = img.width * scale;
                this.canvas.height = img.height * scale;
                
                // Draw image on canvas
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                
                // Add click events for area selection
                this.setupCanvasEvents();
                
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
    
    setupCanvasEvents() {
        this.canvas.onmousedown = (e) => this.startSelection(e);
        this.canvas.onmousemove = (e) => this.updateSelection(e);
        this.canvas.onmouseup = () => this.endSelection();
        
        // Touch events for mobile
        this.canvas.ontouchstart = (e) => this.startSelection(e.touches[0]);
        this.canvas.ontouchmove = (e) => this.updateSelection(e.touches[0]);
        this.canvas.ontouchend = () => this.endSelection();
    }
    
    startAreaSelection() {
        this.isSelecting = true;
        this.canvas.style.cursor = 'crosshair';
        alert('អូសម៉ៅស៍ដើម្បីជ្រើសរើសតំបន់ដែលមានទិន្នន័យទំនិញ។');
    }
    
    startSelection(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        
        this.selectionRect.style.left = this.startX + 'px';
        this.selectionRect.style.top = this.startY + 'px';
        this.selectionRect.style.width = '0px';
        this.selectionRect.style.height = '0px';
        this.selectionRect.style.display = 'block';
    }
    
    updateSelection(e) {
        if (!this.isSelecting || !this.startX) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        
        this.selectionRect.style.width = Math.abs(width) + 'px';
        this.selectionRect.style.height = Math.abs(height) + 'px';
        this.selectionRect.style.left = (width > 0 ? this.startX : currentX) + 'px';
        this.selectionRect.style.top = (height > 0 ? this.startY : currentY) + 'px';
    }
    
    endSelection() {
        if (!this.isSelecting || !this.startX) return;
        
        this.isSelecting = false;
        this.canvas.style.cursor = 'default';
        
        const rect = this.selectionRect.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const area = {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top,
            width: rect.width,
            height: rect.height,
            id: Date.now()
        };
        
        this.selectedAreas.push(area);
        this.updateSelectedAreasDisplay();
        
        // Hide selection rectangle
        this.selectionRect.style.display = 'none';
        this.startX = 0;
        this.startY = 0;
    }
    
    updateSelectedAreasDisplay() {
        const container = document.getElementById('selected-areas');
        container.innerHTML = '';
        
        this.selectedAreas.forEach((area, index) => {
            const areaBox = document.createElement('div');
            areaBox.className = 'area-box';
            areaBox.innerHTML = `
                តំបន់ ${index + 1}
                <button onclick="ocrProcessor.removeArea(${area.id})">&times;</button>
            `;
            container.appendChild(areaBox);
        });
    }
    
    removeArea(areaId) {
        this.selectedAreas = this.selectedAreas.filter(area => area.id !== areaId);
        this.updateSelectedAreasDisplay();
    }
    
    clearSelectedAreas() {
        this.selectedAreas = [];
        this.updateSelectedAreasDisplay();
    }
    
    async autoDetectItems() {
        if (!this.currentImage) {
            alert('សូមផ្ទុករូបភាពមុន!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងស្វ័យប្រវត្តិស្វែងរកទំនិញ...');
        
        try {
            // Use Tesseract to detect text regions
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            // Get text blocks
            const { data: { blocks } } = await worker.recognize(this.canvas);
            
            // Filter blocks that likely contain items (based on size and position)
            const itemBlocks = blocks.filter(block => {
                // These heuristics can be adjusted based on your invoice format
                const hasNumbers = /\d/.test(block.text);
                const hasPrice = /[$៛€¥]|USD|riel|dollar/i.test(block.text);
                const reasonableSize = block.bbox.width > 50 && block.bbox.height > 20;
                
                return (hasNumbers || hasPrice) && reasonableSize;
            });
            
            // Convert blocks to selection areas
            this.selectedAreas = itemBlocks.map(block => ({
                x: block.bbox.x0,
                y: block.bbox.y0,
                width: block.bbox.x1 - block.bbox.x0,
                height: block.bbox.y1 - block.bbox.y0,
                id: Date.now() + Math.random()
            }));
            
            await worker.terminate();
            this.updateSelectedAreasDisplay();
            
            this.showProcessing(false);
            alert(`បានស្វែងរកបាន ${this.selectedAreas.length} តំបន់ដែលអាចមានទំនិញ។`);
        } catch (error) {
            console.error('Auto-detect error:', error);
            this.showProcessing(false);
            alert('មិនអាចស្វ័យប្រវត្តិស្វែងរកទំនិញបាន។');
        }
    }
    
    async previewOCRResults() {
        if (this.selectedAreas.length === 0) {
            alert('សូមជ្រើសរើសតំបន់មួយឬច្រើនសម្រាប់ OCR!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងដំណើរការ OCR...');
        
        try {
            this.ocrResults = [];
            this.parsedItems = [];
            
            // Get OCR language
            const language = document.getElementById('ocr-language').value;
            
            // Create worker
            this.worker = await Tesseract.createWorker();
            await this.worker.loadLanguage(language);
            await this.initializeWorker(language);
            
            // Process each selected area
            for (let i = 0; i < this.selectedAreas.length; i++) {
                const area = this.selectedAreas[i];
                
                // Update progress
                const progress = ((i + 1) / this.selectedAreas.length) * 100;
                this.showProcessing(true, `កំពុងដំណើរការ OCR តំបន់ ${i + 1}/${this.selectedAreas.length}...`);
                
                // Extract area from canvas
                const imageData = this.ctx.getImageData(area.x, area.y, area.width, area.height);
                
                // Create temporary canvas for the area
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = area.width;
                tempCanvas.height = area.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                // Perform OCR on the area
                const { data: { text, confidence } } = await this.worker.recognize(tempCanvas);
                
                this.ocrResults.push({
                    area: area,
                    text: text.trim(),
                    confidence: confidence
                });
                
                // Parse items from the text
                const items = this.parseItemsFromText(text);
                this.parsedItems.push(...items);
            }
            
            // Terminate worker
            await this.worker.terminate();
            this.worker = null;
            
            // Display results
            this.displayOCRResults();
            this.displayParsedItems();
            this.updateStats();
            
            // Move to next step
            this.nextStep();
            this.showProcessing(false);
            
        } catch (error) {
            console.error('OCR processing error:', error);
            this.showProcessing(false);
            alert('មានបញ្ហាក្នុងការដំណើរការ OCR: ' + error.message);
        }
    }
    
    async initializeWorker(language) {
        const settings = JSON.parse(localStorage.getItem('ocrSettings') || '{}');
        const confidence = settings.confidence || 70;
        
        await this.worker.initialize(language);
        await this.worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$៛€¥.,-+%កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវឝឞសហឡអឣឤឥឦឧឨឩឪឫឬឭឮឯឰឱឲឳ ',
            preserve_interword_spaces: '1',
            tessedit_pageseg_mode: '6', // Assume a single uniform block of text
            tessedit_ocr_engine_mode: '3', // Default + LSTM
        });
    }
    
    parseItemsFromText(text) {
        const items = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        // Load parsing patterns from settings
        const settings = JSON.parse(localStorage.getItem('ocrSettings') || '{}');
        const pricePatterns = (settings.pricePatterns || 'USD\\s*(\\d+\\.?\\d*)|\\$\\s*(\\d+\\.?\\d*)|៛\\s*(\\d+\\.?\\d*)').split('|');
        const quantityPatterns = (settings.quantityPatterns || 'QTY\\s*(\\d+)|Quantity\\s*(\\d+)|ចំនួន\\s*(\\d+)|បរិមាណ\\s*(\\d+)').split('|');
        
        // Try to detect items using multiple strategies
        lines.forEach((line, index) => {
            // Strategy 1: Look for price patterns
            let price = null;
            let quantity = 1;
            let itemName = '';
            
            // Extract price
            for (const pattern of pricePatterns) {
                const regex = new RegExp(pattern, 'i');
                const match = line.match(regex);
                if (match) {
                    price = parseFloat(match[1] || match[2] || match[3] || 0);
                    // Remove price from line to get item name
                    itemName = line.replace(regex, '').trim();
                    break;
                }
            }
            
            // Extract quantity
            for (const pattern of quantityPatterns) {
                const regex = new RegExp(pattern, 'i');
                const match = line.match(regex);
                if (match) {
                    quantity = parseInt(match[1] || match[2] || match[3] || 1);
                    break;
                }
            }
            
            // If no price found, check if line contains numbers (might be quantity or price)
            if (!price) {
                const numbers = line.match(/\d+\.?\d*/g);
                if (numbers && numbers.length > 0) {
                    // Last number might be price
                    price = parseFloat(numbers[numbers.length - 1]);
                    itemName = line.replace(numbers[numbers.length - 1], '').trim();
                    
                    // If more than one number, second last might be quantity
                    if (numbers.length > 1) {
                        quantity = parseInt(numbers[numbers.length - 2]);
                    }
                }
            }
            
            // If we found a price, assume it's an item
            if (price && itemName) {
                items.push({
                    name: this.cleanItemName(itemName),
                    quantity: quantity,
                    price: price,
                    line: line,
                    confidence: 'medium'
                });
            } else if (line.length > 3 && /[a-zA-Zក-ឰ]/.test(line)) {
                // If line looks like text but no price, it might be item name
                // Check next lines for price/quantity
                if (index < lines.length - 1) {
                    const nextLine = lines[index + 1];
                    const nextNumbers = nextLine.match(/\d+\.?\d*/g);
                    
                    if (nextNumbers && nextNumbers.length > 0) {
                        items.push({
                            name: this.cleanItemName(line),
                            quantity: nextNumbers.length > 1 ? parseInt(nextNumbers[0]) : 1,
                            price: parseFloat(nextNumbers[nextNumbers.length - 1]),
                            line: line + ' ' + nextLine,
                            confidence: 'low'
                        });
                    }
                }
            }
        });
        
        // Filter out items with very short names (likely not real items)
        return items.filter(item => item.name.length > 2);
    }
    
    cleanItemName(name) {
        // Remove common non-item text
        const commonWords = [
            'invoice', 'bill', 'receipt', 'total', 'subtotal', 'tax', 'vat',
            'វិក័យប័ត្រ', 'ប្រាក់', 'សរុប', 'ពន្ធ', 'តម្លៃ'
        ];
        
        let cleaned = name;
        commonWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            cleaned = cleaned.replace(regex, '');
        });
        
        // Remove extra spaces and punctuation
        cleaned = cleaned.replace(/[^\wក-ឰ\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        return cleaned || name;
    }
    
    displayOCRResults() {
        const output = document.getElementById('ocr-output');
        let html = '';
        
        this.ocrResults.forEach((result, index) => {
            html += `<div class="ocr-result">
                <strong>តំបន់ ${index + 1} (ភាពជឿជាក់: ${result.confidence.toFixed(1)}%):</strong><br>
                <pre>${result.text}</pre>
                <hr>
            </div>`;
        });
        
        output.innerHTML = html || '<p>មិនមានអត្ថបទត្រូវបានស្វែងរក</p>';
    }
    
    displayParsedItems() {
        const container = document.getElementById('parsed-items-list');
        container.innerHTML = '';
        
        if (this.parsedItems.length === 0) {
            container.innerHTML = '<p>មិនមានទំនិញត្រូវបានស្វែងរក។ សូមត្រួតពិនិត្យលទ្ធផល OCR។</p>';
            return;
        }
        
        this.parsedItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'parsed-item';
            itemElement.innerHTML = `
                <div class="parsed-item-info">
                    <h5>${item.name}</h5>
                    <p>ចំនួន: ${item.quantity} | តម្លៃ: $${item.price.toFixed(2)}</p>
                    <p class="confidence">ភាពជឿជាក់: ${item.confidence}</p>
                </div>
                <div class="parsed-item-actions">
                    <button class="btn btn-small btn-success" onclick="ocrProcessor.addSingleItem(${index})">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-small btn-warning" onclick="ocrProcessor.editParsedItem(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemElement);
        });
        
        // Update stats
        document.getElementById('items-stats').textContent = this.parsedItems.length;
        document.getElementById('words-stats').textContent = 
            this.ocrResults.reduce((sum, result) => sum + result.text.split(/\s+/).length, 0);
    }
    
    updateStats() {
        document.getElementById('items-stats').textContent = this.parsedItems.length;
    }
    
    async addSingleItem(index) {
        const item = this.parsedItems[index];
        
        // Get target company
        const companySelect = document.getElementById('target-company');
        const company = companySelect.value;
        
        if (!company) {
            alert('សូមជ្រើសរើសក្រុមហ៊ុនគោលដៅ!');
            return;
        }
        
        // Create inventory item
        const inventoryItem = {
            id: Date.now() + index,
            company: company,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            date: new Date().toISOString().split('T')[0],
            category: '',
            notes: `បានបន្ថែមពី OCR - ${item.confidence} confidence`,
            addedDate: new Date().toISOString()
        };
        
        // Save to inventory
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventory.push(inventoryItem);
        localStorage.setItem('inventory', JSON.stringify(inventory));
        
        // Update UI
        loadInventory();
        updateStats();
        
        // Mark as added
        const items = document.querySelectorAll('.parsed-item');
        if (items[index]) {
            items[index].style.opacity = '0.5';
            items[index].querySelector('.parsed-item-actions').innerHTML = 
                '<span style="color: green;"><i class="fas fa-check"></i> បានបន្ថែម</span>';
        }
        
        alert(`ទំនិញ "${item.name}" ត្រូវបានបន្ថែមទៅក្នុងស្តុក!`);
    }
    
    async addAllItemsToInventory() {
        if (this.parsedItems.length === 0) {
            alert('មិនមានទំនិញត្រូវបានស្វែងរក!');
            return;
        }
        
        const companySelect = document.getElementById('target-company');
        const company = companySelect.value;
        
        if (!company) {
            alert('សូមជ្រើសរើសក្រុមហ៊ុនគោលដៅ!');
            return;
        }
        
        if (!confirm(`តើអ្នកពិតជាចង់បន្ថែមទំនិញទាំង ${this.parsedItems.length} ទៅក្នុងស្តុកមែនឬទេ?`)) {
            return;
        }
        
        this.showProcessing(true, 'កំពុងបន្ថែមទំនិញទៅក្នុងស្តុក...');
        
        try {
            let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
            let addedCount = 0;
            
            // Add items in batches for better performance
            const batchSize = 10;
            for (let i = 0; i < this.parsedItems.length; i += batchSize) {
                const batch = this.parsedItems.slice(i, i + batchSize);
                
                batch.forEach((item, batchIndex) => {
                    const inventoryItem = {
                        id: Date.now() + i + batchIndex,
                        company: company,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        date: new Date().toISOString().split('T')[0],
                        category: '',
                        notes: `បានបន្ថែមពី OCR - ${item.confidence} confidence`,
                        addedDate: new Date().toISOString()
                    };
                    
                    inventory.push(inventoryItem);
                    addedCount++;
                });
                
                // Update progress
                const progress = Math.round((i + batch.length) / this.parsedItems.length * 100);
                this.showProcessing(true, `កំពុងបន្ថែម... ${progress}%`);
                
                // Small delay to keep UI responsive
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Save to localStorage
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            // Update UI
            loadInventory();
            updateStats();
            
            this.showProcessing(false);
            alert(`បានបន្ថែមទំនិញ ${addedCount} ទៅក្នុងស្តុកដោយជោគជ័យ!`);
            
            // Reset parsed items display
            this.parsedItems.forEach((_, index) => {
                const items = document.querySelectorAll('.parsed-item');
                if (items[index]) {
                    items[index].style.opacity = '0.5';
                    items[index].querySelector('.parsed-item-actions').innerHTML = 
                        '<span style="color: green;"><i class="fas fa-check"></i> បានបន្ថែម</span>';
                }
            });
            
        } catch (error) {
            console.error('Error adding items:', error);
            this.showProcessing(false);
            alert('មានបញ្ហាក្នុងការបន្ថែមទំនិញ: ' + error.message);
        }
    }
    
    async exportInvoiceToExcel() {
        if (this.parsedItems.length === 0) {
            alert('មិនមានទិន្នន័យត្រូវនាំចេញ!');
            return;
        }
        
        try {
            // Get settings
            const settings = JSON.parse(localStorage.getItem('settings') || {});
            const currency = settings.currency || '$';
            
            // Prepare data for Excel
            const excelData = [
                ['ល.រ', 'ទំនិញ', 'ចំនួន', 'តម្លៃ', 'ក្រុមហ៊ុន', 'កំណត់ចំណាំ'],
                ...this.parsedItems.map((item, index) => [
                    index + 1,
                    item.name,
                    item.quantity,
                    this.formatPrice(item.price, currency),
                    document.getElementById('target-company').value || 'N/A',
                    `បានបន្ថែមពី OCR - ${item.confidence} confidence`
                ])
            ];
            
            // Add summary
            const totalQuantity = this.parsedItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = this.parsedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            excelData.push(['']); // Empty row
            excelData.push(['សរុប:', '', totalQuantity, this.formatPrice(totalValue, currency), '', '']);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            
            // Set column widths
            const wscols = [
                {wch: 5},   // No.
                {wch: 30},  // Item name
                {wch: 10},  // Quantity
                {wch: 12},  // Price
                {wch: 20},  // Company
                {wch: 25}   // Notes
            ];
            ws['!cols'] = wscols;
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'ទំនិញពី OCR');
            
            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `ទំនិញ_ពី_OCR_${date}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
            alert('ទិន្នន័យត្រូវបាននាំចេញទៅ Excel ដោយជោគជ័យ!');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('មិនអាចនាំចេញទិន្នន័យ: ' + error.message);
        }
    }
    
    formatPrice(price, currency) {
        switch(currency) {
            case '$': return `$${price.toFixed(2)}`;
            case '៛': return `${price.toFixed(2)}៛`;
            case '€': return `€${price.toFixed(2)}`;
            case '¥': return `¥${price.toFixed(2)}`;
            default: return `$${price.toFixed(2)}`;
        }
    }
    
    editParsedItem(index) {
        const item = this.parsedItems[index];
        
        // Create edit form
        const form = document.createElement('div');
        form.innerHTML = `
            <div class="form-group">
                <label>ឈ្មោះទំនិញ:</label>
                <input type="text" id="edit-item-name" value="${item.name}" class="form-control">
            </div>
            <div class="form-group">
                <label>ចំនួន:</label>
                <input type="number" id="edit-item-quantity" value="${item.quantity}" class="form-control">
            </div>
            <div class="form-group">
                <label>តម្លៃ:</label>
                <input type="number" id="edit-item-price" value="${item.price}" step="0.01" class="form-control">
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="ocrProcessor.saveEditedItem(${index})">
                    <i class="fas fa-save"></i> រក្សាទុក
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').classList.remove('active')">
                    <i class="fas fa-times"></i> បោះបង់
                </button>
            </div>
        `;
        
        // Show modal
        const modal = document.getElementById('invoice-preview-modal');
        const content = document.getElementById('invoice-preview-content');
        content.innerHTML = '';
        content.appendChild(form);
        
        const title = modal.querySelector('h3');
        title.innerHTML = '<i class="fas fa-edit"></i> កែប្រែទំនិញ';
        
        modal.classList.add('active');
    }
    
    saveEditedItem(index) {
        const name = document.getElementById('edit-item-name').value;
        const quantity = parseInt(document.getElementById('edit-item-quantity').value);
        const price = parseFloat(document.getElementById('edit-item-price').value);
        
        if (!name || isNaN(quantity) || isNaN(price)) {
            alert('សូមបំពេញព័ត៌មានទាំងអស់!');
            return;
        }
        
        // Update item
        this.parsedItems[index] = {
            ...this.parsedItems[index],
            name: name,
            quantity: quantity,
            price: price
        };
        
        // Update display
        this.displayParsedItems();
        
        // Close modal
        document.getElementById('invoice-preview-modal').classList.remove('active');
        
        alert('ទំនិញត្រូវបានកែប្រែដោយជោគជ័យ!');
    }
    
    resetOCRProcess() {
        if (confirm('តើអ្នកពិតជាចង់ចាប់ផ្ដើមឡើងវិញមែនឬទេ? ទិន្នន័យបច្ចុប្បន្ននឹងត្រូវបាត់បង់។')) {
            // Clear canvas
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // Reset variables
            this.currentImage = null;
            this.selectedAreas = [];
            this.ocrResults = [];
            this.parsedItems = [];
            this.isSelecting = false;
            
            // Clear displays
            document.getElementById('ocr-output').innerHTML = '';
            document.getElementById('parsed-items-list').innerHTML = '';
            document.getElementById('selected-areas').innerHTML = '';
            document.getElementById('image-preview').innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-image"></i>
                    <p>រូបភាពនឹងបង្ហាញនៅទីនេះ</p>
                </div>
            `;
            
            // Recreate canvas
            this.createCanvas();
            
            // Reset stats
            document.getElementById('image-stats').textContent = 'មិនទាន់មាន';
            document.getElementById('words-stats').textContent = '0';
            document.getElementById('items-stats').textContent = '0';
            
            // Go back to first step
            this.showStep(0);
            
            // Reset file input
            document.getElementById('invoice-upload').value = '';
        }
    }
    
    showProcessing(show, message = 'កំពុងដំណើរការ...') {
        let processingDiv = document.getElementById('ocr-processing');
        
        if (!processingDiv) {
            processingDiv = document.createElement('div');
            processingDiv.id = 'ocr-processing';
            processingDiv.className = 'ocr-processing';
            processingDiv.innerHTML = `
                <div class="spinner"></div>
                <div class="processing-text">${message}</div>
            `;
            document.body.appendChild(processingDiv);
        }
        
        processingDiv.querySelector('.processing-text').textContent = message;
        processingDiv.classList.toggle('active', show);
        this.isProcessing = show;
    }
    
    loadOCRSettings() {
        // Load saved settings or use defaults
        let settings = JSON.parse(localStorage.getItem('ocrSettings') || '{}');
        
        // Set defaults if not exists
        if (!settings.confidence) settings.confidence = 70;
        if (!settings.pricePatterns) settings.pricePatterns = 'USD\\s*(\\d+\\.?\\d*)|\\$\\s*(\\d+\\.?\\d*)|៛\\s*(\\d+\\.?\\d*)';
        if (!settings.quantityPatterns) settings.quantityPatterns = 'QTY\\s*(\\d+)|Quantity\\s*(\\d+)|ចំនួន\\s*(\\d+)|បរិមាណ\\s*(\\d+)';
        
        localStorage.setItem('ocrSettings', JSON.stringify(settings));
        
        // Load company select
        this.loadCompanySelect();
    }
    
    loadCompanySelect() {
        const companies = JSON.parse(localStorage.getItem('companies') || []);
        const select = document.getElementById('target-company');
        
        select.innerHTML = '<option value="">-- ជ្រើសរើសក្រុមហ៊ុន --</option>';
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.name;
            option.textContent = company.name;
            select.appendChild(option);
        });
    }
}

// ==============================================
// DATA OPTIMIZATION SYSTEM
// ==============================================

class DataOptimizer {
    constructor() {
        this.cache = new Map();
        this.optimized = false;
    }
    
    // Optimize inventory data for storage
    optimizeInventoryData(inventory) {
        console.time('Data optimization');
        
        const optimized = inventory.map(item => ({
            i: item.id,           // id
            c: item.company,      // company
            n: item.name,         // name
            q: item.quantity,     // quantity
            p: Math.round(item.price * 100) / 100, // price (rounded to 2 decimal)
            d: item.date,         // date
            g: item.category || '', // category
            o: item.notes || '',  // notes
            a: item.addedDate     // addedDate
        }));
        
        // Sort by ID for better compression
        optimized.sort((a, b) => a.i - b.i);
        
        console.timeEnd('Data optimization');
        console.log(`Optimized ${inventory.length} items`);
        
        return optimized;
    }
    
    // Decompress optimized data
    decompressInventoryData(optimized) {
        return optimized.map(item => ({
            id: item.i,
            company: item.c,
            name: item.n,
            quantity: item.q,
            price: item.p,
            date: item.d,
            category: item.g || '',
            notes: item.o || '',
            addedDate: item.a
        }));
    }
    
    // Calculate storage size
    calculateStorageSize() {
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        const companies = JSON.parse(localStorage.getItem('companies') || '[]');
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        
        const totalSize = 
            JSON.stringify(inventory).length +
            JSON.stringify(companies).length +
            JSON.stringify(settings).length;
        
        return {
            bytes: totalSize,
            kb: (totalSize / 1024).toFixed(2),
            mb: (totalSize / (1024 * 1024)).toFixed(2),
            items: inventory.length,
            companies: companies.length
        };
    }
    
    // Auto-optimize if needed
    autoOptimize() {
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        
        // Only optimize if we have many items and auto-optimize is enabled
        if (inventory.length > 1000 && settings.autoOptimize !== false) {
            console.log('Auto-optimizing data...');
            const optimized = this.optimizeInventoryData(inventory);
            localStorage.setItem('inventory_optimized', JSON.stringify(optimized));
            localStorage.setItem('inventory_optimized_version', '2');
            
            // Keep original for compatibility
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            console.log('Data auto-optimized');
            return true;
        }
        return false;
    }
    
    // Batch processing for large imports
    processInBatches(items, processFn, batchSize = 100) {
        const results = [];
        const totalBatches = Math.ceil(items.length / batchSize);
        
        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, items.length);
            const batch = items.slice(start, end);
            
            const batchResults = processFn(batch, i, totalBatches);
            results.push(...batchResults);
            
            // Update progress
            const progress = Math.round(((i + 1) / totalBatches) * 100);
            console.log(`Processing batch ${i + 1}/${totalBatches} (${progress}%)`);
        }
        
        return results;
    }
    
    // Clean old data
    cleanOldData(days = 365) {
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const oldItems = inventory.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate < cutoffDate;
        });
        
        const newItems = inventory.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= cutoffDate;
        });
        
        if (oldItems.length > 0) {
            localStorage.setItem('inventory', JSON.stringify(newItems));
            localStorage.setItem('inventory_archive', JSON.stringify(oldItems));
            
            return {
                removed: oldItems.length,
                remaining: newItems.length,
                archiveSize: JSON.stringify(oldItems).length
            };
        }
        
        return null;
    }
}

// ==============================================
// MAIN APPLICATION
// ==============================================

// Global instances
let ocrProcessor;
let dataOptimizer;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.time('App initialization');
    
    // Initialize systems
    ocrProcessor = new InvoiceOCRProcessor();
    dataOptimizer = new DataOptimizer();
    
    // Initialize core app
    initTabs();
    initAddItem();
    initInventory();
    initSettings();
    initModal();
    
    // Load data
    loadCompanies();
    loadInventory();
    loadSettings();
    
    // Update UI
    updateStats();
    updateAppDate();
    
    // Auto-optimize if needed
    setTimeout(() => {
        dataOptimizer.autoOptimize();
        updateDataStats();
    }, 1000);
    
    console.timeEnd('App initialization');
});

// Update app date
function updateAppDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    document.getElementById('app-date').textContent = now.toLocaleDateString('km-KH', options);
}

// Update data statistics
function updateDataStats() {
    const stats = dataOptimizer.calculateStorageSize();
    
    document.getElementById('data-total-items').textContent = stats.items;
    document.getElementById('data-size').textContent = `${stats.kb} KB`;
    document.getElementById('data-total-companies').textContent = stats.companies;
}
// Keep all the existing functions from previous versions
// (initTabs, initAddItem, initInventory, initSettings, etc.)
// They should be integrated with the new OCR system

// Note: Due to character limits, I've shown the complete OCR system.
// The existing inventory management functions from previous versions
// should be integrated with this new OCR system.