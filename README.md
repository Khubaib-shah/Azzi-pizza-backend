# Azzipizza Backend API

**Node.js/Express backend powering Azzipizza's online ordering system**  
A robust RESTful API supporting pizza customization, real-time order processing, and secure payment integration.

## 🚀 Core Features

### Order Management
- Menu item CRUD operations
- Customizable pizza builder API
- Order status workflow (pending → cooking → out-for-delivery → completed)

### Payment System
- PayPal integration with webhook verification
- Payment intent creation
- Refund processing capability

### Real-time Functionality
- Socket.io for instant kitchen notifications
- Order status push updates
- Admin dashboard order stream

### Security
- JWT authentication (customer/staff roles)
- Rate limiting on auth endpoints
- Sensitive data encryption

## 💻 Tech Stack

**Core**  
`Node.js 18` | `Express 4.x` | `MongoDB 6` | `Mongoose 7`

**Key Packages**  
- `socket.io` - Real-time communication  
- `jsonwebtoken` - Authentication  
- `paypal-rest-sdk` - Payment processing  
- `joi` - Request validation  
- `winston` - Structured logging

## 🛠️ Installation (Backend Specific)

```bash
# 1. Clone and enter directory
git clone https://github.com/Khubaib-shah/Azzi-pizza-backend.git
cd Azzi-pizza-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in:
# - MONGODB_URI
# - PAYPAL_CLIENT_ID & SECRET
# - JWT_SECRET

# 4. Start development server
npm run dev
