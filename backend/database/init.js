const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MySQL connection configuration (without database selection for initial setup)
const dbConfigWithoutDB = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
};

// MySQL connection configuration (with database)
const dbConfig = {
    ...dbConfigWithoutDB,
    database: process.env.DB_NAME || 'sari_sari_pos'
};

// Create database if it doesn't exist
const createDatabase = async () => {
    const connection = mysql.createConnection(dbConfigWithoutDB);
    const promiseConnection = connection.promise();

    try {
        await promiseConnection.execute(`CREATE DATABASE IF NOT EXISTS sari_sari_pos`);
        console.log('✅ Database "sari_sari_pos" created or already exists');
        await promiseConnection.end();
        return true;
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        await promiseConnection.end();
        return false;
    }
};

// Initialize database schema
const initDatabase = async () => {
    try {
        // First, create the database
        const dbCreated = await createDatabase();
        if (!dbCreated) {
            throw new Error('Failed to create database');
        }

        // Connect to the specific database
        const connection = mysql.createConnection(dbConfig);
        const promiseConnection = connection.promise();

        console.log('🔄 Creating database tables...');

        // Users table (admin/cashier)
        await promiseConnection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Products table
        await promiseConnection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                barcode VARCHAR(100) UNIQUE,
                price DECIMAL(10,2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                category VARCHAR(100),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Sales transactions table
        await promiseConnection.execute(`
            CREATE TABLE IF NOT EXISTS sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id VARCHAR(50) UNIQUE NOT NULL,
                cashier_id INT,
                total_amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(20) DEFAULT 'cash',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cashier_id) REFERENCES users (id)
            )
        `);

        // Sales items table (products in each transaction)
        await promiseConnection.execute(`
            CREATE TABLE IF NOT EXISTS sale_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sale_id INT,
                product_id INT,
                quantity INT NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        `);

        console.log('✅ Database tables created successfully');

        // Create default admin user
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        try {
            await promiseConnection.execute(
                `INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
                ['admin', defaultPassword, 'admin']
            );
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        } catch (err) {
            console.log('ℹ️ Admin user already exists');
        }

        // Insert sample products
        const sampleProducts = [
            ['Rice (1kg)', '7901234567890', 55.00, 50, 'Staples'],
            ['Instant Noodles', '7901234567891', 12.00, 100, 'Food'],
            ['Coca Cola 350ml', '7901234567892', 25.00, 30, 'Beverages'],
            ['Shampoo Sachet', '7901234567893', 8.50, 200, 'Personal Care'],
            ['Bread Loaf', '7901234567894', 45.00, 15, 'Food'],
            ['Cooking Oil 1L', '7901234567895', 85.00, 25, 'Cooking'],
            ['Sugar 1kg', '7901234567896', 60.00, 30, 'Staples'],
            ['Coffee 3-in-1', '7901234567897', 7.00, 150, 'Beverages']
        ];

        for (const product of sampleProducts) {
            try {
                await promiseConnection.execute(
                    `INSERT IGNORE INTO products (name, barcode, price, stock, category) VALUES (?, ?, ?, ?, ?)`,
                    product
                );
            } catch (err) {
                // Ignore duplicate entries
            }
        }

        console.log('✅ Database initialized successfully!');
        console.log('📦 Sample products added to inventory');

        await promiseConnection.end();
        return true;

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        return false;
    }
};

// Run initialization if this script is executed directly
if (require.main === module) {
    initDatabase().then((success) => {
        if (success) {
            console.log('🎉 Database setup completed successfully!');
            process.exit(0);
        } else {
            console.log('❌ Database setup failed!');
            process.exit(1);
        }
    });
}

module.exports = { initDatabase };
