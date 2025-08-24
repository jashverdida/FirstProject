const express = require('express');
const { dbAsync } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create new sale
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, paymentMethod = 'cash' } = req.body;
        const cashierId = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        // Generate unique transaction ID
        const transactionId = 'TXN' + Date.now();
        let totalAmount = 0;

        // Start transaction
        const connection = await dbAsync.beginTransaction();

        try {
            // Create sale record
            const [saleResult] = await connection.execute(
                'INSERT INTO sales (transaction_id, cashier_id, total_amount, payment_method) VALUES (?, ?, ?, ?)',
                [transactionId, cashierId, 0, paymentMethod] // We'll update total_amount later
            );

            const saleId = saleResult.insertId;

            // Process each item
            for (const item of items) {
                const { productId, quantity } = item;

                // Get product details and check stock
                const [productRows] = await connection.execute('SELECT * FROM products WHERE id = ?', [productId]);
                const product = productRows[0];
                
                if (!product) {
                    throw new Error(`Product with ID ${productId} not found`);
                }

                if (product.stock < quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${quantity}`);
                }

                const itemTotal = product.price * quantity;
                totalAmount += itemTotal;

                // Insert sale item
                await connection.execute(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                    [saleId, productId, quantity, product.price, itemTotal]
                );

                // Update product stock
                await connection.execute(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [quantity, productId]
                );
            }

            // Update total amount in sales table
            await connection.execute(
                'UPDATE sales SET total_amount = ? WHERE id = ?',
                [totalAmount, saleId]
            );

            await dbAsync.commit(connection);

            res.json({
                message: 'Sale completed successfully',
                transactionId,
                saleId,
                totalAmount
            });

        } catch (error) {
            await dbAsync.rollback(connection);
            throw error;
        }

    } catch (error) {
        console.error('Sale error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get sales history
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (startDate && endDate) {
            whereClause = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
            params = [startDate, endDate];
        }

        const sales = await dbAsync.all(
            `SELECT s.*, u.username as cashier_name
             FROM sales s
             LEFT JOIN users u ON s.cashier_id = u.id
             ${whereClause}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sale details with items
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const saleId = req.params.id;

        // Get sale info
        const sale = await dbAsync.get(
            `SELECT s.*, u.username as cashier_name
             FROM sales s
             LEFT JOIN users u ON s.cashier_id = u.id
             WHERE s.id = ?`,
            [saleId]
        );

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Get sale items
        const items = await dbAsync.all(
            `SELECT si.*, p.name as product_name, p.barcode
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [saleId]
        );

        res.json({ ...sale, items });
    } catch (error) {
        console.error('Get sale details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
