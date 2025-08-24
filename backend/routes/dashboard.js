const express = require('express');
const { dbAsync } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().toISOString().slice(0, 7);

        // Today's sales
        const todaySales = await dbAsync.get(
            'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE DATE(created_at) = CURDATE()'
        );

        // This month's sales
        const monthSales = await dbAsync.get(
            'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())'
        );

        // Total products
        const totalProducts = await dbAsync.get('SELECT COUNT(*) as count FROM products');

        // Low stock products (stock <= 10)
        const lowStock = await dbAsync.all('SELECT * FROM products WHERE stock <= 10 ORDER BY stock ASC');

        // Recent sales
        const recentSales = await dbAsync.all(
            `SELECT s.*, u.username as cashier_name
             FROM sales s
             LEFT JOIN users u ON s.cashier_id = u.id
             ORDER BY s.created_at DESC
             LIMIT 10`
        );

        res.json({
            todaySales: {
                transactions: todaySales.count,
                revenue: todaySales.total
            },
            monthSales: {
                transactions: monthSales.count,
                revenue: monthSales.total
            },
            totalProducts: totalProducts.count,
            lowStockProducts: lowStock,
            recentSales
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sales report by date range
router.get('/reports/sales', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        let dateFormat;
        switch (groupBy) {
            case 'month':
                dateFormat = '%Y-%m';
                break;
            case 'week':
                dateFormat = '%Y-%u';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        const salesReport = await dbAsync.all(
            `SELECT 
                DATE_FORMAT(created_at, ?) as period,
                COUNT(*) as transactions,
                SUM(total_amount) as revenue
             FROM sales 
             WHERE DATE(created_at) BETWEEN ? AND ?
             GROUP BY DATE_FORMAT(created_at, ?)
             ORDER BY period ASC`,
            [dateFormat, startDate, endDate, dateFormat]
        );

        res.json(salesReport);

    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get top selling products
router.get('/reports/products', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;

        let whereClause = '';
        let params = [];

        if (startDate && endDate) {
            whereClause = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
            params = [startDate, endDate];
        }

        const topProducts = await dbAsync.all(
            `SELECT 
                p.id,
                p.name,
                p.price,
                SUM(si.quantity) as total_sold,
                SUM(si.total_price) as total_revenue
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             JOIN sales s ON si.sale_id = s.id
             ${whereClause}
             GROUP BY p.id, p.name, p.price
             ORDER BY total_sold DESC
             LIMIT ?`,
            [...params, limit]
        );

        res.json(topProducts);

    } catch (error) {
        console.error('Product report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
