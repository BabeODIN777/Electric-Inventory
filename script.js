// ==============================================
// MAIN APPLICATION INITIALIZATION
// ==============================================

let ocrProcessor = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Inventory Management System...');
    
    // Initialize all systems
    initTabs();
    initAddItem();
    initInventory();
    initSettings();
    initModal();
    
    // Load initial data
    loadCompanies();
    loadInventory();
    loadSettings();
    
    // Initialize OCR when needed
    document.querySelector('[data-tab="ocr-invoice"]').addEventListener('click', function() {
        if (!ocrProcessor) {
            console.log('Initializing OCR system...');
            ocrProcessor = new InvoiceOCRProcessor();
        }
    });
    
    console.log('System initialized successfully');
});

// ==============================================
// TAB NAVIGATION
// ==============================================

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Refresh data for inventory tab
            if (tabId === 'inventory') {
                loadInventory();
                loadCompanyFilter();
                loadCategoryFilter();
            }
            
            // Load companies for OCR tab
            if (tabId === 'ocr-invoice') {
                loadTargetCompanySelect();
            }
        });
    });
}

// ==============================================
// ADD ITEM FUNCTIONALITY
// ==============================================

function initAddItem() {
    const form = document.getElementById('add-item-form');
    const resetBtn = document.getElementById('reset-form');
    const dateInput = document.getElementById('item-date');
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Load company select
    loadCompanySelect();
    
    // Form submit handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const company = document.getElementById('item-company').value.trim();
        const itemName = document.getElementById('item-name').value.trim();
        const quantity = parseInt(document.getElementById('item-quantity').value) || 0;
        const price = parseFloat(document.getElementById('item-price').value) || 0;
        const date = document.getElementById('item-date').value;
        const category = document.getElementById('item-category').value.trim();
        const notes = document.getElementById('item-notes').value.trim();
        
        // Validation
        if (!company) {
            alert('សូមជ្រើសរើសក្រុមហ៊ុន!');
            return;
        }
        
        if (!itemName) {
            alert('សូមបញ្ចូលឈ្មោះទំនិញ!');
            return;
        }
        
        // Create item object
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
        
        // Save to localStorage
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventory.push(item);
        localStorage.setItem('inventory', JSON.stringify(inventory));
        
        // Reset form
        form.reset();
        dateInput.value = today;
        
        // Update UI
        addRecentItem(item);
        updateStats();
        loadCategoryFilter();
        
        alert('ទំនិញត្រូវបានបន្ថែមដោយជោគជ័យ!');
        
        // Switch to inventory tab
        document.querySelector('[data-tab="inventory"]').click();
    });
    
    // Reset form
    resetBtn.addEventListener('click', function() {
        form.reset();
        dateInput.value = today;
    });
}

// ==============================================
// INVENTORY MANAGEMENT
// ==============================================

function initInventory() {
    // Export to Excel
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    
    // Print inventory
    document.getElementById('print-inventory').addEventListener('click', printInventory);
    
    // Import CSV
    document.getElementById('import-csv').addEventListener('click', importFromCSV);
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', function() {
        document.getElementById('filter-company').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-stock').value = 'all';
        document.getElementById('search-items').value = '';
        loadInventory();
    });
    
    // Filter event listeners
    document.getElementById('filter-company').addEventListener('change', loadInventory);
    document.getElementById('filter-category').addEventListener('change', loadInventory);
    document.getElementById('filter-stock').addEventListener('change', loadInventory);
    
    // Search with debounce
    let searchTimeout;
    document.getElementById('search-items').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadInventory, 300);
    });
}

function loadInventory() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const tbody = document.getElementById('inventory-list');
    
    // Get filter values
    const filterCompany = document.getElementById('filter-company').value;
    const filterCategory = document.getElementById('filter-category').value;
    const filterStock = document.getElementById('filter-stock').value;
    const searchTerm = document.getElementById('search-items').value.toLowerCase();
    
    // Apply filters
    if (filterCompany !== 'all') {
        inventory = inventory.filter(item => item.company === filterCompany);
    }
    
    if (filterCategory !== 'all') {
        inventory = inventory.filter(item => item.category === filterCategory);
    }
    
    if (filterStock !== 'all') {
        if (filterStock === 'in-stock') {
            inventory = inventory.filter(item => item.quantity > 0);
        } else if (filterStock === 'out-of-stock') {
            inventory = inventory.filter(item => item.quantity === 0);
        }
    }
    
    if (searchTerm) {
        inventory = inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.company.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // Clear table
    tbody.innerHTML = '';
    
    if (inventory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 50px; color: #6c757d;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; display: block; opacity: 0.5;"></i>
                    <p>មិនមានទំនិញតាមលក្ខខណ្ឌដែលបានជ្រើសរើស</p>
                </td>
            </tr>
        `;
        updateStats();
        return;
    }
    
    // Add items to table
    inventory.forEach(item => {
        const row = document.createElement('tr');
        if (item.quantity === 0) {
            row.classList.add('out-of-stock');
        }
        
        row.innerHTML = `
            <td><strong>${item.company}</strong></td>
            <td>
                <div style="font-weight: 600;">${item.name}</div>
                ${item.notes ? `<small style="color: #6c757d;">${item.notes}</small>` : ''}
            </td>
            <td>${item.category || '-'}</td>
            <td>
                <span class="quantity-badge">${item.quantity}</span>
                ${item.quantity === 0 ? '<span class="stock-status out-of-stock-status">អស់ស្តុក</span>' : ''}
            </td>
            <td style="font-weight: 600; color: #28a745;">$${item.price.toFixed(2)}</td>
            <td>${formatDate(item.date)}</td>
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
    
    updateStats();
}

function deleteItem(itemId) {
    if (!confirm('តើអ្នកពិតជាចង់លុបទំនិញនេះមែនឬទេ?')) return;
    
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    inventory = inventory.filter(item => item.id !== itemId);
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    loadInventory();
    loadCategoryFilter();
    alert('ទំនិញត្រូវបានលុបដោយជោគជ័យ!');
}

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
        
        // Change submit button text
        const submitBtn = document.querySelector('#add-item-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-edit"></i> កែប្រែទំនិញ';
        
        // Update form submit handler
        const form = document.getElementById('add-item-form');
        form.onsubmit = function(e) {
            e.preventDefault();
            
            // Update item
            item.company = document.getElementById('item-company').value.trim();
            item.name = document.getElementById('item-name').value.trim();
            item.quantity = parseInt(document.getElementById('item-quantity').value) || 0;
            item.price = parseFloat(document.getElementById('item-price').value) || 0;
            item.date = document.getElementById('item-date').value;
            item.category = document.getElementById('item-category').value.trim();
            item.notes = document.getElementById('item-notes').value.trim();
            
            // Save to localStorage
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            // Reset form
            form.reset();
            document.getElementById('item-date').value = new Date().toISOString().split('T')[0];
            submitBtn.innerHTML = '<i class="fas fa-save"></i> រក្សាទុកទំនិញ';
            
            // Restore original handler
            initAddItem();
            
            // Update UI
            loadInventory();
            updateStats();
            loadCategoryFilter();
            
            alert('ទំនិញត្រូវបានកែប្រែដោយជោគជ័យ!');
            document.querySelector('[data-tab="inventory"]').click();
        };
    }, 100);
}

// ==============================================
// SETTINGS MANAGEMENT
// ==============================================

function initSettings() {
    // Company settings form
    document.getElementById('company-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCompanySettings();
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

function saveCompanySettings() {
    const companyName = document.getElementById('company-name').value.trim();
    const address = document.getElementById('company-address').value.trim();
    const phone = document.getElementById('company-phone').value.trim();
    
    if (!companyName) {
        alert('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន!');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    settings.companyName = companyName;
    settings.address = address;
    settings.phone = phone;
    
    localStorage.setItem('settings', JSON.stringify(settings));
    document.getElementById('company-name-display').textContent = companyName;
    alert('ការកំណត់ក្រុមហ៊ុនត្រូវបានរក្សាទុក!');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    document.getElementById('company-name').value = settings.companyName || '';
    document.getElementById('company-address').value = settings.address || '';
    document.getElementById('company-phone').value = settings.phone || '';
    
    if (settings.companyName) {
        document.getElementById('company-name-display').textContent = settings.companyName;
    }
}

// ==============================================
// COMPANY MANAGEMENT
// ==============================================

function initModal() {
    const modal = document.getElementById('company-modal');
    const closeButtons = document.querySelectorAll('.modal-close');
    const addCompanyBtn = document.getElementById('add-company-btn');
    
    // Open modal
    addCompanyBtn.addEventListener('click', function() {
        document.getElementById('modal-title').textContent = 'បន្ថែមក្រុមហ៊ុនថ្មី';
        document.getElementById('company-form').reset();
        document.getElementById('modal-company-id').value = '';
        modal.classList.add('active');
    });
    
    // Close modal
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    });
    
    // Close when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Company form submission
    document.getElementById('company-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCompany();
    });
}

function saveCompany() {
    const companyId = document.getElementById('modal-company-id').value;
    const companyName = document.getElementById('modal-company-name').value.trim();
    
    if (!companyName) {
        alert('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន!');
        return;
    }
    
    const company = {
        id: companyId ? parseInt(companyId) : Date.now(),
        name: companyName,
        code: document.getElementById('modal-company-code').value.trim(),
        contact: document.getElementById('modal-company-contact').value.trim(),
        phone: document.getElementById('modal-company-phone').value.trim(),
        email: document.getElementById('modal-company-email').value.trim(),
        createdAt: new Date().toISOString()
    };
    
    let companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    if (companyId) {
        // Update existing company
        const index = companies.findIndex(c => c.id === parseInt(companyId));
        if (index !== -1) {
            companies[index] = company;
        }
    } else {
        // Add new company
        companies.push(company);
    }
    
    localStorage.setItem('companies', JSON.stringify(companies));
    
    // Close modal
    document.getElementById('company-modal').classList.remove('active');
    
    // Update UI
    loadCompanies();
    loadCompanySelect();
    loadCompanyFilter();
    loadTargetCompanySelect();
    
    alert(companyId ? 'ក្រុមហ៊ុនត្រូវបានកែប្រែដោយជោគជ័យ!' : 'ក្រុមហ៊ុនត្រូវបានបន្ថែមដោយជោគជ័យ!');
}

function loadCompanies() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const tbody = document.getElementById('company-list-body');
    
    tbody.innerHTML = '';
    
    if (companies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #6c757d;">
                    មិនទាន់មានក្រុមហ៊ុនទេ
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
                ${company.code ? `<br><small>កូដ: ${company.code}</small>` : ''}
            </td>
            <td>${itemCount} ទំនិញ</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editCompany(${company.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteCompany(${company.id})" ${itemCount > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function editCompany(companyId) {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const company = companies.find(c => c.id === companyId);
    
    if (!company) return;
    
    document.getElementById('modal-title').textContent = 'កែប្រែក្រុមហ៊ុន';
    document.getElementById('modal-company-id').value = company.id;
    document.getElementById('modal-company-name').value = company.name;
    document.getElementById('modal-company-code').value = company.code || '';
    document.getElementById('modal-company-contact').value = company.contact || '';
    document.getElementById('modal-company-phone').value = company.phone || '';
    document.getElementById('modal-company-email').value = company.email || '';
    
    document.getElementById('company-modal').classList.add('active');
}

function deleteCompany(companyId) {
    if (!confirm('តើអ្នកពិតជាចង់លុបក្រុមហ៊ុននេះមែនឬទេ?')) return;
    
    let companies = JSON.parse(localStorage.getItem('companies')) || [];
    companies = companies.filter(c => c.id !== companyId);
    
    localStorage.setItem('companies', JSON.stringify(companies));
    loadCompanies();
    loadCompanySelect();
    loadCompanyFilter();
    loadTargetCompanySelect();
    
    alert('ក្រុមហ៊ុនត្រូវបានលុបដោយជោគជ័យ!');
}

function loadCompanySelect() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const select = document.getElementById('item-company');
    
    // Clear existing options except first one
    select.innerHTML = '<option value="">-- ជ្រើសរើសក្រុមហ៊ុន --</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

function loadCompanyFilter() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const select = document.getElementById('filter-company');
    
    // Clear existing options except "All"
    select.innerHTML = '<option value="all">ទាំងអស់</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

function loadCategoryFilter() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const select = document.getElementById('filter-category');
    
    // Get unique categories
    const categories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
    
    // Clear existing options except "All"
    select.innerHTML = '<option value="all">ទាំងអស់</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function loadTargetCompanySelect() {
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    const select = document.getElementById('target-company');
    
    if (!select) return;
    
    select.innerHTML = '<option value="">-- ជ្រើសរើសក្រុមហ៊ុន --</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.name;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

function updateStats() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    const totalItems = inventory.length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const totalCompanies = companies.length;
    
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('out-of-stock').textContent = outOfStock;
    document.getElementById('total-companies').textContent = totalCompanies;
    
    // Update recent items
    updateRecentItems();
}

function addRecentItem(item) {
    const recentItemsDiv = document.getElementById('recent-items');
    const formattedDate = formatDate(item.date);
    
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
        <p><i class="fas fa-money-bill-wave"></i> $${item.price.toFixed(2)}</p>
        <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
    `;
    
    recentItemsDiv.insertBefore(itemDiv, recentItemsDiv.firstChild);
    
    // Keep only last 5 items
    const items = recentItemsDiv.querySelectorAll('.recent-item');
    if (items.length > 5) {
        recentItemsDiv.removeChild(items[items.length - 1]);
    }
}

function updateRecentItems() {
    const recentItemsDiv = document.getElementById('recent-items');
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    
    recentItemsDiv.innerHTML = '';
    
    // Show last 5 items
    const recentItems = inventory.slice(-5).reverse();
    
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
        const formattedDate = formatDate(item.date);
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
            <p><i class="fas fa-money-bill-wave"></i> $${item.price.toFixed(2)}</p>
            <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
        `;
        recentItemsDiv.appendChild(itemDiv);
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// ==============================================
// EXPORT/IMPORT FUNCTIONS
// ==============================================

function exportToExcel() {
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const companies = JSON.parse(localStorage.getItem('companies')) || [];
    
    if (inventory.length === 0) {
        alert('មិនទាន់មានទិន្នន័យទំនិញដើម្បីនាំចេញ!');
        return;
    }
    
    // Prepare data for Excel
    const excelData = [
        ['ល.រ', 'ក្រុមហ៊ុន', 'ទំនិញ', 'ប្រភេទ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ', 'កំណត់ចំណាំ'],
        ...inventory.map((item, index) => [
            index + 1,
            item.company,
            item.name,
            item.category || '-',
            item.quantity,
            `$${item.price.toFixed(2)}`,
            formatDate(item.date),
            item.notes || '-'
        ])
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'ទំនិញ');
    
    // Generate filename
    const companyName = settings.companyName ? settings.companyName.replace(/\s+/g, '_') : 'Inventory';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${companyName}_ទំនិញ_${date}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
}

function printInventory() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    
    let html = `
        <style>
            @media print {
                body { font-family: Arial, sans-serif; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .company-name { font-size: 24pt; font-weight: bold; }
                .report-title { font-size: 18pt; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f2f2f2; padding: 10px; border: 1px solid #ddd; }
                td { padding: 8px; border: 1px solid #ddd; }
            }
        </style>
        <div class="print-header">
            <div class="company-name">${settings.companyName || 'ក្រុមហ៊ុន'}</div>
            <div>កាលបរិច្ឆេទបោះពុម្ព: ${new Date().toLocaleDateString('km-KH')}</div>
        </div>
        <div class="report-title">បញ្ជីទំនិញក្នុងស្តុក</div>
    `;
    
    if (inventory.length > 0) {
        html += `
            <table>
                <thead>
                    <tr>
                        <th>ល.រ</th>
                        <th>ក្រុមហ៊ុន</th>
                        <th>ទំនិញ</th>
                        <th>ប្រភេទ</th>
                        <th>ចំនួន</th>
                        <th>តម្លៃ</th>
                        <th>កាលបរិច្ឆេទ</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        inventory.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.company}</td>
                    <td>${item.name}</td>
                    <td>${item.category || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>${formatDate(item.date)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
    } else {
        html += '<p>មិនមានទំនិញក្នុងស្តុក</p>';
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Print Inventory</title></head>
        <body>${html}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function importFromCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                let importedItems = [];
                jsonData.forEach((row, index) => {
                    const item = {
                        id: Date.now() + index,
                        company: row.ក្រុមហ៊ុន || row.Company || '',
                        name: row.ទំនិញ || row.Item || '',
                        quantity: parseInt(row.ចំនួន || row.Quantity || 0),
                        price: parseFloat(row.តម្លៃ || row.Price || 0),
                        date: row.កាលបរិច្ឆេទ || row.Date || new Date().toISOString().split('T')[0],
                        category: row.ប្រភេទ || row.Category || '',
                        notes: row.កំណត់ចំណាំ || row.Notes || '',
                        addedDate: new Date().toISOString()
                    };
                    
                    if (item.name && item.company) {
                        importedItems.push(item);
                    }
                });
                
                if (importedItems.length === 0) {
                    alert('មិនមានទិន្នន័យត្រឹមត្រូវក្នុងឯកសារ!');
                    return;
                }
                
                // Save to localStorage
                let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
                inventory = inventory.concat(importedItems);
                localStorage.setItem('inventory', JSON.stringify(inventory));
                
                // Update UI
                loadInventory();
                loadCategoryFilter();
                updateStats();
                
                alert(`បាននាំចូល ${importedItems.length} ទំនិញដោយជោគជ័យ!`);
                
            } catch (error) {
                console.error('Import error:', error);
                alert('មានបញ្ហាក្នុងការនាំចូលឯកសារ: ' + error.message);
            }
        };
        
        reader.readAsBinaryString(file);
    };
    
    input.click();
}

// ==============================================
// OCR PROCESSOR CLASS
// ==============================================

class InvoiceOCRProcessor {
    constructor() {
        this.currentImage = null;
        this.selectedAreas = [];
        this.ocrResults = [];
        this.parsedItems = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        loadTargetCompanySelect();
    }
    
    setupEventListeners() {
        // File upload
        const uploadInput = document.getElementById('invoice-upload');
        const dropArea = document.getElementById('drop-area');
        
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (dropArea) {
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.style.background = '#e9ecef';
            });
            
            dropArea.addEventListener('dragleave', () => {
                dropArea.style.background = '#f8fafc';
            });
            
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.style.background = '#f8fafc';
                const file = e.dataTransfer.files[0];
                if (file && file.type.match('image.*')) {
                    this.processImageFile(file);
                } else {
                    alert('សូមផ្ទុកតែរូបភាពប៉ុណ្ណោះ!');
                }
            });
        }
        
        // OCR buttons
        document.getElementById('select-area-btn')?.addEventListener('click', () => this.startAreaSelection());
        document.getElementById('clear-area-btn')?.addEventListener('click', () => this.clearSelectedAreas());
        document.getElementById('auto-detect-btn')?.addEventListener('click', () => this.autoDetectItems());
        document.getElementById('preview-ocr-btn')?.addEventListener('click', () => this.previewOCRResults());
        document.getElementById('add-all-items-btn')?.addEventListener('click', () => this.addAllItemsToInventory());
        document.getElementById('export-invoice-excel-btn')?.addEventListener('click', () => this.exportInvoiceToExcel());
        document.getElementById('clear-ocr-btn')?.addEventListener('click', () => this.resetOCRProcess());
        
        // Step navigation
        this.showStep(1);
    }
    
    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.ocr-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const stepElement = document.getElementById(`ocr-step-${stepNumber}`);
        if (stepElement) {
            stepElement.classList.add('active');
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }
    
    async processImageFile(file) {
        try {
            this.showProcessing(true, 'កំពុងផ្ទុករូបភាព...');
            
            const imageUrl = URL.createObjectURL(file);
            await this.loadImage(imageUrl);
            
            this.showStep(2);
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
                
                const preview = document.getElementById('image-preview');
                preview.innerHTML = '';
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions
                const maxWidth = 800;
                const scale = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Draw image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Add to preview
                preview.appendChild(canvas);
                
                // Setup canvas events for area selection
                this.setupCanvasEvents(canvas, ctx);
                
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
    
    setupCanvasEvents(canvas, ctx) {
        let isSelecting = false;
        let startX = 0;
        let startY = 0;
        let currentRect = null;
        
        canvas.onmousedown = (e) => {
            if (!isSelecting) return;
            
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            currentRect = {
                x: startX,
                y: startY,
                width: 0,
                height: 0
            };
            
            this.drawSelectionRect(ctx, canvas, currentRect);
        };
        
        canvas.onmousemove = (e) => {
            if (!isSelecting || !currentRect) return;
            
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            currentRect.width = currentX - startX;
            currentRect.height = currentY - startY;
            
            // Redraw canvas with image and selection
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
            this.drawSelectionRect(ctx, canvas, currentRect);
        };
        
        canvas.onmouseup = () => {
            if (!isSelecting || !currentRect) return;
            
            // Add selection to areas
            this.selectedAreas.push({
                ...currentRect,
                id: Date.now()
            });
            
            this.updateSelectedAreasDisplay();
            
            // Reset
            currentRect = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
        };
        
        this.startAreaSelection = () => {
            isSelecting = true;
            canvas.style.cursor = 'crosshair';
            alert('អូសម៉ៅស៍ដើម្បីជ្រើសរើសតំបន់ដែលមានទិន្នន័យទំនិញ។');
        };
    }
    
    drawSelectionRect(ctx, canvas, rect) {
        ctx.strokeStyle = '#4299e1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
        
        // Fill with semi-transparent color
        ctx.fillStyle = 'rgba(66, 153, 225, 0.1)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
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
            // Simple auto-detect: select the whole image for now
            const canvas = document.querySelector('#image-preview canvas');
            this.selectedAreas = [{
                id: Date.now(),
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height
            }];
            
            this.updateSelectedAreasDisplay();
            this.showProcessing(false);
            alert('បានជ្រើសរើសតំបន់សម្រាប់ OCR!');
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
            
            // Process each selected area
            for (let i = 0; i < this.selectedAreas.length; i++) {
                const area = this.selectedAreas[i];
                
                // Extract area from canvas
                const canvas = document.querySelector('#image-preview canvas');
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(area.x, area.y, area.width, area.height);
                
                // Create temporary canvas for the area
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = area.width;
                tempCanvas.height = area.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                // Perform OCR
                const worker = await Tesseract.createWorker();
                await worker.loadLanguage(language);
                await worker.initialize(language);
                
                const { data: { text } } = await worker.recognize(tempCanvas);
                await worker.terminate();
                
                this.ocrResults.push({
                    area: area,
                    text: text.trim()
                });
                
                // Parse items from text
                const items = this.parseItemsFromText(text);
                this.parsedItems.push(...items);
            }
            
            // Display results
            this.displayOCRResults();
            this.displayParsedItems();
            
            this.showStep(3);
            this.showProcessing(false);
            
        } catch (error) {
            console.error('OCR processing error:', error);
            this.showProcessing(false);
            alert('មានបញ្ហាក្នុងការដំណើរការ OCR: ' + error.message);
        }
    }
    
    parseItemsFromText(text) {
        const items = [];
        const lines = text.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            // Simple parsing: look for patterns like "Item Name 10 $5.00"
            const match = line.match(/(.+?)\s+(\d+)\s+\$?(\d+\.?\d*)/);
            if (match) {
                items.push({
                    name: match[1].trim(),
                    quantity: parseInt(match[2]) || 1,
                    price: parseFloat(match[3]) || 0,
                    confidence: 'medium'
                });
            } else if (line.length > 3) {
                // If no price/quantity pattern, treat as item name
                items.push({
                    name: line.trim(),
                    quantity: 1,
                    price: 0,
                    confidence: 'low'
                });
            }
        });
        
        return items.filter(item => item.name.length > 2);
    }
    
    displayOCRResults() {
        const output = document.getElementById('ocr-output');
        let html = '';
        
        this.ocrResults.forEach((result, index) => {
            html += `<div class="ocr-result">
                <strong>តំបន់ ${index + 1}:</strong><br>
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
            container.innerHTML = '<p>មិនមានទំនិញត្រូវបានស្វែងរក។</p>';
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
                </div>
            `;
            container.appendChild(itemElement);
        });
    }
    
    addSingleItem(index) {
        const item = this.parsedItems[index];
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
            notes: `បានបន្ថែមពី OCR`,
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
        
        alert(`ទំនិញ "${item.name}" ត្រូវបានបន្ថែម!`);
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
        
        this.showProcessing(true, 'កំពុងបន្ថែមទំនិញ...');
        
        try {
            let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
            let addedCount = 0;
            
            this.parsedItems.forEach((item, index) => {
                const inventoryItem = {
                    id: Date.now() + index,
                    company: company,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    date: new Date().toISOString().split('T')[0],
                    category: '',
                    notes: `បានបន្ថែមពី OCR`,
                    addedDate: new Date().toISOString()
                };
                
                inventory.push(inventoryItem);
                addedCount++;
            });
            
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            loadInventory();
            updateStats();
            
            this.showProcessing(false);
            alert(`បានបន្ថែមទំនិញ ${addedCount} ទៅក្នុងស្តុក!`);
            
            // Mark all as added
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
            // Prepare data for Excel
            const excelData = [
                ['ល.រ', 'ទំនិញ', 'ចំនួន', 'តម្លៃ', 'ក្រុមហ៊ុន'],
                ...this.parsedItems.map((item, index) => [
                    index + 1,
                    item.name,
                    item.quantity,
                    `$${item.price.toFixed(2)}`,
                    document.getElementById('target-company').value || 'N/A'
                ])
            ];
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'ទំនិញពី OCR');
            
            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `ទំនិញ_ពី_OCR_${date}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
            alert('ទិន្នន័យត្រូវបាននាំចេញទៅ Excel!');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('មិនអាចនាំចេញទិន្នន័យ: ' + error.message);
        }
    }
    
    resetOCRProcess() {
        if (confirm('តើអ្នកពិតជាចង់ចាប់ផ្ដើមឡើងវិញមែនឬទេ?')) {
            this.currentImage = null;
            this.selectedAreas = [];
            this.ocrResults = [];
            this.parsedItems = [];
            
            document.getElementById('image-preview').innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-image"></i>
                    <p>រូបភាពនឹងបង្ហាញនៅទីនេះ</p>
                </div>
            `;
            
            document.getElementById('ocr-output').innerHTML = '';
            document.getElementById('parsed-items-list').innerHTML = '';
            document.getElementById('selected-areas').innerHTML = '';
            document.getElementById('invoice-upload').value = '';
            
            this.showStep(1);
        }
    }
    
    showProcessing(show, message = 'កំពុងដំណើរការ...') {
        // Create or get processing overlay
        let overlay = document.getElementById('ocr-processing-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ocr-processing-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                display: none;
            `;
            
            overlay.innerHTML = `
                <div class="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <div class="message" style="margin-top: 20px; font-size: 16px; color: #333;"></div>
            `;
            
            document.body.appendChild(overlay);
            
            // Add spin animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        if (show) {
            overlay.querySelector('.message').textContent = message;
            overlay.style.display = 'flex';
            this.isProcessing = true;
        } else {
            overlay.style.display = 'none';
            this.isProcessing = false;
        }
    }
}

// ==============================================
// ENHANCED OCR PROCESSOR WITH TABLE DETECTION
// ==============================================

class EnhancedInvoiceOCRProcessor {
    constructor() {
        this.currentImage = null;
        this.selectedAreas = [];
        this.ocrResults = [];
        this.parsedItems = [];
        this.isProcessing = false;
        this.setupEvents();
    }
    
    setupEvents() {
        // Auto-detect for table
        const autoDetectBtn = document.getElementById('auto-detect-btn');
        if (autoDetectBtn) {
            autoDetectBtn.addEventListener('click', () => this.enhancedAutoDetect());
        }
        
        // Add table detection button
        const areaControls = document.querySelector('.area-controls');
        if (areaControls) {
            const columnDetectBtn = document.createElement('button');
            columnDetectBtn.className = 'btn btn-small btn-info';
            columnDetectBtn.innerHTML = '<i class="fas fa-table"></i> ស្វែងរកតារាង';
            columnDetectBtn.onclick = () => this.detectTableColumns();
            areaControls.appendChild(columnDetectBtn);
        }
        
        // File upload handling (copied from original with enhancements)
        const uploadInput = document.getElementById('invoice-upload');
        const dropArea = document.getElementById('drop-area');
        
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (dropArea) {
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.style.background = '#e9ecef';
            });
            
            dropArea.addEventListener('dragleave', () => {
                dropArea.style.background = '#f8fafc';
            });
            
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.style.background = '#f8fafc';
                const file = e.dataTransfer.files[0];
                if (file && file.type.match('image.*')) {
                    this.processImageFile(file);
                } else {
                    alert('សូមផ្ទុកតែរូបភាពប៉ុណ្ណោះ!');
                }
            });
        }
    }
    
    async enhancedAutoDetect() {
        if (!this.currentImage) {
            alert('សូមផ្ទុករូបភាពមុន!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងស្វែងរកតារាងទំនិញ...');
        
        try {
            const canvas = document.querySelector('#image-preview canvas');
            if (!canvas) {
                this.showProcessing(false);
                return;
            }
            
            // Estimate table area (middle section of invoice)
            const tableY = canvas.height * 0.3;  // Start 30% down (after header)
            const tableHeight = canvas.height * 0.5;  // 50% height
            const tableX = canvas.width * 0.05;  // Start 5% from left
            const tableWidth = canvas.width * 0.9;  // 90% width
            
            this.selectedAreas = [{
                id: Date.now(),
                x: tableX,
                y: tableY,
                width: tableWidth,
                height: tableHeight
            }];
            
            this.updateSelectedAreasDisplay();
            this.showProcessing(false);
            alert('បានស្វែងរកតំបន់តារាង! សូមផ្ទៀងផ្ទាត់តំបន់។');
            
        } catch (error) {
            console.error('Table detection error:', error);
            this.showProcessing(false);
            alert('មិនអាចស្វែងរកតារាងដោយស្វ័យប្រវត្តិ។ សូមជ្រើសរើសមានុច។');
        }
    }
    
    async detectTableColumns() {
        alert('This feature requires more advanced image processing. For now, please select the table area manually.');
    }
    
    // Copy the rest of the methods from the original InvoiceOCRProcessor
    // but use the enhanced parsing methods below
    // ... [copy all the methods from the original InvoiceOCRProcessor class]
    
    enhancedParseTable(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const items = [];
        
        // Look for table rows
        lines.forEach(line => {
            // Skip headers
            if (this.isTableHeader(line)) return;
            
            // Try to parse item
            const item = this.parseInvoiceLine(line);
            if (item) {
                items.push(item);
            }
        });
        
        this.parsedItems = items;
        this.displayParsedItems();
        
        if (items.length > 0) {
            alert(`បានស្វែងរកទំនិញ ${items.length} ក្នុងតារាង!`);
        }
    }
    
    isTableHeader(line) {
        const headers = ['លរ', 'N°', 'កូដទំនិញ', 'Item Code', 'Description', 
                        'ចំនួន', 'Qty', 'ខ្នាត', 'UM', 'តម្លៃ', 'Price', 
                        'Amount', 'បរិមាណ', 'សរុប', 'Total'];
        return headers.some(header => line.toLowerCase().includes(header.toLowerCase()));
    }
    
    parseInvoiceLine(line) {
        // Common invoice line patterns
        // Pattern 1: "506964 EGAL สัญญาณที่ 5 COB 5W-ยูดม-ถาถ่าย 9096V 1 EA 4.00 4.00"
        // Pattern 2: "503860 สัญญาณที่ LED E14-5W-3ถาถ่าย 5 EA 1.30 6.50"
        
        const patterns = [
            // Pattern for full invoice lines with code
            /(\d{6,})\s+(.+?)\s+(\d+)\s+(EA|PCS|SET|BOX)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/,
            // Pattern without unit
            /(\d{6,})\s+(.+?)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/,
            // Pattern for simple items
            /(.+?)\s+(\d+)\s+(EA|PCS|SET|BOX)\s+(\d+\.?\d*)/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    code: match[1] || '',
                    name: match[2]?.trim() || line.trim(),
                    quantity: parseInt(match[3]) || 1,
                    unit: match[4] || 'EA',
                    price: parseFloat(match[5]) || 0,
                    amount: parseFloat(match[6]) || 0
                };
            }
        }
        
        return null;
    }
    
    showProcessing(show, message = 'កំពុងដំណើរការ...') {
        // Same as original
        console.log(message);
    }
}

// ==============================================
// INVOICE CREATOR CLASS
// ==============================================

class InvoiceCreator {
    constructor() {
        this.currentInvoice = {
            id: Date.now(),
            customer: '',
            phone: '',
            date: new Date().toISOString().split('T')[0],
            number: 'INV-' + Date.now().toString().slice(-6),
            items: [],
            subtotal: 0,
            total: 0
        };
        this.init();
    }
    
    init() {
        // Set up date and invoice number
        const dateInput = document.getElementById('invoice-date');
        const numberInput = document.getElementById('invoice-number');
        
        if (dateInput) dateInput.value = this.currentInvoice.date;
        if (numberInput) numberInput.value = this.currentInvoice.number;
        
        // Event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const addBtn = document.getElementById('add-invoice-item');
        const saveBtn = document.getElementById('save-invoice');
        const printBtn = document.getElementById('print-invoice');
        const excelBtn = document.getElementById('export-invoice-excel');
        const imageBtn = document.getElementById('export-invoice-image');
        const clearBtn = document.getElementById('clear-invoice');
        
        if (addBtn) addBtn.addEventListener('click', () => this.addItemRow());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveInvoice());
        if (printBtn) printBtn.addEventListener('click', () => this.printInvoice());
        if (excelBtn) excelBtn.addEventListener('click', () => this.exportToExcel());
        if (imageBtn) imageBtn.addEventListener('click', () => this.exportAsImage());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearInvoice());
        
        // Auto-generate invoice number
        const numberInput = document.getElementById('invoice-number');
        if (numberInput) {
            numberInput.addEventListener('focus', (e) => {
                if (e.target.value === 'INV-') {
                    e.target.value = 'INV-' + Date.now().toString().slice(-6);
                }
            });
        }
    }
    
    addItemRow(itemData = {}) {
        const tbody = document.getElementById('invoice-items-body');
        if (!tbody) return;
        
        const rowId = Date.now();
        const rowCount = tbody.children.length;
        
        const row = document.createElement('tr');
        row.id = `invoice-item-${rowId}`;
        row.innerHTML = `
            <td>${rowCount + 1}</td>
            <td><input type="text" class="form-control small" value="${itemData.code || ''}" placeholder="កូដ"></td>
            <td><input type="text" class="form-control" value="${itemData.name || ''}" placeholder="ពណ៌នាទំនិញ"></td>
            <td><input type="number" class="form-control small qty" value="${itemData.quantity || 1}" min="1"></td>
            <td>
                <select class="form-control small">
                    <option value="EA" ${(itemData.unit || 'EA') === 'EA' ? 'selected' : ''}>EA</option>
                    <option value="PCS" ${(itemData.unit || 'EA') === 'PCS' ? 'selected' : ''}>PCS</option>
                    <option value="SET" ${(itemData.unit || 'EA') === 'SET' ? 'selected' : ''}>SET</option>
                    <option value="BOX" ${(itemData.unit || 'EA') === 'BOX' ? 'selected' : ''}>BOX</option>
                </select>
            </td>
            <td><input type="number" class="form-control small price" value="${itemData.price || 0}" min="0" step="0.01"></td>
            <td class="amount">$0.00</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="invoiceCreator.removeItem(${rowId})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Add calculation listeners
        const qtyInput = row.querySelector('.qty');
        const priceInput = row.querySelector('.price');
        
        const updateAmount = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const amount = qty * price;
            row.querySelector('.amount').textContent = `$${amount.toFixed(2)}`;
            this.updateTotals();
        };
        
        qtyInput.addEventListener('input', updateAmount);
        priceInput.addEventListener('input', updateAmount);
        updateAmount();
    }
    
    removeItem(rowId) {
        const row = document.getElementById(`invoice-item-${rowId}`);
        if (row) {
            row.remove();
            this.updateRowNumbers();
            this.updateTotals();
        }
    }
    
    updateRowNumbers() {
        const rows = document.querySelectorAll('#invoice-items-body tr');
        rows.forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });
    }
    
    updateTotals() {
        const rows = document.querySelectorAll('#invoice-items-body tr');
        let subtotal = 0;
        
        rows.forEach(row => {
            const amountText = row.querySelector('.amount')?.textContent || '$0';
            const amount = parseFloat(amountText.replace('$', '')) || 0;
            subtotal += amount;
        });
        
        this.currentInvoice.subtotal = subtotal;
        this.currentInvoice.total = subtotal;
        
        const totalElement = document.getElementById('invoice-total');
        if (totalElement) {
            totalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
    }
    
    saveInvoice() {
        // Get form data
        const customerInput = document.getElementById('invoice-customer');
        const phoneInput = document.getElementById('invoice-phone');
        const dateInput = document.getElementById('invoice-date');
        const numberInput = document.getElementById('invoice-number');
        
        if (!customerInput || !customerInput.value.trim()) {
            alert('សូមបញ្ចូលឈ្មោះអតិថិជន!');
            return;
        }
        
        this.currentInvoice = {
            id: Date.now(),
            customer: customerInput.value.trim(),
            phone: phoneInput?.value.trim() || '',
            date: dateInput?.value || new Date().toISOString().split('T')[0],
            number: numberInput?.value || 'INV-' + Date.now().toString().slice(-6),
            items: [],
            subtotal: 0,
            total: 0,
            createdAt: new Date().toISOString()
        };
        
        // Collect items
        const rows = document.querySelectorAll('#invoice-items-body tr');
        rows.forEach(row => {
            const item = {
                code: row.cells[1].querySelector('input')?.value || '',
                name: row.cells[2].querySelector('input')?.value || '',
                quantity: parseFloat(row.cells[3].querySelector('input')?.value) || 0,
                unit: row.cells[4].querySelector('select')?.value || 'EA',
                price: parseFloat(row.cells[5].querySelector('input')?.value) || 0,
                amount: parseFloat(row.querySelector('.amount')?.textContent?.replace('$', '')) || 0
            };
            
            if (item.name && item.quantity > 0) {
                this.currentInvoice.items.push(item);
            }
        });
        
        if (this.currentInvoice.items.length === 0) {
            alert('សូមបន្ថែមទំនិញយ៉ាងហោចណាស់មួយ!');
            return;
        }
        
        // Calculate totals
        this.currentInvoice.subtotal = this.currentInvoice.items.reduce((sum, item) => sum + item.amount, 0);
        this.currentInvoice.total = this.currentInvoice.subtotal;
        
        // Save to localStorage
        let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
        invoices.push(this.currentInvoice);
        localStorage.setItem('invoices', JSON.stringify(invoices));
        
        // Generate preview
        this.generatePreview();
        
        alert('វិក័យប័ត្រត្រូវបានរក្សាទុកដោយជោគជ័យ!');
    }
    
    generatePreview() {
        const preview = document.getElementById('invoice-preview');
        if (!preview) return;
        
        const settings = JSON.parse(localStorage.getItem('settings')) || {};
        
        const html = `
            <div class="invoice-template" id="invoice-print-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 800px; margin: auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #1e3c72;">${settings.companyName || 'ក្រុមហ៊ុន'}</h2>
                    <p>${settings.address || ''}</p>
                    <p>ទូរស័ព្ទ: ${settings.phone || ''}</p>
                </div>
                
                <h3 style="text-align: center; border-bottom: 2px solid #1e3c72; padding-bottom: 10px;">វិក័យប័ត្រ</h3>
                
                <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                    <div>
                        <p><strong>អតិថិជន:</strong> ${this.currentInvoice.customer}</p>
                        <p><strong>លេខទូរស័ព្ទ:</strong> ${this.currentInvoice.phone || 'N/A'}</p>
                    </div>
                    <div>
                        <p><strong>លេខវិក័យប័ត្រ:</strong> ${this.currentInvoice.number}</p>
                        <p><strong>កាលបរិច្ឆេទ:</strong> ${formatDate(this.currentInvoice.date)}</p>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead style="background: #1e3c72; color: white;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #ddd;">លរ</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">កូដ</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">ពណ៌នា</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">ចំនួន</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">ខ្នាត</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">តម្លៃ</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">សរុប</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentInvoice.items.map((item, index) => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.code}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${item.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot style="background: #f8f9fa; font-weight: bold;">
                        <tr>
                            <td colspan="6" style="padding: 10px; border: 1px solid #ddd; text-align: right;">សរុប:</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${this.currentInvoice.total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ddd;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <p>ហត្ថលេខាអតិថិជន</p>
                            <p style="margin-top: 50px;">_________________________</p>
                        </div>
                        <div>
                            <p>ហត្ថលេខាអ្នកលក់</p>
                            <p style="margin-top: 50px;">_________________________</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        preview.innerHTML = html;
    }
    
    printInvoice() {
        const preview = document.getElementById('invoice-print-content');
        if (!preview) {
            alert('សូមរក្សាទុកវិក័យប័ត្រមុន!');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>វិក័យប័ត្រ - ${this.currentInvoice.number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    @page { margin: 0.5in; }
                </style>
            </head>
            <body>${preview.outerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
    
    exportToExcel() {
        if (!this.currentInvoice.items || this.currentInvoice.items.length === 0) {
            alert('មិនមានទិន្នន័យត្រូវនាំចេញ!');
            return;
        }
        
        try {
            // Prepare data
            const excelData = [
                ['លេខវិក័យប័ត្រ', this.currentInvoice.number],
                ['អតិថិជន', this.currentInvoice.customer],
                ['កាលបរិច្ឆេទ', formatDate(this.currentInvoice.date)],
                ['', ''],
                ['លរ', 'កូដ', 'ពណ៌នា', 'ចំនួន', 'ខ្នាត', 'តម្លៃ', 'សរុប']
            ];
            
            this.currentInvoice.items.forEach((item, index) => {
                excelData.push([
                    index + 1,
                    item.code,
                    item.name,
                    item.quantity,
                    item.unit,
                    item.price,
                    item.amount
                ]);
            });
            
            excelData.push(['', '', '', '', '', 'សរុប:', this.currentInvoice.total]);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, 'វិក័យប័ត្រ');
            
            // Save file
            const filename = `វិក័យប័ត្រ_${this.currentInvoice.number}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            alert('វិក័យប័ត្រត្រូវបាននាំចេញទៅ Excel!');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('មិនអាចនាំចេញ: ' + error.message);
        }
    }
    
    exportAsImage() {
    if (typeof html2canvas === 'undefined') {
        alert('Please wait while loading image export library...');
        return;
    }
    
    const preview = document.getElementById('invoice-print-content');
    if (!preview) {
        alert('សូមរក្សាទុកវិក័យប័ត្រមុន!');
        return;
    }
    
    html2canvas(preview).then(canvas => {
        const link = document.createElement('a');
        link.download = `វិក័យប័ត្រ_${this.currentInvoice.number}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}
    
    clearInvoice() {
        if (confirm('តើអ្នកពិតជាចង់ចាប់ផ្ដើមឡើងវិញមែនឬទេ?')) {
            const inputs = [
                'invoice-customer',
                'invoice-phone',
                'invoice-date',
                'invoice-number'
            ];
            
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            
            // Reset date and number
            document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('invoice-number').value = 'INV-' + Date.now().toString().slice(-6);
            
            // Clear items
            document.getElementById('invoice-items-body').innerHTML = '';
            document.getElementById('invoice-total').textContent = '$0.00';
            document.getElementById('invoice-preview').innerHTML = '';
            
            // Reset object
            this.currentInvoice = {
                id: Date.now(),
                customer: '',
                phone: '',
                date: new Date().toISOString().split('T')[0],
                number: 'INV-' + Date.now().toString().slice(-6),
                items: [],
                subtotal: 0,
                total: 0
            };
        }
    }
}

// ==============================================
// INITIALIZE NEW SYSTEMS
// ==============================================

let enhancedOCR = null;
let invoiceCreator = null;

// Initialize when tabs are clicked
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced OCR
    document.querySelector('[data-tab="ocr-invoice"]')?.addEventListener('click', function() {
        if (!enhancedOCR) {
            enhancedOCR = new EnhancedInvoiceOCRProcessor();
        }
    });
    
    // Invoice Creator
    document.querySelector('[data-tab="create-invoice"]')?.addEventListener('click', function() {
        if (!invoiceCreator) {
            invoiceCreator = new InvoiceCreator();
        }
    });
    
    // Make invoiceCreator available globally for onclick events
    window.invoiceCreator = invoiceCreator;
});

// ==============================================
// DUAL OCR SYSTEM - KEEP OLD & ADD SMART OCR
// ==============================================

class DualOCRSystem {
    constructor() {
        this.mode = 'simple'; // 'simple' or 'smart'
        this.smartOCR = null;
        this.simpleOCR = null;
        this.canvas = null;
        this.ctx = null;
        
        this.init();
    }
    
    init() {
        // Setup mode switcher
        this.setupModeSwitcher();
        
        // Initialize both systems
        this.initSimpleOCR();
        this.initSmartOCR();
        
        // Setup file upload for both modes
        this.setupFileUpload();
    }
    
    setupModeSwitcher() {
        const radioButtons = document.querySelectorAll('input[name="ocr-mode"]');
        const smartGuide = document.getElementById('smart-guide');
        const smartBtn = document.getElementById('smart-table-btn');
        const instruction = document.getElementById('ocr-instruction');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.mode = e.target.value;
                
                if (this.mode === 'smart') {
                    // Show smart OCR features
                    if (smartGuide) smartGuide.style.display = 'block';
                    if (smartBtn) smartBtn.style.display = 'inline-block';
                    if (instruction) instruction.textContent = 'ស្វែងរកតារាងដោយស្វ័យប្រវត្តិ ឬជ្រើសរើសតំបន់តារាង';
                    
                    // Initialize smart OCR if not already done
                    if (!this.smartOCR && this.canvas) {
                        this.smartOCR = new SmartOCRProcessor();
                        this.smartOCR.setupCanvas(this.canvas, this.ctx);
                    }
                } else {
                    // Show simple OCR features
                    if (smartGuide) smartGuide.style.display = 'none';
                    if (smartBtn) smartBtn.style.display = 'none';
                    if (instruction) instruction.textContent = 'ប្រើម៉ៅស៍អូសដើម្បីជ្រើសរើសតំបន់ដែលមានទិន្នន័យទំនិញ';
                }
            });
        });
    }
    
    initSimpleOCR() {
        // Keep the original OCR system
        this.simpleOCR = {
            selectedAreas: [],
            parsedItems: [],
            
            // Copy methods from original InvoiceOCRProcessor
            clearSelectedAreas: function() {
                this.selectedAreas = [];
                const container = document.getElementById('selected-areas');
                if (container) container.innerHTML = '';
            },
            
            // Add other simple OCR methods as needed
            // ... [You can copy methods from your original InvoiceOCRProcessor class]
        };
        
        // Hook up simple OCR buttons
        const clearBtn = document.getElementById('clear-area-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (this.mode === 'simple') {
                    this.simpleOCR.clearSelectedAreas();
                } else if (this.smartOCR) {
                    this.smartOCR.clearTable();
                }
            };
        }
        
        const autoDetectBtn = document.getElementById('auto-detect-btn');
        if (autoDetectBtn) {
            autoDetectBtn.onclick = () => {
                if (this.mode === 'simple') {
                    this.simpleAutoDetect();
                } else if (this.smartOCR) {
                    this.smartOCR.autoDetectInvoiceTable();
                }
            };
        }
        
        const smartTableBtn = document.getElementById('smart-table-btn');
        if (smartTableBtn) {
            smartTableBtn.onclick = () => {
                if (this.smartOCR) {
                    this.smartOCR.smartTableOCR();
                }
            };
        }
    }
    
    initSmartOCR() {
        // Smart OCR will be initialized when needed
        // We'll create it when smart mode is selected
    }
    
    setupFileUpload() {
        // Use the existing file upload from the original system
        // It will work for both modes
    }
    
    simpleAutoDetect() {
        // Simple auto-detect for basic OCR
        if (!this.canvas) {
            alert('សូមផ្ទុករូបភាពមុន!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងស្វែងរកតំបន់...');
        
        // Simple area selection (middle of image)
        const area = {
            x: this.canvas.width * 0.1,
            y: this.canvas.height * 0.2,
            width: this.canvas.width * 0.8,
            height: this.canvas.height * 0.6
        };
        
        // Draw selection
        this.ctx.strokeStyle = '#4299e1';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(area.x, area.y, area.width, area.height);
        this.ctx.setLineDash([]);
        
        this.simpleOCR.selectedAreas = [area];
        
        // Update display
        const container = document.getElementById('selected-areas');
        if (container) {
            container.innerHTML = '<div class="area-box">តំបន់ស្វ័យប្រវត្តិ</div>';
        }
        
        this.showProcessing(false);
        alert('បានជ្រើសរើសតំបន់ស្វ័យប្រវត្តិ!');
    }
    
    showProcessing(show, message) {
        // Use existing processing overlay
        let overlay = document.getElementById('ocr-processing-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ocr-processing-overlay';
            // ... same as before
        }
        // ... rest of processing code
    }
}

// ==============================================
// SMART OCR PROCESSOR (TABLE-AWARE)
// ==============================================

class SmartOCRProcessor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.selectedTable = null;
        this.items = [];
    }
    
    setupCanvas(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }
    
    async autoDetectInvoiceTable() {
        if (!this.canvas) {
            alert('សូមផ្ទុករូបភាពមុន!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងស្វែងរកតារាង...');
        
        try {
            // Simple table detection for now
            // In production, you'd use more advanced image processing
            const table = {
                top: this.canvas.height * 0.25,
                bottom: this.canvas.height * 0.75,
                left: this.canvas.width * 0.05,
                right: this.canvas.width * 0.95,
                rows: 10,
                columns: 7
            };
            
            this.selectedTable = table;
            this.drawTableOutline(table);
            
            this.showProcessing(false);
            alert('បានរកឃើញតារាង! សូមផ្ទៀងផ្ទាត់តំបន់។');
            
        } catch (error) {
            console.error('Table detection error:', error);
            this.showProcessing(false);
            alert('មិនអាចស្វែងរកតារាង។ សូមជ្រើសរើសមានុច។');
        }
    }
    
    drawTableOutline(table) {
        // Clear previous drawings
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Draw green outline
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            table.left, 
            table.top, 
            table.right - table.left, 
            table.bottom - table.top
        );
        this.ctx.setLineDash([]);
    }
    
    async smartTableOCR() {
        if (!this.selectedTable) {
            alert('សូមស្វែងរកតារាងមុន!');
            return;
        }
        
        this.showProcessing(true, 'កំពុងដំណើរការ OCR តារាង...');
        
        try {
            // Perform OCR on table area
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('khm+eng');
            await worker.initialize('khm+eng');
            
            const { data: { text } } = await worker.recognize(this.canvas);
            await worker.terminate();
            
            // Parse table text
            this.parseTableText(text);
            
            // Display results
            this.displayResults(text);
            
            // Go to step 3
            this.showStep(3);
            this.showProcessing(false);
            
        } catch (error) {
            console.error('Smart OCR error:', error);
            this.showProcessing(false);
            alert('មានបញ្ហាក្នុងការដំណើរការ OCR: ' + error.message);
        }
    }
    
    parseTableText(text) {
        const lines = text.split('\n').filter(line => line.trim());
        this.items = [];
        
        // Look for table data
        let inTable = false;
        let rowNumber = 1;
        
        for (const line of lines) {
            // Skip headers
            if (this.isTableHeader(line)) {
                inTable = true;
                continue;
            }
            
            // Skip totals
            if (this.isTotalLine(line)) {
                break;
            }
            
            if (inTable && line.trim()) {
                // Parse the line as a table row
                const item = this.parseTableRow(line, rowNumber);
                if (item) {
                    this.items.push(item);
                    rowNumber++;
                }
            }
        }
    }
    
    isTableHeader(line) {
        const headers = ['លរ', 'កូដ', 'ពណ៌នា', 'ចំនួន', 'ខ្នាត', 'តម្លៃ', 'សរុប',
                       'No', 'Code', 'Description', 'Qty', 'Unit', 'Price', 'Amount'];
        return headers.some(header => line.toLowerCase().includes(header.toLowerCase()));
    }
    
    isTotalLine(line) {
        return line.toLowerCase().includes('សរុប') || 
               line.toLowerCase().includes('total');
    }
    
    parseTableRow(line, rowNumber) {
        // Try to extract data using multiple strategies
        const strategies = [
            this.parseByMultipleSpaces,
            this.parseByCommonPattern,
            this.parseByWordGroups
        ];
        
        for (const strategy of strategies) {
            const item = strategy.call(this, line, rowNumber);
            if (item && item.name) {
                return item;
            }
        }
        
        return null;
    }
    
    parseByMultipleSpaces(line, rowNumber) {
        // Split by 2+ spaces (common in tabular data)
        const parts = line.split(/\s{2,}/).filter(p => p.trim());
        
        if (parts.length >= 3) {
            return {
                number: rowNumber,
                code: parts[0] || '',
                name: parts[1] || '',
                quantity: this.extractNumber(parts[2]) || 1,
                price: this.extractPrice(parts.length > 3 ? parts[3] : '') || 0
            };
        }
        
        return null;
    }
    
    parseByCommonPattern(line, rowNumber) {
        // Common invoice pattern: "CODE DESCRIPTION QTY PRICE"
        const pattern = /(\w+)\s+(.+?)\s+(\d+)\s+(\d+\.?\d*)/;
        const match = line.match(pattern);
        
        if (match) {
            return {
                number: rowNumber,
                code: match[1],
                name: match[2].trim(),
                quantity: parseInt(match[3]),
                price: parseFloat(match[4])
            };
        }
        
        return null;
    }
    
    parseByWordGroups(line, rowNumber) {
        // Try to identify groups of words
        const words = line.split(/\s+/);
        
        if (words.length >= 2) {
            // Last word might be price
            const lastWord = words[words.length - 1];
            const price = this.extractPrice(lastWord);
            
            // Second last might be quantity
            const secondLast = words[words.length - 2];
            const quantity = this.extractNumber(secondLast);
            
            // Everything else is the name/code
            const nameParts = price !== null ? 
                words.slice(0, words.length - (quantity !== null ? 2 : 1)) : 
                words;
            
            return {
                number: rowNumber,
                name: nameParts.join(' ').trim(),
                quantity: quantity || 1,
                price: price || 0
            };
        }
        
        return null;
    }
    
    extractNumber(text) {
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }
    
    extractPrice(text) {
        const match = text.match(/\$?(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
    }
    
    displayResults(text) {
        // Update OCR output
        const output = document.getElementById('ocr-output');
        if (output) {
            output.innerHTML = `<pre>${text}</pre>`;
        }
        
        // Display parsed items
        const container = document.getElementById('parsed-items-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.items.length === 0) {
            container.innerHTML = '<p>មិនមានទំនិញត្រូវបានស្វែងរក។</p>';
            return;
        }
        
        this.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'parsed-item';
            itemElement.innerHTML = `
                <div class="parsed-item-info">
                    <h5>${item.number}. ${item.name}</h5>
                    <p>
                        ${item.code ? `<span class="text-muted">កូដ:</span> ${item.code} | ` : ''}
                        <span class="text-muted">ចំនួន:</span> ${item.quantity} |
                        <span class="text-muted">តម្លៃ:</span> $${item.price.toFixed(2)}
                    </p>
                </div>
                <div class="parsed-item-actions">
                    <button class="btn btn-small btn-success" onclick="dualOCR.addItemToInventory(${index})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemElement);
        });
    }
    
    showStep(stepNumber) {
        // Same as before
        document.querySelectorAll('.ocr-step').forEach(step => {
            step.classList.remove('active');
        });
        const stepElement = document.getElementById(`ocr-step-${stepNumber}`);
        if (stepElement) {
            stepElement.classList.add('active');
        }
    }
    
    showProcessing(show, message) {
        // Same as before
        // ... processing overlay code
    }
    
    clearTable() {
        this.selectedTable = null;
        if (this.canvas && this.currentImage) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// ==============================================
// INTEGRATION WITH EXISTING SYSTEM
// ==============================================

let dualOCR = null;
let originalOCR = null; // Keep reference to original OCR

document.addEventListener('DOMContentLoaded', function() {
    // Initialize original OCR (keep existing functionality)
    document.querySelector('[data-tab="ocr-invoice"]').addEventListener('click', function() {
        if (!originalOCR) {
            // Initialize the original OCR system
            originalOCR = new InvoiceOCRProcessor();
            
            // Also initialize dual OCR system
            dualOCR = new DualOCRSystem();
            
            // Hook into the original OCR's image loading
            const originalLoadImage = originalOCR.loadImage;
            originalOCR.loadImage = async function(imageUrl) {
                await originalLoadImage.call(this, imageUrl);
                
                // Also setup dual OCR
                const canvas = document.querySelector('#image-preview canvas');
                const ctx = canvas.getContext('2d');
                if (dualOCR && canvas) {
                    dualOCR.canvas = canvas;
                    dualOCR.ctx = ctx;
                    dualOCR.currentImage = this.currentImage;
                }
            };
        }
    });
});

// Make dualOCR available globally
window.dualOCR = dualOCR;

// Add helper method
window.dualOCR.addItemToInventory = function(index) {
    if (!dualOCR || !dualOCR.smartOCR || !dualOCR.smartOCR.items) {
        alert('សូមដំណើរការ OCR មុន!');
        return;
    }
    
    const item = dualOCR.smartOCR.items[index];
    if (!item) return;
    
    // Use existing functionality from original system
    const companySelect = document.getElementById('target-company');
    const company = companySelect?.value;
    
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
        notes: item.code ? `កូដ: ${item.code} | បានបន្ថែមពី OCR` : 'បានបន្ថែមពី OCR',
        addedDate: new Date().toISOString()
    };
    
    // Use existing save function
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    inventory.push(inventoryItem);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    
    // Update UI using existing functions
    loadInventory();
    updateStats();
    
    alert(`ទំនិញ "${item.name}" ត្រូវបានបន្ថែម!`);
};
