// ============================================
// AMISTY POS - INVENTORY MANAGEMENT
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page - manager only
    if (!Auth.protectPage(['manager'])) return;
    
    // Initialize
    Auth.init();
    Navigation.init();
    Animations.init();
    SoundManager.init();
    
    // Load data
    await loadInventoryData();
    
    // Setup event listeners
    setupInventoryListeners();
    
    // Animate cards
    setTimeout(() => Animations.animateCards(), 200);
});

async function loadInventoryData() {
    try {
        // Load products
        const products = await DataService.getProducts();
        const categories = await DataService.getCategories();
        const lowStock = await DataService.getLowStockProducts();
        const deadStock = await DataService.getDeadStock(60);
        
        // Update stats
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalCategories').textContent = categories.length;
        document.getElementById('lowStockItems').textContent = lowStock.length;
        document.getElementById('deadStockItems').textContent = deadStock.length;
        
        // Store globally
        window.inventoryProducts = products;
        window.inventoryCategories = categories;
        
        // Populate filters
        populateInventoryFilters(categories);
        
        // Display products
        displayInventoryProducts(products);
        
        // Populate product dropdowns in modals
        populateProductSelects(products);
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        Utils.showToast('Error loading inventory data', 'error');
    }
}

function populateInventoryFilters(categories) {
    const categoryFilter = document.getElementById('inventoryCategoryFilter');
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
    
    // Product modal category
    const productCategory = document.getElementById('productCategory');
    productCategory.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
        productCategory.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
}

function populateProductSelects(products) {
    const adjustProduct = document.getElementById('adjustProduct');
    adjustProduct.innerHTML = '<option value="">Select Product</option>';
    products.forEach(p => {
        adjustProduct.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
}

function displayInventoryProducts(products) {
    const tbody = document.getElementById('inventoryTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No products found</td></tr>';
        return;
    }
    
    document.getElementById('productCount').textContent = `${products.length} items`;
    
    tbody.innerHTML = products.map(p => {
        const profitMargin = Utils.calculateProfitMargin(p.buyingPrice, p.sellingPrice);
        const stockDisplay = Utils.calculateStockDisplay(p);
        const lastSold = p.lastSoldDate ? Utils.formatDate(p.lastSoldDate.toDate()) : 'Never';
        
        let statusBadge = 'badge-success';
        let statusText = 'In Stock';
        
        if (p.stockInBaseUnit <= 0) {
            statusBadge = 'badge-danger';
            statusText = 'Out of Stock';
        } else if (p.stockInBaseUnit <= (p.lowStockThreshold || 10)) {
            statusBadge = 'badge-warning';
            statusText = 'Low Stock';
        }
        
        // Check dead stock
        if (p.lastSoldDate) {
            const daysSinceLastSale = Math.floor((new Date() - p.lastSoldDate.toDate()) / 86400000);
            if (daysSinceLastSale > 60 && p.stockInBaseUnit > 0) {
                statusBadge = 'badge-info';
                statusText = 'Dead Stock';
            }
        }
        
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-info">${p.category || 'N/A'}</span></td>
                <td>${p.unitType === 'ngunia-kg' ? 'Ngunia/Kg' : p.unitType === 'packet-items' ? 'Packet/Items' : p.unitName || 'Simple'}</td>
                <td>${stockDisplay}</td>
                <td>${Utils.formatCurrency(p.buyingPrice, 'KES')}</td>
                <td>${Utils.formatCurrency(p.sellingPrice, 'KES')}</td>
                <td><span class="${profitMargin > 0 ? 'text-success' : 'text-danger'}">${profitMargin}%</span></td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>${lastSold}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">✏️</button>
                    <button class="btn btn-outline btn-sm btn-danger" onclick="deleteProductConfirm('${p.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function setupInventoryListeners() {
    // Add product button
    document.getElementById('addProductButton').addEventListener('click', () => {
        document.getElementById('productModalTitle').textContent = 'Add Product';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        Utils.showModal('productModal');
    });
    
    // Close product modal
    document.getElementById('closeProductModal').addEventListener('click', () => Utils.hideModal('productModal'));
    document.getElementById('cancelProduct').addEventListener('click', () => Utils.hideModal('productModal'));
    
    // Save product
    document.getElementById('saveProduct').addEventListener('click', saveProduct);
    
    // Unit type change
    document.getElementById('unitType').addEventListener('change', handleUnitTypeChange);
    
    // Ngunia/Kg calculation
    document.getElementById('nguniaCount').addEventListener('input', calculateNguniaKg);
    document.getElementById('totalKg').addEventListener('input', calculateKgNgunia);
    document.getElementById('kgPerNgunia').addEventListener('input', updateConversion);
    document.getElementById('packetCount').addEventListener('input', calculatePacketItems);
    document.getElementById('singleItemCount').addEventListener('input', calculateItemsPacket);
    
    // Stock adjustment
    document.getElementById('stockAdjustButton').addEventListener('click', () => Utils.showModal('stockAdjustModal'));
    document.getElementById('closeStockModal').addEventListener('click', () => Utils.hideModal('stockAdjustModal'));
    document.getElementById('cancelAdjust').addEventListener('click', () => Utils.hideModal('stockAdjustModal'));
    document.getElementById('saveAdjust').addEventListener('click', saveStockAdjustment);
    
    // Adjust product select - show unit info
    document.getElementById('adjustProduct').addEventListener('change', updateAdjustUnitLabel);
    
    // Category modal
    document.getElementById('addCategoryButton').addEventListener('click', () => Utils.showModal('categoryModal'));
    document.getElementById('closeCategoryModal').addEventListener('click', () => Utils.hideModal('categoryModal'));
    document.getElementById('cancelCategory').addEventListener('click', () => Utils.hideModal('categoryModal'));
    document.getElementById('saveCategory').addEventListener('click', saveCategory);
    document.getElementById('addNewCategoryBtn').addEventListener('click', () => {
        Utils.hideModal('productModal');
        Utils.showModal('categoryModal');
    });
    
    // Search & filters
    document.getElementById('inventorySearch').addEventListener('input', Utils.debounce(filterInventory, 300));
    document.getElementById('inventoryCategoryFilter').addEventListener('change', filterInventory);
    document.getElementById('inventoryStatusFilter').addEventListener('change', filterInventory);
}

// ============ PRODUCT CRUD ============

async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value.trim();
    const unitType = document.getElementById('unitType').value;
    const buyingPrice = parseFloat(document.getElementById('buyingPrice').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value) || 0;
    const lowStockThreshold = parseInt(document.getElementById('lowStockThreshold').value) || 10;
    const expiryDate = document.getElementById('expiryDate').value;
    
    if (!name || !category || !unitType) {
        Utils.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    let productData = {
        name,
        category,
        description,
        unitType,
        buyingPrice,
        sellingPrice,
        lowStockThreshold,
        expiryDate: expiryDate || null
    };
    
    // Handle unit-specific data
    if (unitType === 'ngunia-kg') {
        const kgPerNgunia = parseFloat(document.getElementById('kgPerNgunia').value) || 0;
        const totalKg = parseFloat(document.getElementById('totalKg').value) || 0;
        
        productData.conversionRate = kgPerNgunia;
        productData.stockInBaseUnit = totalKg;
        productData.unitName = 'kg';
        
    } else if (unitType === 'packet-items') {
        const itemsPerPacket = parseInt(document.getElementById('itemsPerPacket').value) || 1;
        const singleItems = parseInt(document.getElementById('singleItemCount').value) || 0;
        
        productData.conversionRate = itemsPerPacket;
        productData.stockInBaseUnit = singleItems;
        productData.unitName = 'items';
        
    } else {
        const simpleUnit = document.getElementById('simpleUnitName').value;
        productData.unitName = simpleUnit;
        productData.stockInBaseUnit = 0;
        productData.conversionRate = null;
    }
    
    let result;
    if (productId) {
        result = await DataService.updateProduct(productId, productData);
    } else {
        result = await DataService.addProduct(productData);
    }
    
    if (result.success) {
        Utils.hideModal('productModal');
        Utils.showToast(productId ? 'Product updated!' : 'Product added!', 'success');
        await loadInventoryData();
    } else {
        Utils.showToast(result.message, 'error');
    }
}

async function editProduct(productId) {
    const product = window.inventoryProducts.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = productId;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('unitType').value = product.unitType || 'simple';
    document.getElementById('buyingPrice').value = product.buyingPrice || 0;
    document.getElementById('sellingPrice').value = product.sellingPrice || 0;
    document.getElementById('lowStockThreshold').value = product.lowStockThreshold || 10;
    document.getElementById('expiryDate').value = product.expiryDate || '';
    
    // Trigger unit type change
    handleUnitTypeChange();
    
    // Fill unit-specific data
    if (product.unitType === 'ngunia-kg') {
        document.getElementById('kgPerNgunia').value = product.conversionRate || 0;
        document.getElementById('totalKg').value = product.stockInBaseUnit || 0;
        document.getElementById('nguniaCount').value = (product.stockInBaseUnit / (product.conversionRate || 1)).toFixed(2);
    } else if (product.unitType === 'packet-items') {
        document.getElementById('itemsPerPacket').value = product.conversionRate || 1;
        document.getElementById('singleItemCount').value = product.stockInBaseUnit || 0;
        document.getElementById('packetCount').value = Math.floor((product.stockInBaseUnit || 0) / (product.conversionRate || 1));
    }
    
    Utils.showModal('productModal');
}

async function deleteProductConfirm(productId) {
    const confirmed = await Utils.confirmAction('Are you sure you want to delete this product?');
    if (confirmed) {
        const result = await DataService.deleteProduct(productId);
        if (result.success) {
            Utils.showToast('Product deleted!', 'success');
            await loadInventoryData();
        } else {
            Utils.showToast(result.message, 'error');
        }
    }
}

// ============ UNIT HANDLING ============

function handleUnitTypeChange() {
    const unitType = document.getElementById('unitType').value;
    
    document.getElementById('simpleUnitSection').style.display = 'none';
    document.getElementById('nguniaKgSection').style.display = 'none';
    document.getElementById('packetItemsSection').style.display = 'none';
    
    if (unitType === 'simple') {
        document.getElementById('simpleUnitSection').style.display = 'block';
    } else if (unitType === 'ngunia-kg') {
        document.getElementById('nguniaKgSection').style.display = 'block';
    } else if (unitType === 'packet-items') {
        document.getElementById('packetItemsSection').style.display = 'block';
    }
}

function calculateNguniaKg() {
    const ngunias = parseFloat(document.getElementById('nguniaCount').value) || 0;
    const kgPerNgunia = parseFloat(document.getElementById('kgPerNgunia').value) || 0;
    if (kgPerNgunia > 0) {
        document.getElementById('totalKg').value = (ngunias * kgPerNgunia).toFixed(2);
    }
}

function calculateKgNgunia() {
    const totalKg = parseFloat(document.getElementById('totalKg').value) || 0;
    const kgPerNgunia = parseFloat(document.getElementById('kgPerNgunia').value) || 0;
    if (kgPerNgunia > 0) {
        document.getElementById('nguniaCount').value = (totalKg / kgPerNgunia).toFixed(2);
    }
}

function updateConversion() {
    const totalKg = parseFloat(document.getElementById('totalKg').value) || 0;
    const ngunias = parseFloat(document.getElementById('nguniaCount').value) || 0;
    const kgPerNgunia = parseFloat(document.getElementById('kgPerNgunia').value) || 0;
    
    if (totalKg > 0 && kgPerNgunia > 0) {
        document.getElementById('nguniaCount').value = (totalKg / kgPerNgunia).toFixed(2);
    } else if (ngunias > 0 && kgPerNgunia > 0) {
        document.getElementById('totalKg').value = (ngunias * kgPerNgunia).toFixed(2);
    }
    
    // Show preview
    const preview = document.getElementById('conversionPreview');
    const text = document.getElementById('conversionText');
    if (kgPerNgunia > 0) {
        preview.style.display = 'block';
        text.textContent = `1 ngunia = ${kgPerNgunia} kg | ${ngunias} ngunias = ${totalKg} kg`;
    }
}

function calculatePacketItems() {
    const packets = parseFloat(document.getElementById('packetCount').value) || 0;
    const itemsPerPacket = parseInt(document.getElementById('itemsPerPacket').value) || 1;
    document.getElementById('singleItemCount').value = Math.round(packets * itemsPerPacket);
}

function calculateItemsPacket() {
    const items = parseInt(document.getElementById('singleItemCount').value) || 0;
    const itemsPerPacket = parseInt(document.getElementById('itemsPerPacket').value) || 1;
    document.getElementById('packetCount').value = (items / itemsPerPacket).toFixed(2);
}

// ============ STOCK ADJUSTMENT ============

function updateAdjustUnitLabel() {
    const productId = document.getElementById('adjustProduct').value;
    const product = window.inventoryProducts.find(p => p.id === productId);
    const label = document.getElementById('adjustUnitLabel');
    
    if (product) {
        label.textContent = `Current stock: ${Utils.calculateStockDisplay(product)}`;
    } else {
        label.textContent = '';
    }
}

async function saveStockAdjustment() {
    const productId = document.getElementById('adjustProduct').value;
    const type = document.getElementById('adjustType').value;
    const quantity = parseFloat(document.getElementById('adjustQuantity').value);
    const reason = document.getElementById('adjustReason').value;
    
    if (!productId || !type || !quantity || !reason) {
        Utils.showToast('Please fill in all fields', 'error');
        return;
    }
    
    const result = await DataService.updateStock(productId, quantity, type === 'add' ? 'add' : 'remove');
    
    if (result.success) {
        Utils.hideModal('stockAdjustModal');
        Utils.showToast('Stock adjusted successfully!', 'success');
        await loadInventoryData();
    } else {
        Utils.showToast(result.message, 'error');
    }
}

// ============ CATEGORY ============

async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        Utils.showToast('Category name is required', 'error');
        return;
    }
    
    const result = await DataService.addCategory(name);
    if (result.success) {
        Utils.hideModal('categoryModal');
        Utils.showToast('Category added!', 'success');
        await loadInventoryData();
    } else {
        Utils.showToast(result.message, 'error');
    }
}

// ============ FILTERS ============

function filterInventory() {
    const search = document.getElementById('inventorySearch').value.toLowerCase();
    const category = document.getElementById('inventoryCategoryFilter').value;
    const status = document.getElementById('inventoryStatusFilter').value;
    
    let filtered = window.inventoryProducts;
    
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            (p.category && p.category.toLowerCase().includes(search))
        );
    }
    
    if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
    }
    
    if (status === 'low-stock') {
        filtered = filtered.filter(p => p.stockInBaseUnit <= (p.lowStockThreshold || 10) && p.stockInBaseUnit > 0);
    } else if (status === 'out-of-stock') {
        filtered = filtered.filter(p => p.stockInBaseUnit <= 0);
    } else if (status === 'dead-stock') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 60);
        filtered = filtered.filter(p => {
            if (!p.lastSoldDate) return true;
            return p.lastSoldDate.toDate() < cutoff && p.stockInBaseUnit > 0;
        });
    }
    
    displayInventoryProducts(filtered);
}
