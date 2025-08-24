# Sari-Sari Store POS System

A complete Point of Sale system built with Node.js, Express, and MySQL for sari-sari stores.

## Features

- 🔐 User authentication (Admin/Cashier roles)
- 📦 Inventory management (CRUD operations)
- 💰 Sales transactions with stock management
- 🧾 Receipt generation
- 📊 Dashboard with sales analytics
- 📈 Sales reports (daily/weekly/monthly)

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- MySQL Server (version 5.7 or higher)

## Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure database connection**
   - Copy `.env.example` to `.env`
   - Update the database credentials in `.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=sari_sari_pos
   DB_PORT=3306
   ```

3. **Test MySQL connection and initialize database**
   ```bash
   node test-mysql.js
   ```
   
   Or manually initialize:
   ```bash
   npm run init-db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser and go to: `http://localhost:3000`
   - Default admin credentials:
     - Username: `admin`
     - Password: `admin123`

## Project Structure

```
├── backend/
│   ├── database/          # Database configuration and initialization
│   ├── middleware/        # Authentication middleware
│   ├── models/           # Database models (future use)
│   ├── routes/           # API routes
│   └── server.js         # Main server file
├── frontend/
│   ├── css/              # Stylesheets
│   ├── js/               # Frontend JavaScript
│   └── pages/            # HTML pages
└── package.json          # Dependencies and scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Sales
- `POST /api/sales` - Create new sale
- `GET /api/sales` - Get sales history
- `GET /api/sales/:id` - Get sale details

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/reports/sales` - Sales reports
- `GET /api/dashboard/reports/products` - Product reports

## Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database with sample data

## Default Sample Products

The system comes pre-loaded with common sari-sari store items:
- Rice (1kg)
- Instant Noodles
- Coca Cola 350ml
- Shampoo Sachet
- Bread Loaf
- Cooking Oil 1L
- Sugar 1kg
- Coffee 3-in-1

## Next Steps

1. Create the frontend HTML pages (login, inventory, sales, etc.)
2. Implement frontend JavaScript for API communication
3. Add receipt generation functionality
4. Enhance the dashboard with charts and analytics
5. Add backup and restore features

## License

MIT
