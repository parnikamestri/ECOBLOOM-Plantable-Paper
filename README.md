# ECOBLOOM Full Stack

React + Vite frontend with Node.js/Express backend and MySQL Server database.

## Database
Create `ecobloom_db` and the ECOBLOOM tables in MySQL Workbench using the SQL script provided in the project setup.

## Backend setup
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and enter your own MySQL password and JWT secret.

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=ecobloom_db
JWT_SECRET=YOUR_LONG_SECRET
PORT=5000
CLIENT_URL=http://localhost:5173
```

Seed starter products and admin:
```bash
npm run seed
```
Admin login:
`admin@ecobloom.local` / `Admin@123`

Start backend:
```bash
npm run dev
```

## Frontend
From the project root:
```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Features include registration/login, profile, products, cart, checkout, COD/demo online payment, orders, product customization with design upload, and admin product/order/customization management.
