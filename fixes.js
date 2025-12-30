// fixes.js - Quick fixes for the inventory system

// Fix 1: Ensure core functions are available
if (typeof initTabs === 'undefined') {
    console.error('initTabs is not defined!');
    
    // Basic tab initialization
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
                const targetPane = document.getElementById(tabId);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }
}

// Fix 2: Basic modal functionality
if (typeof initModal === 'undefined') {
    function initModal() {
        const modal = document.getElementById('company-modal');
        const closeButtons = document.querySelectorAll('.modal-close');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (modal) modal.classList.remove('active');
            });
        });
        
        // Add company button
        const addCompanyBtn = document.getElementById('add-new-company');
        if (addCompanyBtn) {
            addCompanyBtn.addEventListener('click', () => {
                if (modal) modal.classList.add('active');
            });
        }
    }
}

// Fix 3: Basic inventory loading
if (typeof loadInventory === 'undefined') {
    function loadInventory() {
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const tbody = document.getElementById('inventory-list');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (inventory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 50px; color: #6c757d;">
                        <i class="fas fa-box-open"></i>
                        <h3>មិនមានទំនិញទេ។ សូមបន្ថែមទំនិញថ្មី!</h3>
                    </td>
                </tr>
            `;
            return;
        }
        
        inventory.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.company || 'មិនមាន'}</td>
                <td>${item.name}</td>
                <td>${item.category || '-'}</td>
                <td>${item.quantity}</td>
                <td>$${item.price || '0'}</td>
                <td>${item.date || new Date().toLocaleDateString()}</td>
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
    }
}

// Fix 4: Basic stats update
if (typeof updateStats === 'undefined') {
    function updateStats() {
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const companies = JSON.parse(localStorage.getItem('companies')) || [];
        
        document.getElementById('total-items').textContent = inventory.length;
        document.getElementById('total-companies').textContent = companies.length;
        
        // Calculate out of stock
        const outOfStock = inventory.filter(item => item.quantity === 0).length;
        document.getElementById('out-of-stock').textContent = outOfStock;
        
        // Calculate total value
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    }
}

// Fix 5: Basic add item functionality
if (typeof initAddItem === 'undefined') {
    function initAddItem() {
        const form = document.getElementById('add-item-form');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const company = document.getElementById('item-company')?.value || 'គ្មានក្រុមហ៊ុន';
            const name = document.getElementById('item-name')?.value;
            const quantity = parseInt(document.getElementById('item-quantity')?.value) || 0;
            const price = parseFloat(document.getElementById('item-price')?.value) || 0;
            const date = document.getElementById('item-date')?.value || new Date().toISOString().split('T')[0];
            
            if (!name) {
                alert('សូមបញ្ចូលឈ្មោះទំនិញ!');
                return;
            }
            
            const item = {
                id: Date.now(),
                company: company,
                name: name,
                quantity: quantity,
                price: price,
                date: date,
                addedDate: new Date().toISOString()
            };
            
            let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
            inventory.push(item);
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            // Update UI
            addRecentItem(item);
            updateStats();
            
            // Reset form
            form.reset();
            document.getElementById('item-date').value = new Date().toISOString().split('T')[0];
            
            alert('ទំនិញត្រូវបានបន្ថែមដោយជោគជ័យ!');
        });
    }
}

// Fix 6: Recent items display
if (typeof addRecentItem === 'undefined') {
    function addRecentItem(item) {
        const recentItemsDiv = document.getElementById('recent-items');
        if (!recentItemsDiv) return;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'recent-item';
        itemDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4>${item.name}</h4>
                    <p style="color: #1e3c72; font-weight: 600;">${item.company}</p>
                </div>
                <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px;">
                    ${item.quantity} គ្រឿង
                </span>
            </div>
            <p><i class="fas fa-money-bill-wave"></i> $${item.price}</p>
            <p><i class="fas fa-calendar"></i> ${item.date}</p>
            <small>បានបន្ថែម: ${new Date(item.addedDate).toLocaleString()}</small>
        `;
        
        recentItemsDiv.insertBefore(itemDiv, recentItemsDiv.firstChild);
    }
}

// Fix 7: Basic settings initialization
if (typeof initSettings === 'undefined') {
    function initSettings() {
        // Simple settings load
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        const display = document.getElementById('company-name-display');
        if (display && settings.companyName) {
            display.textContent = settings.companyName;
        }
    }
}

// Fix 8: Load companies for select
if (typeof loadCompanies === 'undefined') {
    function loadCompanies() {
        const companies = JSON.parse(localStorage.getItem('companies')) || [];
        const select = document.getElementById('item-company');
        
        if (!select) return;
        
        select.innerHTML = '<option value="">-- ជ្រើសរើសក្រុមហ៊ុន --</option>';
        
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.name || company.id;
            option.textContent = company.name;
            select.appendChild(option);
        });
    }
}

// Fix 9: Date update
if (typeof updateAppDate === 'undefined') {
    function updateAppDate() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        const dateElement = document.getElementById('app-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('km-KH', options);
        }
    }
}

// Fix 10: Delete item function
if (typeof deleteItem === 'undefined') {
    window.deleteItem = function(itemId) {
        if (!confirm('តើអ្នកពិតជាចង់លុបទំនិញនេះមែនឬទេ?')) return;
        
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventory = inventory.filter(item => item.id !== itemId);
        
        localStorage.setItem('inventory', JSON.stringify(inventory));
        loadInventory();
        updateStats();
    }
}

// Fix 11: Edit item function
if (typeof editItem === 'undefined') {
    window.editItem = function(itemId) {
        alert('ការកែប្រែនឹងត្រូវបានបន្ថែមនៅពេលក្រោយ!');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing app with fixes...');
    
    // Initialize core functions
    initTabs();
    initAddItem();
    initModal();
    
    // Load data
    loadCompanies();
    loadInventory();
    initSettings();
    
    // Update UI
    updateStats();
    updateAppDate();
    
    console.log('App initialized successfully');
});
