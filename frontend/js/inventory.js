// Inventory page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize inventory page
    initializeInventory();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadProducts();
});

function initializeInventory() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userRole').textContent = user.role;
    }
}

function setupEventListeners() {
    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openProductModal();
    });
    
    // Product form submission
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Filter functionality
    document.getElementById('categoryFilter').addEventListener('change', handleCategoryFilter);
    document.getElementById('stockFilter').addEventListener('change', handleStockFilter);
    
    // Bulk actions
    document.getElementById('selectAllCheckbox').addEventListener('change', handleSelectAll);
    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function loadProducts() {
    try {
        showTableLoading();
        
        const response = await apiRequest('/products', 'GET');
        
        if (response.success) {
            renderProductsTable(response.data);
            updateInventoryStats(response.data);
        } else {
            showToast('Failed to load products', 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products', 'error');
    } finally {
        hideTableLoading();
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-box-open fa-3x mb-3 d-block"></i>
                    No products found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <input type="checkbox" class="form-check-input product-checkbox" value="${product.id}">
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="product-image me-2">
                        ${product.image_url 
                            ? `<img src="${product.image_url}" alt="${product.name}" class="rounded">`
                            : `<div class="placeholder-image"><i class="fas fa-image"></i></div>`
                        }
                    </div>
                    <div>
                        <strong>${product.name}</strong>
                        <br><small class="text-muted">SKU: ${product.sku || 'N/A'}</small>
                    </div>
                </div>
            </td>
            <td>${product.category}</td>
            <td>₱${formatNumber(product.price)}</td>
            <td>
                <span class="badge bg-${getStockBadgeColor(product.stock_quantity)}">
                    ${product.stock_quantity}
                </span>
            </td>
            <td>
                <span class="badge bg-${product.status === 'active' ? 'success' : 'secondary'}">
                    ${capitalizeFirst(product.status)}
                </span>
            </td>
            <td>${formatDate(product.updated_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editProduct(${product.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewProduct(${product.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProduct(${product.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update checkbox event listeners
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActions);
    });
}

function updateInventoryStats(products) {
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.stock_quantity <= 10).length;
    const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
    
    document.getElementById('totalProducts').textContent = formatNumber(totalProducts);
    document.getElementById('lowStockCount').textContent = formatNumber(lowStockCount);
    document.getElementById('outOfStockCount').textContent = formatNumber(outOfStockCount);
    document.getElementById('totalValue').textContent = `₱${formatNumber(totalValue)}`;
}

function openProductModal(product = null) {
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    if (product) {
        // Edit mode
        title.textContent = 'Edit Product';
        form.elements.productId.value = product.id;
        form.elements.productName.value = product.name;
        form.elements.productSku.value = product.sku || '';
        form.elements.productCategory.value = product.category;
        form.elements.productPrice.value = product.price;
        form.elements.productStock.value = product.stock_quantity;
        form.elements.productDescription.value = product.description || '';
        form.elements.productStatus.value = product.status;
    } else {
        // Add mode
        title.textContent = 'Add New Product';
        form.reset();
        form.elements.productId.value = '';
        form.elements.productStatus.value = 'active';
    }
    
    modal.show();
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const productId = formData.get('productId');
    
    const productData = {
        name: formData.get('productName'),
        sku: formData.get('productSku'),
        category: formData.get('productCategory'),
        price: parseFloat(formData.get('productPrice')),
        stock_quantity: parseInt(formData.get('productStock')),
        description: formData.get('productDescription'),
        status: formData.get('productStatus')
    };
    
    // Validate required fields
    if (!productData.name || !productData.category || !productData.price || productData.stock_quantity === null) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        let response;
        if (productId) {
            // Update existing product
            response = await apiRequest(`/products/${productId}`, 'PUT', productData);
        } else {
            // Create new product
            response = await apiRequest('/products', 'POST', productData);
        }
        
        if (response.success) {
            showToast(productId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            await loadProducts();
        } else {
            showToast(response.error || 'Failed to save product', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product', 'error');
    } finally {
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = submitBtn.dataset.originalText || 'Save Product';
        submitBtn.disabled = false;
    }
}

async function editProduct(productId) {
    try {
        const response = await apiRequest(`/products/${productId}`, 'GET');
        
        if (response.success) {
            openProductModal(response.data);
        } else {
            showToast('Failed to load product details', 'error');
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product details', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/products/${productId}`, 'DELETE');
        
        if (response.success) {
            showToast('Product deleted successfully!', 'success');
            await loadProducts();
        } else {
            showToast(response.error || 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}

function viewProduct(productId) {
    // Implement product view modal if needed
    showToast('Product view coming soon!', 'info');
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const productName = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase();
        const category = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase();
        const sku = row.querySelector('small')?.textContent.toLowerCase();
        
        const isVisible = productName?.includes(searchTerm) || 
                         category?.includes(searchTerm) || 
                         sku?.includes(searchTerm);
        
        row.style.display = isVisible ? '' : 'none';
    });
}

function handleCategoryFilter(e) {
    const selectedCategory = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        if (selectedCategory === '') {
            row.style.display = '';
        } else {
            const category = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase();
            row.style.display = category === selectedCategory ? '' : 'none';
        }
    });
}

function handleStockFilter(e) {
    const stockFilter = e.target.value;
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const stockBadge = row.querySelector('td:nth-child(5) .badge');
        if (!stockBadge) return;
        
        const stockQuantity = parseInt(stockBadge.textContent);
        let isVisible = true;
        
        switch (stockFilter) {
            case 'low':
                isVisible = stockQuantity <= 10 && stockQuantity > 0;
                break;
            case 'out':
                isVisible = stockQuantity === 0;
                break;
            case 'good':
                isVisible = stockQuantity > 10;
                break;
            default:
                isVisible = true;
        }
        
        row.style.display = isVisible ? '' : 'none';
    });
}

function handleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    updateBulkActions();
}

function updateBulkActions() {
    const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
    const bulkActionsDiv = document.getElementById('bulkActions');
    
    if (checkedBoxes.length > 0) {
        bulkActionsDiv.style.display = 'block';
        document.getElementById('selectedCount').textContent = checkedBoxes.length;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

async function handleBulkDelete() {
    const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
    const productIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (productIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${productIds.length} product(s)?`)) {
        return;
    }
    
    try {
        const response = await apiRequest('/products/bulk-delete', 'DELETE', { productIds });
        
        if (response.success) {
            showToast(`${productIds.length} product(s) deleted successfully!`, 'success');
            await loadProducts();
        } else {
            showToast(response.error || 'Failed to delete products', 'error');
        }
    } catch (error) {
        console.error('Error deleting products:', error);
        showToast('Error deleting products', 'error');
    }
}

// Utility functions
function getStockBadgeColor(quantity) {
    if (quantity === 0) return 'danger';
    if (quantity <= 5) return 'danger';
    if (quantity <= 10) return 'warning';
    return 'success';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function showTableLoading() {
    document.getElementById('productsTableBody').innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <i class="fas fa-spinner fa-spin fa-2x mb-2 d-block"></i>
                Loading products...
            </td>
        </tr>
    `;
}

function hideTableLoading() {
    // Loading is hidden when table is populated
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-PH').format(number);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}
