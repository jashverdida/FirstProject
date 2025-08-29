// Dashboard page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize dashboard
    initializeDashboard();
    
    // Set up logout functionality
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Load dashboard data
    await loadDashboardData();
});

function initializeDashboard() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userRole').textContent = user.role;
        
        // Set welcome message based on time of day
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        
        document.getElementById('welcomeMessage').textContent = `${greeting}, ${user.username}!`;
    }
}

async function loadDashboardData() {
    try {
        showLoading();
        
        // Load dashboard stats
        const response = await apiRequest('/dashboard/stats', 'GET');
        
        if (response.success) {
            updateDashboardStats(response.data);
        } else {
            showToast('Failed to load dashboard data', 'error');
        }
        
        // Load recent sales
        await loadRecentSales();
        
        // Load low stock items
        await loadLowStock();
        
        // Load sales chart
        await loadSalesChart();
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Error loading dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

function updateDashboardStats(data) {
    // Update stat cards
    document.getElementById('totalSales').textContent = `₱${formatNumber(data.totalSales || 0)}`;
    document.getElementById('totalOrders').textContent = formatNumber(data.totalOrders || 0);
    document.getElementById('totalProducts').textContent = formatNumber(data.totalProducts || 0);
    document.getElementById('lowStockCount').textContent = formatNumber(data.lowStockCount || 0);
    
    // Update percentage changes (if available)
    updateStatChange('salesChange', data.salesChange);
    updateStatChange('ordersChange', data.ordersChange);
    updateStatChange('productsChange', data.productsChange);
    updateStatChange('stockChange', data.stockChange);
}

function updateStatChange(elementId, change) {
    const element = document.getElementById(elementId);
    if (element && change !== undefined) {
        const isPositive = change >= 0;
        element.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(change).toFixed(1)}%
        `;
        element.className = `small ${isPositive ? 'text-success' : 'text-danger'}`;
    }
}

async function loadRecentSales() {
    try {
        const response = await apiRequest('/sales/recent?limit=5', 'GET');
        
        if (response.success) {
            renderRecentSales(response.data);
        }
    } catch (error) {
        console.error('Error loading recent sales:', error);
    }
}

function renderRecentSales(sales) {
    const tbody = document.getElementById('recentSalesTable');
    
    if (!sales || sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent sales</td></tr>';
        return;
    }
    
    tbody.innerHTML = sales.map(sale => `
        <tr>
            <td>${formatDateTime(sale.created_at)}</td>
            <td>₱${formatNumber(sale.total_amount)}</td>
            <td>${sale.payment_method}</td>
            <td>
                <span class="badge bg-${getStatusColor(sale.status)}">${sale.status}</span>
            </td>
        </tr>
    `).join('');
}

async function loadLowStock() {
    try {
        const response = await apiRequest('/products/low-stock?limit=5', 'GET');
        
        if (response.success) {
            renderLowStock(response.data);
        }
    } catch (error) {
        console.error('Error loading low stock:', error);
    }
}

function renderLowStock(products) {
    const tbody = document.getElementById('lowStockTable');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">All products are well stocked</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.stock_quantity}</td>
            <td>
                <span class="badge bg-${getStockLevelColor(product.stock_quantity)}">${getStockLevelText(product.stock_quantity)}</span>
            </td>
        </tr>
    `).join('');
}

async function loadSalesChart() {
    try {
        const response = await apiRequest('/dashboard/sales-chart?days=7', 'GET');
        
        if (response.success && response.data) {
            renderSalesChart(response.data);
        }
    } catch (error) {
        console.error('Error loading sales chart:', error);
    }
}

function renderSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.salesChartInstance) {
        window.salesChartInstance.destroy();
    }
    
    window.salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Daily Sales',
                data: chartData.sales,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Utility functions
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'completed': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

function getStockLevelColor(quantity) {
    if (quantity <= 5) return 'danger';
    if (quantity <= 10) return 'warning';
    return 'success';
}

function getStockLevelText(quantity) {
    if (quantity <= 5) return 'Critical';
    if (quantity <= 10) return 'Low';
    return 'Good';
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-PH').format(number);
}

function showLoading() {
    // Add loading spinners to stat cards
    document.querySelectorAll('.stat-value').forEach(element => {
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
}

function hideLoading() {
    // Loading is handled by updateDashboardStats
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}
