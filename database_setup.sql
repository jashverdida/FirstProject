-- Sari-Sari Store POS Database Setup
-- Run this script in MySQL 8.0 client

-- Create database
CREATE DATABASE IF NOT EXISTS sari_sari_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sari_sari_pos;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'cashier') DEFAULT 'cashier',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    description TEXT,
    image_url VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'gcash') NOT NULL,
    amount_received DECIMAL(10, 2),
    change_amount DECIMAL(10, 2),
    status ENUM('completed', 'pending', 'cancelled') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, email, role) VALUES 
('admin', '$2b$10$rJZjvGKX8vX5VJHjvJvZKu8kJGvGKX8vX5VJHjvJvZKu8kJGvGKX8u', 'admin@sarisari.com', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- Insert sample products
INSERT INTO products (name, sku, category, price, stock_quantity, description) VALUES
('Coca Cola 330ml', 'COKE-330', 'Beverages', 18.00, 50, 'Refreshing cola drink'),
('Lucky Me Instant Pancit Canton', 'LM-PANCIT', 'Food', 15.00, 100, 'Instant noodles'),
('Surf Powder 35g', 'SURF-35G', 'Household', 8.00, 75, 'Laundry detergent powder'),
('Maggi Magic Sarap 8g', 'MAGGI-8G', 'Condiments', 5.00, 200, 'All-in-one seasoning'),
('Rice (per kilo)', 'RICE-1KG', 'Food', 45.00, 25, 'Premium jasmine rice'),
('Banana (per piece)', 'BANANA-PC', 'Fruits', 3.00, 80, 'Fresh ripe banana'),
('Eggs (per piece)', 'EGG-PC', 'Dairy', 7.00, 60, 'Fresh chicken egg'),
('Bread Loaf', 'BREAD-LOAF', 'Bakery', 55.00, 20, 'Soft white bread'),
('Cigarettes Marlboro', 'MARL-RED', 'Tobacco', 150.00, 10, 'Marlboro Red cigarettes'),
('Load Card 100', 'LOAD-100', 'Services', 100.00, 30, 'Mobile load card worth 100 pesos')
ON DUPLICATE KEY UPDATE name = name;

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Show tables created
SHOW TABLES;

-- Display sample data
SELECT 'Users created:' as Info;
SELECT id, username, role, created_at FROM users;

SELECT 'Products created:' as Info;
SELECT id, name, category, price, stock_quantity FROM products LIMIT 5;

SELECT 'Database setup completed successfully!' as Status;
