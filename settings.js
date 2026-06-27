// ============================================
// AMISTY POS - SETTINGS PAGE
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page - manager only
    if (!Auth.protectPage(['manager'])) return;
    
    // Initialize
    Auth.init();
    Navigation.init();
    Animations.init();
    SoundManager.init();
    
    // Initialize tabs
    Navigation.initTabs();
    
    // Load settings
    await loadAllSettings();
    
    // Setup listeners
    setupSettingsListeners();
});

async function loadAllSettings() {
    const settings = await DataService.getSettings();
    
    // Shop profile
    document.getElementById('shopName').value = settings.shopName || '';
    document.getElementById('shopAddress').value = settings.address || '';
    document.getElementById('shopPhone').value = settings.phone || '';
    document.getElementById('shopCurrency').value = settings.currency || 'KES';
    
    // Logo
    if (settings.logoUrl) {
        document.getElementById('logoImage').src = settings.logoUrl;
        document.getElementById('removeLogoBtn').style.display = 'inline-block';
    }
    
    // Receipt settings
    document.getElementById('receiptPrefix').value = settings.receiptPrefix || 'AMI-';
    document.getElementById('receiptFooter').value = settings.receiptFooter || 'Asante kwa kununua kwetu! Karibu tena!';
    document.getElementById('showLogoOnReceipt').checked = settings.showLogoOnReceipt !== false;
    document.getElementById('showShopInfoOnReceipt').checked = settings.showShopInfoOnReceipt !== false;
    
    // POS settings
    document.getElementById('soundEnabled').checked = settings.soundEnabled !== false;
    document.getElementById('lowStockSoundEnabled').checked = settings.lowStockSoundEnabled !== false;
    
    // Load quick sale product selector
    await loadQuickSaleSelector(settings.quickSaleProductIds || []);
    
    // Load users
    await loadUsers();
    
    // Update receipt preview
    updateReceiptPreview(settings);
}

function setupSettingsListeners() {
    // Shop profile form
    document.getElementById('shopProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            shopName: document.getElementById('shopName').value,
            address: document.getElementById('shopAddress').value,
            phone: document.getElementById('shopPhone').value,
            currency: document.getElementById('shopCurrency').value
        };
        const result = await DataService.updateSettings(data);
        if (result.success) {
            Utils.showToast('Shop profile saved!', 'success');
            updateReceiptPreview(data);
        }
    });
    
    // Receipt settings form
    document.getElementById('receiptSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            receiptPrefix: document.getElementById('receiptPrefix').value,
            receiptFooter: document.getElementById('receiptFooter').value,
            showLogoOnReceipt: document.getElementById('showLogoOnReceipt').checked,
            showShopInfoOnReceipt: document.getElementById('showShopInfoOnReceipt').checked
        };
        await DataService.updateSettings(data);
        Utils.showToast('Receipt settings saved!', 'success');
        const settings = await DataService.getSettings();
        updateReceiptPreview(settings);
    });
    
    // POS settings form
    document.getElementById('posSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const quickSaleIds = [];
        document.querySelectorAll('.quick-sale-checkbox:checked').forEach(cb => {
            quickSaleIds.push(cb.value);
        });
        
        const data = {
            quickSaleProductIds: quickSaleIds,
            soundEnabled: document.getElementById('soundEnabled').checked,
            lowStockSoundEnabled: document.getElementById('lowStockSoundEnabled').checked
        };
        
        await DataService.updateSettings(data);
        SoundManager.enabled = data.soundEnabled;
        Utils.showToast('POS settings saved!', 'success');
    });
    
    // Logo upload
    document.getElementById('uploadLogoBtn').addEventListener('click', () => {
        document.getElementById('logoInput').click();
    });
    
    document.getElementById('logoInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                Utils.showToast('Image too large. Max 2MB.', 'error');
                return;
            }
            
            const result = await DataService.uploadLogo(file);
            if (result.success) {
                document.getElementById('logoImage').src = result.url;
                document.getElementById('removeLogoBtn').style.display = 'inline-block';
                Utils.showToast('Logo uploaded!', 'success');
                const settings = await DataService.getSettings();
                updateReceiptPreview(settings);
            } else {
                Utils.showToast(result.message, 'error');
            }
        }
    });
    
    // Remove logo
    document.getElementById('removeLogoBtn').addEventListener('click', async () => {
        const confirmed = await Utils.confirmAction('Remove shop logo?');
        if (confirmed) {
            await DataService.deleteLogo();
            document.getElementById('logoImage').src = 'assets/placeholder-logo.png';
            document.getElementById('removeLogoBtn').style.display = 'none';
            Utils.showToast('Logo removed!', 'success');
            const settings = await DataService.getSettings();
            updateReceiptPreview(settings);
        }
    });
    
    // Add user
    document.getElementById('addUserButton').addEventListener('click', () => Utils.showModal('userModal'));
    document.getElementById('closeUserModal').addEventListener('click', () => Utils.hideModal('userModal'));
    document.getElementById('cancelAddUser').addEventListener('click', () => Utils.hideModal('userModal'));
    document.getElementById('saveNewUser').addEventListener('click', addUser);
    
    // Data management
    document.getElementById('exportAllData').addEventListener('click', exportAllData);
    document.getElementById('importDataButton').addEventListener('click', () => {
        document.getElementById('importDataFile').click();
    });
    document.getElementById('importDataFile').addEventListener('change', importData);
    document.getElementById('clearOldTransactions').addEventListener('click', clearOldTransactions);
    document.getElementById('resetShop').addEventListener('click', resetShop);
}

async function loadQuickSaleSelector(selectedIds) {
    const container = document.getElementById('quickSaleSelector');
    const products = await DataService.getProducts();
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-muted">No products available. Add products first.</p>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <label class="quick-sale-option">
            <input type="checkbox" class="quick-sale-checkbox" value="${p.id}" ${selectedIds.includes(p.id) ? 'checked' : ''}>
            <span>${p.name} - ${Utils.formatCurrency(p.sellingPrice, 'KES')}</span>
        </label>
    `).join('');
    
    // Limit to 5 selections
    container.querySelectorAll('.quick-sale-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = container.querySelectorAll('.quick-sale-checkbox:checked');
            if (checked.length > 5) {
                cb.checked = false;
                Utils.showToast('Maximum 5 quick sale items', 'warning');
            }
        });
    });
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    const users = await DataService.getUsers();
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.name || 'N/A'}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.role === 'manager' ? 'badge-warning' : 'badge-info'}">${u.role}</span></td>
            <td>${u.createdAt ? Utils.formatDate(u.createdAt.toDate()) : 'N/A'}</td>
            <td>${u.lastLogin ? Utils.formatDateTime(u.lastLogin.toDate()) : 'Never'}</td>
            <td>
                ${u.role !== 'manager' ? `<button class="btn btn-outline btn-sm btn-danger" onclick="deleteUser('${u.id}')">🗑️</button>` : '<span class="text-muted">Admin</span>'}
            </td>
        </tr>
    `).join('');
}

async function addUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    
    if (!name || !email || !password) {
        Utils.showToast('All fields are required', 'error');
        return;
    }
    
    if (password.length < 6) {
        Utils.showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const result = await Auth.addSeller(name, email, password);
    if (result.success) {
        Utils.hideModal('userModal');
        document.getElementById('addUserForm').reset();
        Utils.showToast('Seller account created!', 'success');
        await loadUsers();
    } else {
        Utils.showToast(result.message, 'error');
    }
}

async function deleteUser(uid) {
    const confirmed = await Utils.confirmAction('Delete this user?');
    if (confirmed) {
        await Auth.deleteUser(uid);
        Utils.showToast('User deleted!', 'success');
        await loadUsers();
    }
}

function updateReceiptPreview(settings) {
    document.getElementById('previewShopName').textContent = settings.shopName || 'My Shop';
    document.getElementById('previewFooter').textContent = settings.receiptFooter || '';
    
    if (settings.logoUrl) {
        document.querySelector('#previewLogo img').src = settings.logoUrl;
    }
}

async function exportAllData() {
    try {
        const products = await DataService.getProducts();
        const transactions = await DataService.getTransactions({}, 1, 1000);
        const categories = await DataService.getCategories();
        const settings = await DataService.getSettings();
        const users = await DataService.getUsers();
        
        const allData = { products, transactions, categories, settings, users, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amisty_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.showToast('Data exported successfully!', 'success');
    } catch (error) {
        Utils.showToast('Error exporting data', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Utils.showToast(`Backup from ${data.exportDate || 'unknown date'}. Import feature requires manual restore.`, 'info');
        } catch (error) {
            Utils.showToast('Invalid backup file', 'error');
        }
    };
    reader.readAsText(file);
}

async function clearOldTransactions() {
    const confirmed = await Utils.confirmAction('Delete all transactions older than 1 year? This cannot be undone!');
    if (confirmed) {
        Utils.showToast('Old transactions cleared! (Feature requires additional implementation)', 'success');
    }
}

async function resetShop() {
    const confirmed = await Utils.confirmAction('⚠️ This will delete ALL data. Are you ABSOLUTELY sure? This cannot be undone!');
    if (confirmed) {
        const doubleConfirm = await Utils.confirmAction('FINAL WARNING: All products, transactions, and settings will be permanently deleted. Continue?');
        if (doubleConfirm) {
            Utils.showToast('Shop reset feature requires additional implementation for safety.', 'warning');
        }
    }
}
