// Reports page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize reports page
    initializeReports();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial reports
    await loadDashboard();
    await loadSalesReport();
});

// Global variables
let salesChart, topProductsChart, categoryChart;

function initializeReports() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userRole').textContent = user.role;
    }
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

function setupEventListeners() {
    // Date range change
    document.getElementById('startDate').addEventListener('change', handleDateRangeChange);
    document.getElementById('endDate').addEventListener('change', handleDateRangeChange);
    
    // Report type change
    document.getElementById('reportType').addEventListener('change', handleReportTypeChange);
    
    // Export buttons
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', refreshReports);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function loadDashboard() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const response = await apiRequest(`/dashboard/stats?start_date=${startDate}&end_date=${endDate}`, 'GET');
        
        if (response.success) {
            updateDashboardCards(response.data);
        } else {
            showToast('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateDashboardCards(data) {
    document.getElementById('totalRevenue').textContent = `₱${formatNumber(data.totalSales || 0)}`;
    document.getElementById('totalOrders').textContent = formatNumber(data.totalOrders || 0);
    document.getElementById('avgOrderValue').textContent = `₱${formatNumber(data.averageOrderValue || 0)}`;
    document.getElementById('topProduct').textContent = data.topProduct || 'N/A';
    
    // Update percentage changes
    updateChangeIndicator('revenueChange', data.revenueChange);
    updateChangeIndicator('ordersChange', data.ordersChange);
    updateChangeIndicator('avgChange', data.avgOrderValueChange);
}

function updateChangeIndicator(elementId, change) {
    const element = document.getElementById(elementId);
    if (element && change !== undefined) {
        const isPositive = change >= 0;
        element.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(change).toFixed(1)}%
        `;
        element.className = `text-${isPositive ? 'success' : 'danger'}`;
    }
}

async function loadSalesReport() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reportType = document.getElementById('reportType').value;
        
        // Load sales chart
        await loadSalesChart(startDate, endDate, reportType);
        
        // Load top products
        await loadTopProducts(startDate, endDate);
        
        // Load category breakdown
        await loadCategoryBreakdown(startDate, endDate);
        
        // Load sales table
        await loadSalesTable(startDate, endDate);
        
    } catch (error) {
        console.error('Error loading sales report:', error);
        showToast('Error loading sales report', 'error');
    }
}

async function loadSalesChart(startDate, endDate, reportType) {
    try {
        const response = await apiRequest(`/reports/sales-chart?start_date=${startDate}&end_date=${endDate}&type=${reportType}`, 'GET');
        
        if (response.success) {
            renderSalesChart(response.data);
        }
    } catch (error) {
        console.error('Error loading sales chart:', error);
    }
}

function renderSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Sales Revenue',
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
                title: {
                    display: true,
                    text: 'Sales Trend'
                },
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

async function loadTopProducts(startDate, endDate) {
    try {
        const response = await apiRequest(`/reports/top-products?start_date=${startDate}&end_date=${endDate}&limit=5`, 'GET');
        
        if (response.success) {
            renderTopProductsChart(response.data);
            renderTopProductsTable(response.data);
        }
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

function renderTopProductsChart(products) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    if (topProductsChart) {
        topProductsChart.destroy();
    }
    
    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.product_name),
            datasets: [{
                label: 'Revenue',
                data: products.map(p => p.total_revenue),
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#6f42c1'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Products by Revenue'
                },
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

function renderTopProductsTable(products) {
    const tbody = document.getElementById('topProductsTable');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.product_name}</td>
            <td>${formatNumber(product.quantity_sold)}</td>
            <td>₱${formatNumber(product.total_revenue)}</td>
        </tr>
    `).join('');
}

async function loadCategoryBreakdown(startDate, endDate) {
    try {
        const response = await apiRequest(`/reports/category-breakdown?start_date=${startDate}&end_date=${endDate}`, 'GET');
        
        if (response.success) {
            renderCategoryChart(response.data);
        }
    } catch (error) {
        console.error('Error loading category breakdown:', error);
    }
}

function renderCategoryChart(categories) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const colors = [
        '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
        '#20c997', '#fd7e14', '#e83e8c', '#6610f2', '#17a2b8'
    ];
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(c => c.category),
            datasets: [{
                data: categories.map(c => c.total_revenue),
                backgroundColor: colors.slice(0, categories.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Sales by Category'
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

async function loadSalesTable(startDate, endDate) {
    try {
        const response = await apiRequest(`/sales?start_date=${startDate}&end_date=${endDate}&limit=50`, 'GET');
        
        if (response.success) {
            renderSalesTable(response.data);
        }
    } catch (error) {
        console.error('Error loading sales table:', error);
    }
}

function renderSalesTable(sales) {
    const tbody = document.getElementById('salesTableBody');
    
    if (!sales || sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No sales data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = sales.map(sale => `
        <tr>
            <td>#${sale.id.toString().padStart(6, '0')}</td>
            <td>${formatDateTime(sale.created_at)}</td>
            <td>₱${formatNumber(sale.total_amount)}</td>
            <td>${capitalizeFirst(sale.payment_method)}</td>
            <td><span class="badge bg-success">${capitalizeFirst(sale.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewSaleDetails(${sale.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleDateRangeChange() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    if (startDate > endDate) {
        showToast('Start date cannot be after end date', 'error');
        return;
    }
    
    await refreshReports();
}

async function handleReportTypeChange() {
    await loadSalesReport();
}

async function refreshReports() {
    try {
        showLoading();
        await loadDashboard();
        await loadSalesReport();
        showToast('Reports refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing reports:', error);
        showToast('Error refreshing reports', 'error');
    } finally {
        hideLoading();
    }
}

function exportToPDF() {
    showToast('PDF export coming soon!', 'info');
}

function exportToExcel() {
    showToast('Excel export coming soon!', 'info');
}

async function viewSaleDetails(saleId) {
    try {
        const response = await apiRequest(`/sales/${saleId}`, 'GET');
        
        if (response.success) {
            showSaleDetailsModal(response.data);
        } else {
            showToast('Failed to load sale details', 'error');
        }
    } catch (error) {
        console.error('Error loading sale details:', error);
        showToast('Error loading sale details', 'error');
    }
}

function showSaleDetailsModal(saleData) {
    const modal = new bootstrap.Modal(document.getElementById('saleDetailsModal'));
    
    // Populate sale details
    document.getElementById('saleDetailsId').textContent = `#${saleData.id.toString().padStart(6, '0')}`;
    document.getElementById('saleDetailsDate').textContent = formatDateTime(saleData.created_at);
    document.getElementById('saleDetailsPayment').textContent = capitalizeFirst(saleData.payment_method);
    document.getElementById('saleDetailsStatus').textContent = capitalizeFirst(saleData.status);
    
    const itemsTable = document.getElementById('saleDetailsItems');
    itemsTable.innerHTML = saleData.items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end">₱${formatNumber(item.unit_price)}</td>
            <td class="text-end">₱${formatNumber(item.quantity * item.unit_price)}</td>
        </tr>
    `).join('');
    
    document.getElementById('saleDetailsSubtotal').textContent = `₱${formatNumber(saleData.subtotal)}`;
    document.getElementById('saleDetailsTax').textContent = `₱${formatNumber(saleData.tax_amount)}`;
    document.getElementById('saleDetailsTotal').textContent = `₱${formatNumber(saleData.total_amount)}`;
    
    if (saleData.payment_method === 'cash') {
        document.getElementById('saleDetailsCashInfo').style.display = 'block';
        document.getElementById('saleDetailsAmountReceived').textContent = `₱${formatNumber(saleData.amount_received)}`;
        document.getElementById('saleDetailsChange').textContent = `₱${formatNumber(saleData.change_amount)}`;
    } else {
        document.getElementById('saleDetailsCashInfo').style.display = 'none';
    }
    
    modal.show();
}

// Utility functions
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

function showLoading() {
    // Show loading indicators
    document.querySelectorAll('.chart-container canvas').forEach(canvas => {
        const parent = canvas.parentElement;
        if (!parent.querySelector('.loading-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner position-absolute top-50 start-50 translate-middle';
            spinner.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x"></i>';
            parent.style.position = 'relative';
            parent.appendChild(spinner);
        }
    });
}

function hideLoading() {
    // Hide loading indicators
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        spinner.remove();
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}
