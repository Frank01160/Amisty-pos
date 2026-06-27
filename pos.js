// ============================================
// AMISTY POS - POINT OF SALE
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page - both roles
    if (!Auth.protectPage(['manager', 'seller'])) return;
    
    // Initialize
    Auth.init();
    Navigation.init();
    Animations.init();
    OfflineManager.init();
    SoundManager.init();
    
    // POS State
    window.posState = {
        basket: [],
        selectedProduct: null,
        products: [],
        categories: [],
        settings: {}
    };
    
    // Load initial data
    await loadPOSData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update basket display
    updateBasketDisplay();
});

async function loadPOSData() {
    try {
        // Load settings
        posState.settings = await DataService.getSettings();
        
        // Load products
        posState.products = await DataService.getProducts();
        
        // Load categories
        posState.categories = await DataService.getCategories();
        
        // Populate category filter
        populateCategoryFilter();
        
        // Populate quick sale buttons
        populateQuickSaleButtons();
        
        // Display products
        displayProducts(posState.products);
        
    } catch (error) {
        console.error('Error loading POS data:', error);
        Utils.showToast('Error loading products. Check connection.', 'error');
    }
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="all">📂 All Categories</option>';
    
    posState.categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
}

function populateQuickSaleButtons() {
    const container = document.getElementById('quickSaleButtons');
    const quickIds = posState.settings.quickSaleProductIds || [];
    
    if (quickIds.length === 0) {
        container.innerHTML = '<span class="text-muted">No quick sale items configured</span>';
        return;
    }
    
    const quickProducts = posState.products.filter(p => quickIds.includes(p.id));
    
    container.innerHTML = quickProducts.map(p => `
        <button class="quick-sale-btn ripple" onclick="addToBasketQuick('${p.id}')">
            <span class="quick-sale-name">${p.name}</span>
            <span class="quick-sale-price">${Utils.formatCurrency(p.sellingPrice, 'KES')}</span>
        </button>
    `).join('');
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr class="product-row">
            <td>
                <strong>${p.name}</strong>
                ${p.description ? `<br><small class="text-muted">${p.description.substring(0, 50)}</small>` : ''}
            </td>
            <td><span class="badge badge-info">${p.category || 'N/A'}</span></td>
            <td>${Utils.calculateStockDisplay(p)}</td>
            <td>${Utils.formatCurrency(p.sellingPrice, 'KES')}</td>
            <td>
                <button class="btn btn-primary btn-sm ripple" onclick="openUnitSelection('${p.id}')">
                    ➕ Add
                </button>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Product search
    const searchInput = document.getElementById('productSearch');
    searchInput.addEventListener('input', Utils.debounce(() => {
        const query = searchInput.value.toLowerCase();
        const filtered = posState.products.filter(p => 
            p.name.toLowerCase().includes(query) ||
            (p.category && p.category.toLowerCase().includes(query))
        );
        displayProducts(filtered);
    }, 300));
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        const category = e.target.value;
        if (category === 'all') {
            displayProducts(posState.products);
        } else {
            const filtered = posState.products.filter(p => p.category === category);
            displayProducts(filtered);
        }
    });
    
    // Discount input
    document.getElementById('discountAmount').addEventListener('input', updateBasketDisplay);
    
    // Clear basket
    document.getElementById('clearBasketButton').addEventListener('click', clearBasket);
    
    // Complete sale
    document.getElementById('completeSaleButton').addEventListener('click', showConfirmation);
    
    // Hold sale
    document.getElementById('holdSaleButton').addEventListener('click', holdSale);
    
    // Confirmation modal buttons
    document.getElementById('confirmSale').addEventListener('click', completeSale);
    document.getElementById('cancelSale').addEventListener('click', () => Utils.hideModal('confirmModal'));
    document.getElementById('closeConfirmModal').addEventListener('click', () => Utils.hideModal('confirmModal'));
    document.getElementById('printReceiptOnly').addEventListener('click', () => printReceiptOnly());
    document.getElementById('downloadReceiptOnly').addEventListener('click', () => downloadReceiptOnly());
    
    // Unit selection modal
    document.getElementById('closeUnitModal').addEventListener('click', () => Utils.hideModal('unitSelectionModal'));
    document.getElementById('cancelUnitSelection').addEventListener('click', () => Utils.hideModal('unitSelectionModal'));
    document.getElementById('confirmUnitSelection').addEventListener('click', confirmUnitSelection);
    
    // Receipt modal
    document.getElementById('closeReceiptModal').addEventListener('click', () => Utils.hideModal('receiptModal'));
    document.getElementById('closeReceipt').addEventListener('click', () => Utils.hideModal('receiptModal'));
    document.getElementById('printReceipt').addEventListener('click', printCurrentReceipt);
    document.getElementById('downloadReceipt').addEventListener('click', downloadCurrentReceipt);
}

// ============ UNIT SELECTION ============

async function openUnitSelection(productId) {
    const product = posState.products.find(p => p.id === productId);
    if (!product) return;
    
    posState.selectedProduct = product;
    
    document.getElementById('unitProductName').textContent = product.name;
    document.getElementById('stockAvailable').textContent = `Available: ${Utils.calculateStockDisplay(product)}`;
    
    const unitOptions = document.getElementById('unitOptions');
    const quantityGroup = document.getElementById('quantityInputGroup');
    const quantityInput = document.getElementById('unitQuantity');
    
    if (product.unitType === 'ngunia-kg') {
        unitOptions.innerHTML = `
            <button class="btn btn-outline unit-option" data-unit="ngunia">🛍️ Ngunia</button>
            <button class="btn btn-outline unit-option" data-unit="kg">⚖️ Kg</button>
        `;
        quantityGroup.style.display = 'block';
        
        // Unit option click handlers
        unitOptions.querySelectorAll('.unit-option').forEach(btn => {
            btn.addEventListener('click', () => {
                unitOptions.querySelectorAll('.unit-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                posState.selectedUnit = btn.dataset.unit;
                quantityInput.placeholder = `Enter ${btn.dataset.unit}`;
            });
        });
        
    } else if (product.unitType === 'packet-items') {
        unitOptions.innerHTML = `
            <button class="btn btn-outline unit-option" data-unit="packet">📦 Packet</button>
            <button class="btn btn-outline unit-option" data-unit="item">🔹 Single Item</button>
        `;
        quantityGroup.style.display = 'block';
        
        unitOptions.querySelectorAll('.unit-option').forEach(btn => {
            btn.addEventListener('click', () => {
                unitOptions.querySelectorAll('.unit-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                posState.selectedUnit = btn.dataset.unit;
                quantityInput.placeholder = `Enter ${btn.dataset.unit}s`;
            });
        });
        
    } else {
        // Simple unit - just ask for quantity
        unitOptions.innerHTML = `<p>Unit: ${product.unitName || 'pieces'}</p>`;
        quantityGroup.style.display = 'block';
        posState.selectedUnit = product.unitName || 'piece';
        quantityInput.placeholder = 'Enter quantity';
    }
    
    quantityInput.value = '';
    Utils.showModal('unitSelectionModal');
}

function confirmUnitSelection() {
    const product = posState.selectedProduct;
    const unit = posState.selectedUnit;
    const quantity = parseFloat(document.getElementById('unitQuantity').value);
    
    if (!product || !quantity || quantity <= 0) {
        Utils.showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    // Convert to base unit
    let baseQty = quantity;
    let displayUnit = unit;
    
    if (product.unitType === 'ngunia-kg' && unit === 'ngunia') {
        baseQty = quantity * (product.conversionRate || 1);
        displayUnit = 'ngunia';
    } else if (product.unitType === 'ngunia-kg' && unit === 'kg') {
        baseQty = quantity;
        displayUnit = 'kg';
    } else if (product.unitType === 'packet-items' && unit === 'packet') {
        baseQty = quantity * (product.conversionRate || 1);
        displayUnit = 'packet';
    } else if (product.unitType === 'packet-items' && unit === 'item') {
        baseQty = quantity;
        displayUnit = 'item';
    }
    
    // Check stock
    if (baseQty > (product.stockInBaseUnit || 0)) {
        Utils.showToast('Not enough stock!', 'error');
        return;
    }
    
    // Add to basket
    posState.basket.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: displayUnit,
        qty: baseQty,
        displayQty: quantity,
        unitPrice: product.sellingPrice,
        buyingPrice: product.buyingPrice,
        lineTotal: product.sellingPrice * quantity,
        costTotal: product.buyingPrice * quantity
    });
    
    Utils.hideModal('unitSelectionModal');
    updateBasketDisplay();
    Utils.showToast(`${product.name} added to basket`, 'success');
    SoundManager.click();
}

// ============ QUICK ADD ============

function addToBasketQuick(productId) {
    const product = posState.products.find(p => p.id === productId);
    if (!product) return;
    
    // For quick add, use 1 unit
    posState.basket.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unitName || 'piece',
        qty: 1,
        displayQty: 1,
        unitPrice: product.sellingPrice,
        buyingPrice: product.buyingPrice,
        lineTotal: product.sellingPrice,
        costTotal: product.buyingPrice
    });
    
    updateBasketDisplay();
    SoundManager.click();
}

// ============ BASKET MANAGEMENT ============

function updateBasketDisplay() {
    const basketItems = document.getElementById('basketItems');
    const basketTotals = document.getElementById('basketTotals');
    const completeButton = document.getElementById('completeSaleButton');
    const completeAmount = document.getElementById('completeSaleAmount');
    
    if (posState.basket.length === 0) {
        basketItems.innerHTML = `
            <div class="empty-basket">
                <span class="empty-basket-icon">🛒</span>
                <p>No items in basket</p>
            </div>
        `;
        basketTotals.style.display = 'none';
        completeButton.disabled = true;
        return;
    }
    
    basketTotals.style.display = 'block';
    
    // Display items
    basketItems.innerHTML = posState.basket.map((item, index) => `
        <div class="basket-item">
            <div class="basket-item-info">
                <strong>${item.name}</strong>
                <span class="text-muted">${item.displayQty} ${item.unit} × ${Utils.formatCurrency(item.unitPrice, 'KES')}</span>
            </div>
            <div class="basket-item-total">${Utils.formatCurrency(item.lineTotal, 'KES')}</div>
            <button class="basket-item-remove" onclick="removeBasketItem(${index})">✕</button>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = posState.basket.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const profit = posState.basket.reduce((sum, item) => sum + (item.lineTotal - item.costTotal), 0);
    
    // Validate discount
    if (discount > profit) {
        Utils.showToast('Discount cannot exceed profit!', 'warning');
        document.getElementById('discountAmount').value = profit;
    }
    
    const total = subtotal - Math.min(discount, profit);
    
    document.getElementById('basketSubtotal').textContent = Utils.formatCurrency(subtotal, 'KES');
    document.getElementById('basketTotal').textContent = Utils.formatCurrency(total, 'KES');
    document.getElementById('basketProfit').textContent = Utils.formatCurrency(profit - Math.min(discount, profit), 'KES');
    
    completeAmount.textContent = Utils.formatCurrency(total, 'KES');
    completeButton.disabled = false;
}

function removeBasketItem(index) {
    posState.basket.splice(index, 1);
    updateBasketDisplay();
}

function clearBasket() {
    posState.basket = [];
    document.getElementById('discountAmount').value = '0';
    document.getElementById('customerName').value = '';
    updateBasketDisplay();
}

// ============ COMPLETE SALE ============

async function showConfirmation() {
    if (posState.basket.length === 0) return;
    
    const subtotal = posState.basket.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const profit = posState.basket.reduce((sum, item) => sum + (item.lineTotal - item.costTotal), 0);
    const total = subtotal - discount;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    
    const summary = document.getElementById('saleSummary');
    summary.innerHTML = `
        <div class="sale-summary-content">
            <h4>Sale Summary</h4>
            <table style="width: 100%; font-size: 14px;">
                ${posState.basket.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.displayQty} ${item.unit}</td>
                        <td style="text-align: right;">${Utils.formatCurrency(item.lineTotal, 'KES')}</td>
                    </tr>
                `).join('')}
            </table>
            <hr>
            <p><strong>Subtotal:</strong> ${Utils.formatCurrency(subtotal, 'KES')}</p>
            ${discount > 0 ? `<p><strong>Discount:</strong> ${Utils.formatCurrency(discount, 'KES')}</p>` : ''}
            <p style="font-size: 18px; font-weight: bold;">TOTAL: ${Utils.formatCurrency(total, 'KES')}</p>
            <p><strong>Payment:</strong> ${paymentMethod === 'cash' ? '💵 Cash' : '📱 Mobile Money'}</p>
            <p><strong>Profit:</strong> ${Utils.formatCurrency(profit - discount, 'KES')}</p>
        </div>
    `;
    
    Utils.showModal('confirmModal');
}

async function completeSale() {
    const subtotal = posState.basket.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const profit = posState.basket.reduce((sum, item) => sum + (item.lineTotal - item.costTotal), 0);
    const total = subtotal - discount;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    const customerName = document.getElementById('customerName').value.trim();
    
    const transaction = {
        items: posState.basket,
        subtotal,
        discount,
        total,
        profitTotal: profit - discount,
        paymentMethod,
        customerName: customerName || null,
        dateTime: new Date()
    };
    
    // Save transaction
    const result = await DataService.saveTransaction(transaction);
    
    if (result.success) {
        transaction.id = result.id;
        
        // Update stock for each item
        for (const item of posState.basket) {
            await DataService.updateStock(item.productId, item.qty, 'sale');
        }
        
        // Reload products
        await loadPOSData();
        
        // Play sound
        SoundManager.saleComplete();
        
        Utils.hideModal('confirmModal');
        
        // Store last transaction for receipt
        window.lastTransaction = transaction;
        
        // Ask for receipt
        const printReceipt = confirm('Sale complete! Would you like to print the receipt?');
        if (printReceipt) {
            await ReceiptManager.printReceipt(transaction, posState.settings);
        }
        
        // Clear basket
        clearBasket();
        Utils.showToast('Sale completed successfully!', 'success');
    } else {
        Utils.showToast('Error saving transaction. Please try again.', 'error');
    }
}

async function printReceiptOnly() {
    if (!window.lastTransaction) {
        const subtotal = posState.basket.reduce((sum, item) => sum + item.lineTotal, 0);
        const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
        
        window.lastTransaction = {
            items: posState.basket,
            subtotal,
            discount,
            total: subtotal - discount,
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash',
            customerName: document.getElementById('customerName').value.trim()
        };
    }
    await ReceiptManager.printReceipt(window.lastTransaction, posState.settings);
}

async function downloadReceiptOnly() {
    if (!window.lastTransaction) {
        const subtotal = posState.basket.reduce((sum, item) => sum + item.lineTotal, 0);
        const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
        
        window.lastTransaction = {
            items: posState.basket,
            subtotal,
            discount,
            total: subtotal - discount,
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash',
            customerName: document.getElementById('customerName').value.trim()
        };
    }
    await ReceiptManager.downloadReceipt(window.lastTransaction, posState.settings);
    Utils.hideModal('confirmModal');
}

async function printCurrentReceipt() {
    if (window.lastTransaction) {
        await ReceiptManager.printReceipt(window.lastTransaction, posState.settings);
    }
    Utils.hideModal('receiptModal');
}

async function downloadCurrentReceipt() {
    if (window.lastTransaction) {
        await ReceiptManager.downloadReceipt(window.lastTransaction, posState.settings);
    }
    Utils.hideModal('receiptModal');
}

function holdSale() {
    if (posState.basket.length > 0) {
        localStorage.setItem('heldBasket', JSON.stringify(posState.basket));
        Utils.showToast('Sale held! Click "Hold" again to resume.', 'info');
    } else {
        const held = localStorage.getItem('heldBasket');
        if (held) {
            posState.basket = JSON.parse(held);
            localStorage.removeItem('heldBasket');
            updateBasketDisplay();
            Utils.showToast('Held sale resumed!', 'success');
        }
    }
}
