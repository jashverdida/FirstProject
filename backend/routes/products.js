const express = require('express');
const { dbAsync } = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, async (req, res) => {
    try {
        const products = await dbAsync.all('SELECT * FROM products ORDER BY name');
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await dbAsync.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, barcode, price, stock, category, description } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const result = await dbAsync.insert(
            `INSERT INTO products (name, barcode, price, stock, category, description, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [name, barcode, price, stock || 0, category, description]
        );

        res.json({ id: result.insertId, message: 'Product created successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Barcode already exists' });
        }
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, barcode, price, stock, category, description } = req.body;
        const productId = req.params.id;

        const result = await dbAsync.modify(
            `UPDATE products 
             SET name = ?, barcode = ?, price = ?, stock = ?, category = ?, description = ?, updated_at = NOW()
             WHERE id = ?`,
            [name, barcode, price, stock, category, description, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await dbAsync.modify('DELETE FROM products WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
