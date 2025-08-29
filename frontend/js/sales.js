// Sales page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize sales page
    initializeSales();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadProducts();
    await loadSales();
});

// Global variables
let cart = [];
let allProducts = [];
let currentSaleId = null;

function initializeSales() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userRole').textContent = user.role;
    }
    
    // Initialize sale info
    document.getElementById('saleNumber').textContent = generateSaleNumber();
    document.getElementById('saleDate').textContent = new Date().toLocaleDateString();
}

function setupEventListeners() {
    // Product search
    document.getElementById('productSearch').addEventListener('input', handleProductSearch);
    
    // Payment method change
    document.getElementById('paymentMethod').addEventListener('change', handlePaymentMethodChange);
    
    // Amount received input
    document.getElementById('amountReceived').addEventListener('input', calculateChange);
    
    // Process sale button
    document.getElementById('processSaleBtn').addEventListener('click', processSale);
    
    // Clear cart button
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    
    // New sale button
    document.getElementById('newSaleBtn').addEventListener('click', startNewSale);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Sales table actions
    document.addEventListener('click', handleTableActions);
}

async function loadProducts() {
    try {
        const response = await apiRequest('/products?status=active', 'GET');
        
        if (response.success) {
            allProducts = response.data;
            renderProductGrid(allProducts);
        } else {
            showToast('Failed to load products', 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products', 'error');
    }
}

function renderProductGrid(products) {
    const productGrid = document.getElementById('productGrid');
    
    if (!products || products.length === 0) {
        productGrid.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <i class="fas fa-box-open fa-3x mb-3 d-block"></i>
                No products available
            </div>
        `;
        return;
    }
    
    productGrid.innerHTML = products.map(product => `
        <div class="col-md-4 col-lg-3 mb-3">
            <div class="card product-card h-100" onclick="addToCart(${product.id})" style="cursor: pointer;">
                <div class="card-body text-center">
                    <div class="product-image mb-2">
                        ${product.image_url 
                            ? `<img src="${product.image_url}" alt="${product.name}" class="img-fluid rounded">`
                            : `<div class="placeholder-image"><i class="fas fa-box fa-2x"></i></div>`
                        }
                    </div>
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text">
                        <strong class="text-primary">₱${formatNumber(product.price)}</strong>
                        <br>
                        <small class="text-muted">Stock: ${product.stock_quantity}</small>
                    </p>
                    ${product.stock_quantity === 0 
                        ? '<span class="badge bg-danger">Out of Stock</span>'
                        : product.stock_quantity <= 5 
                        ? '<span class="badge bg-warning">Low Stock</span>'
                        : ''
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm))
    );
    
    renderProductGrid(filteredProducts);
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    if (product.stock_quantity === 0) {
        showToast('Product is out of stock', 'error');
        return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
            showToast('Cannot add more items than available stock', 'warning');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock_quantity
        });
    }
    
    renderCart();
    showToast(`${product.name} added to cart`, 'success');
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        updateCartTotals();
        return;
    }
    
    cartItems.style.display = 'block';
    cartEmpty.style.display = 'none';
    
    const tbody = cartItems.querySelector('tbody');
    tbody.innerHTML = cart.map((item, index) => `
        <tr>
            <td>
                <strong>${item.name}</strong>
                <br><small class="text-muted">₱${formatNumber(item.price)} each</small>
            </td>
            <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, ${item.quantity - 1})">-</button>
                    <input type="number" class="form-control text-center" value="${item.quantity}" min="1" max="${item.stock}" onchange="updateQuantity(${index}, this.value)">
                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
                </div>
            </td>
            <td class="text-end">
                <strong>₱${formatNumber(item.price * item.quantity)}</strong>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updateCartTotals();
}

function updateQuantity(index, newQuantity) {
    newQuantity = parseInt(newQuantity);
    
    if (isNaN(newQuantity) || newQuantity < 1) {
        newQuantity = 1;
    }
    
    const item = cart[index];
    if (newQuantity > item.stock) {
        showToast('Cannot exceed available stock', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
}

function removeFromCart(index) {
    const item = cart[index];
    cart.splice(index, 1);
    renderCart();
    showToast(`${item.name} removed from cart`, 'success');
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        renderCart();
        showToast('Cart cleared', 'success');
    }
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = `₱${formatNumber(subtotal)}`;
    document.getElementById('tax').textContent = `₱${formatNumber(tax)}`;
    document.getElementById('total').textContent = `₱${formatNumber(total)}`;
    
    // Update amount received if cash payment
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod === 'cash') {
        document.getElementById('amountReceived').min = total.toFixed(2);
    }
}

function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const cashPaymentDiv = document.getElementById('cashPayment');
    
    if (paymentMethod === 'cash') {
        cashPaymentDiv.style.display = 'block';
        const total = parseFloat(document.getElementById('total').textContent.replace('₱', '').replace(/,/g, ''));
        document.getElementById('amountReceived').min = total.toFixed(2);
        calculateChange();
    } else {
        cashPaymentDiv.style.display = 'none';
    }
}

function calculateChange() {
    const total = parseFloat(document.getElementById('total').textContent.replace('₱', '').replace(/,/g, ''));
    const amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = Math.max(0, amountReceived - total);
    
    document.getElementById('change').textContent = `₱${formatNumber(change)}`;
    
    // Enable/disable process sale button
    const processSaleBtn = document.getElementById('processSaleBtn');
    if (cart.length === 0) {
        processSaleBtn.disabled = true;
    } else if (document.getElementById('paymentMethod').value === 'cash') {
        processSaleBtn.disabled = amountReceived < total;
    } else {
        processSaleBtn.disabled = false;
    }
}

async function processSale() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('₱', '').replace(/,/g, ''));
    const tax = parseFloat(document.getElementById('tax').textContent.replace('₱', '').replace(/,/g, ''));
    const total = parseFloat(document.getElementById('total').textContent.replace('₱', '').replace(/,/g, ''));
    
    let amountReceived = total;
    if (paymentMethod === 'cash') {
        amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
        if (amountReceived < total) {
            showToast('Amount received is insufficient', 'error');
            return;
        }
    }
    
    const saleData = {
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price
        })),
        payment_method: paymentMethod,
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total,
        amount_received: amountReceived,
        change_amount: Math.max(0, amountReceived - total)
    };
    
    try {
        // Show loading
        const processSaleBtn = document.getElementById('processSaleBtn');
        const originalText = processSaleBtn.innerHTML;
        processSaleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        processSaleBtn.disabled = true;
        
        const response = await apiRequest('/sales', 'POST', saleData);
        
        if (response.success) {
            showToast('Sale processed successfully!', 'success');
            
            // Show receipt modal
            showReceiptModal(response.data);
            
            // Clear cart and start new sale
            startNewSale();
            
            // Reload sales list
            await loadSales();
            
        } else {
            showToast(response.error || 'Failed to process sale', 'error');
        }
    } catch (error) {
        console.error('Error processing sale:', error);
        showToast('Error processing sale', 'error');
    } finally {
        // Reset button
        const processSaleBtn = document.getElementById('processSaleBtn');
        processSaleBtn.innerHTML = 'Process Sale';
        processSaleBtn.disabled = false;
    }
}

function showReceiptModal(saleData) {
    const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
    
    // Populate receipt data
    document.getElementById('receiptNumber').textContent = `#${saleData.id.toString().padStart(6, '0')}`;
    document.getElementById('receiptDate').textContent = new Date().toLocaleString();
    
    const receiptItems = document.getElementById('receiptItems');
    receiptItems.innerHTML = saleData.items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end">₱${formatNumber(item.unit_price)}</td>
            <td class="text-end">₱${formatNumber(item.quantity * item.unit_price)}</td>
        </tr>
    `).join('');
    
    document.getElementById('receiptSubtotal').textContent = `₱${formatNumber(saleData.subtotal)}`;
    document.getElementById('receiptTax').textContent = `₱${formatNumber(saleData.tax_amount)}`;
    document.getElementById('receiptTotal').textContent = `₱${formatNumber(saleData.total_amount)}`;
    document.getElementById('receiptPaymentMethod').textContent = capitalizeFirst(saleData.payment_method);
    
    if (saleData.payment_method === 'cash') {
        document.getElementById('receiptCashDetails').style.display = 'block';
        document.getElementById('receiptAmountReceived').textContent = `₱${formatNumber(saleData.amount_received)}`;
        document.getElementById('receiptChange').textContent = `₱${formatNumber(saleData.change_amount)}`;
    } else {
        document.getElementById('receiptCashDetails').style.display = 'none';
    }
    
    modal.show();
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptContent');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: monospace; font-size: 12px; }
                    .text-center { text-align: center; }
                    .text-end { text-align: right; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 2px 4px; }
                    .border-top { border-top: 1px solid #000; }
                    .border-bottom { border-bottom: 1px solid #000; }
                </style>
            </head>
            <body>
                ${receiptContent.innerHTML}
            </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

function startNewSale() {
    cart = [];
    currentSaleId = null;
    renderCart();
    document.getElementById('saleNumber').textContent = generateSaleNumber();
    document.getElementById('saleDate').textContent = new Date().toLocaleDateString();
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('amountReceived').value = '';
    document.getElementById('change').textContent = '₱0.00';
    handlePaymentMethodChange();
}

async function loadSales() {
    try {
        const response = await apiRequest('/sales?limit=10', 'GET');
        
        if (response.success) {
            renderSalesTable(response.data);
        } else {
            showToast('Failed to load sales', 'error');
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        showToast('Error loading sales', 'error');
    }
}

function renderSalesTable(sales) {
    const tbody = document.getElementById('salesTableBody');
    
    if (!sales || sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    No recent sales
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sales.map(sale => `
        <tr>
            <td>#${sale.id.toString().padStart(6, '0')}</td>
            <td>${formatDateTime(sale.created_at)}</td>
            <td>₱${formatNumber(sale.total_amount)}</td>
            <td><span class="badge bg-info">${capitalizeFirst(sale.payment_method)}</span></td>
            <td><span class="badge bg-success">${capitalizeFirst(sale.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewSaleDetails(${sale.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="reprintReceipt(${sale.id})">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewSaleDetails(saleId) {
    // Implement sale details view if needed
    showToast('Sale details coming soon!', 'info');
}

async function reprintReceipt(saleId) {
    try {
        const response = await apiRequest(`/sales/${saleId}`, 'GET');
        
        if (response.success) {
            showReceiptModal(response.data);
        } else {
            showToast('Failed to load sale details', 'error');
        }
    } catch (error) {
        console.error('Error loading sale details:', error);
        showToast('Error loading sale details', 'error');
    }
}

function handleTableActions(e) {
    // Handle any table action clicks here
}

// Utility functions
function generateSaleNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `SAL${timestamp}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
