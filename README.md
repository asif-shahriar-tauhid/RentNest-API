# 🏡 RentNest API — Modern Property Rental Platform Backend

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-6772E5?style=for-the-badge&logo=stripe&logoColor=white)

**RentNest API** is a robust, feature-packed RESTful backend API designed to power a modern property rental platform. Built with **TypeScript**, **Express.js**, **Prisma ORM**, and **PostgreSQL**, it offers multi-role user authentication, dynamic property searching/filtering, automated rental request management, Stripe payment processing with webhooks, tenant reviews, and a complete admin management system.

---

## 🔗 Quick Links & Live Demos

- 🌐 **Live API Base URL**: [https://rentnestb7a4.vercel.app](https://rentnestb7a4.vercel.app)
- 📚 **Interactive Postman Documentation**: [Postman Docs](https://documenter.getpostman.com/view/54703524/2sBY4QsKkB)
- 📦 **Postman Collection File**: [`RentNest API.postman_collection.json`](file:///d:/Code/PH%20Level2%20Assignments/B7A4-RentNestAPI/RentNest%20API.postman_collection.json)
- 💻 **GitHub Repository**: [https://github.com/asif-shahriar-tauhid/RentNest-API](https://github.com/asif-shahriar-tauhid/RentNest-API)

---

## 🔑 Demo Credentials

Test the platform across different user roles using the following pre-seeded / demo credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| 🛡️ **Admin** | `admin1@rentnest.com` | `password` |
| 🏠 **Landlord** | `landlord1@rentnest.com` | `password` |
| 👤 **Tenant** | `tenant1@rentnest.com` | `password` |

---

## ✨ Features Overview

### 🔐 1. Authentication & Authorization
- **Role-Based Access Control (RBAC)**: Support for `TENANT`, `LANDLORD`, and `ADMIN` roles.
- **Secure Password Hashing**: Utilizes `bcrypt` salt hashing for password storage.
- **JWT Authentication**: Issue access tokens (`JWT_ACCESS_SECRET`) and HTTP-only cookie-based refresh tokens (`JWT_REFRESH_TOKEN`).
- **Profile Fetching**: Protected `/api/auth/me` endpoint to retrieve current logged-in user details.

### 🏡 2. Property Management (Landlord & Public)
- **Public Property Directory**: Browse properties with advanced search options:
  - City filtering (case-insensitive search).
  - Category filtering.
  - Price range filter (`minRent`, `maxRent`).
  - Bedrooms count filter.
  - Pagination (`page`, `limit`).
- **Landlord Property Operations**:
  - Add new property listings with amenities, images, address, city, district, rent, bedrooms, bathrooms, and area.
  - Update property details (owned properties only).
  - Soft status updates (`AVAILABLE`, `RENTED`, `UNAVAILABLE`).
  - Delete property (guarded: prevents deleting properties with active/pending rental requests).

### 🏷️ 3. Category Management (Admin Only)
- Admins can create, read, update, and delete property categories (e.g., Apartments, Villas, Studios).

### 📑 4. Rental Requests & Lifecycle
- **Tenant Submissions**: Tenants submit rental requests specifying `moveInDate`, `duration` (in months), and optional message.
- **Landlord Decisions**: Landlords review and update status (`PENDING` ➔ `APPROVED` / `REJECTED`).
- **Status Lifecycle**: `PENDING` ➔ `APPROVED` ➔ `ACTIVE` (upon successful payment) ➔ `COMPLETED`.

### 💳 5. Stripe Payments & Webhooks
- **Automated Checkout Sessions**: Tenants pay for `APPROVED` rental requests via Stripe Checkout.
- **Stripe Webhook Listener**: Endpoint (`/api/payments/webhook`) listens for `checkout.session.completed`, automatically marking payment as `COMPLETED` and updating rental request status to `ACTIVE` inside a database transaction.
- **Fallback Confirmation**: Manual session confirmation endpoint (`/api/payments/confirm`) in case webhooks are delayed.
- **Payment History**: View payment records filtered by role permissions.

### ⭐ 6. Ratings & Reviews
- Tenants can submit reviews and ratings (1 to 5 stars) for properties they have rented.
- Property detail endpoints compute and display ratings alongside individual tenant reviews.

### 👑 7. Admin Dashboard & Operations
- **User Management**: List all platform users, inspect user details, and update user status (`ACTIVE` or `BANNED`).
- **Global Overview**: Monitor all platform properties, rental requests, and payment transactions.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js** | JavaScript runtime environment |
| **Express.js (v5)** | Fast, unopinionated web framework for Node.js |
| **TypeScript** | Strongly typed programming language building on JS |
| **Prisma ORM (v7)** | Next-generation Node.js & TypeScript ORM (with Multi-file Schema feature) |
| **PostgreSQL** | Relational Database Management System |
| **Stripe Node API** | Payment processing & webhooks integration |
| **JWT (jsonwebtoken)** | Secure authentication and bearer token validation |
| **Bcrypt** | Password hashing algorithm |
| **Tsup & TSX** | High-performance TypeScript bundling & live-reloading dev runner |

---

## 📁 Project Directory Structure

```
B7A4-RentNestAPI/
├── prisma/
│   └── schema/
│       ├── schema.prisma       # Main Prisma configuration & database datasource
│       ├── enum.prisma         # System Enums (UserRole, PropertyStatus, etc.)
│       ├── user.prisma         # User model definition
│       ├── property.prisma     # Property model definition
│       ├── category.prisma     # Category model definition
│       ├── RentalRequest.prisma# Rental Request model definition
│       ├── payment.prisma      # Payment model definition
│       └── review.prisma       # Review model definition
├── src/
│   ├── app.ts                  # Express application setup, routes & global middlewares
│   ├── server.ts               # Server startup & database connection initialization
│   ├── config/
│   │   ├── index.ts            # Environment variables loader & validator
│   │   └── stripe.ts           # Stripe client initialization
│   ├── lib/
│   │   └── prisma.ts           # Prisma Client instance setup
│   ├── middlewares/
│   │   ├── auth.ts             # JWT authentication & authorization middleware
│   │   └── globalErrorHandler.ts # Global error handling middleware
│   ├── modules/
│   │   ├── admin/              # Admin management module (controller, service, route)
│   │   ├── auth/               # Auth module (controller, service, route)
│   │   ├── category/           # Category module (controller, service, route)
│   │   ├── payment/            # Payment & Stripe webhook module
│   │   ├── property/           # Property management module
│   │   ├── rental/             # Rental requests module
│   │   └── review/             # Review module
│   ├── types/                  # Global TypeScript interfaces & declarations
│   └── utils/                  # Helper utilities (AppError, pagination, response handlers)
├── .env.example                # Sample environment variables template
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript compiler configuration
├── tsup.config.ts              # Production build configuration
└── vercel.json                 # Vercel deployment configuration
```

---

## 🗄️ Database Schema & Enums

### Data Models & Relationships

```mermaid
erDiagram
    User ||--o{ Property : "hosts (LANDLORD)"
    User ||--o{ RentalRequests : "creates (TENANT)"
    User ||--o{ Payment : "makes (TENANT)"
    User ||--o{ Review : "writes (TENANT)"
    Category ||--o{ Property : "categorizes"
    Property ||--o{ RentalRequests : "receives"
    Property ||--o{ Review : "receives"
    RentalRequests ||--o| Payment : "has"
    RentalRequests ||--o| Review : "has"
```

### System Enums

- **UserRole**: `TENANT`, `LANDLORD`, `ADMIN`
- **UserStatus**: `ACTIVE`, `BANNED`
- **PropertyStatus**: `AVAILABLE`, `RENTED`, `UNAVAILABLE`
- **RentalStatus**: `PENDING`, `APPROVED`, `REJECTED`, `ACTIVE`, `COMPLETED`
- **PaymentProvider**: `STRIPE`
- **PaymentStatus**: `PENDING`, `COMPLETED`, `FAILED`

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Database Connection URL (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/rentnest_db?schema=public"

# Application Server Port & Base URL
PORT=5000
APP_URL="http://localhost:3000"

# JWT Configuration
JWT_ACCESS_SECRET="your_jwt_access_secret_key"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_TOKEN="your_jwt_refresh_secret_key"
JWT_REFRESH_EXPIRES_IN="7d"

# Stripe API Keys & Webhook Secret
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher installed.
- **npm** or **yarn**.
- **PostgreSQL**: Local database or remote instance (e.g., Supabase, Neon, Railway).
- **Stripe Account**: Required for API secret keys & webhook testing.

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/asif-shahriar-tauhid/RentNest-API.git
   cd RentNest-API
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and populate all required variables.
   ```bash
   cp .env.example .env
   ```

4. **Run Prisma Migrations & Generate Client**:
   ```bash
   npx prisma db push
   # or for migrations:
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The server will launch on `http://localhost:5000`.

6. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📜 Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts dev server with hot-reloading using `tsx watch` |
| `npm run build` | Generates Prisma client and builds production bundle using `tsup` |
| `npm start` | Executes the built JS application from `dist/server.js` |
| `npm run postinstall` | Automatically triggers `prisma generate` after package installations |

---

## 📡 Comprehensive API Reference

### 🔐 Auth Module (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`TENANT`, `LANDLORD`, `ADMIN`) |
| `POST` | `/api/auth/login` | Public | User login & JWT cookie/token generation |
| `GET` | `/api/auth/me` | Authenticated | Retrieve logged-in user profile details |

---

### 🏡 Property Module (`/api/property`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/property` | Public | Fetch available properties with search/filters (`city`, `categoryId`, `minRent`, `maxRent`, `bedrooms`, `page`, `limit`) |
| `GET` | `/api/property/:id` | Public | Get single property details including category, landlord, and reviews |
| `POST` | `/api/property` | `LANDLORD` | Create a new property listing |
| `PATCH` | `/api/property/:id` | `LANDLORD` | Update owned property listing details |
| `DELETE` | `/api/property/:id` | `LANDLORD` | Delete property (fails if active/pending rental requests exist) |
| `PATCH` | `/api/property/:id/status` | `LANDLORD` | Update property status (`AVAILABLE`, `RENTED`, `UNAVAILABLE`) |

---

### 🏷️ Category Module (`/api/categories`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public | List all property categories |
| `GET` | `/api/categories/:id` | Public | Get details of a single category |
| `POST` | `/api/categories` | `ADMIN` | Create a new property category |
| `PUT` | `/api/categories/:id` | `ADMIN` | Update property category name/description |
| `DELETE` | `/api/categories/:id` | `ADMIN` | Delete a property category |

---

### 📑 Rental Requests Module (`/api/rentals`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rentals` | `TENANT` | Submit a rental request for a property |
| `GET` | `/api/rentals` | Authenticated | Retrieve rental requests (filtered by user role) |
| `GET` | `/api/rentals/:id` | Authenticated | Fetch specific rental request details |
| `PATCH` | `/api/rentals/:id/status` | `LANDLORD` | Update request status (`APPROVED`, `REJECTED`, `COMPLETED`) |

---

### 💳 Payment Module (`/api/payments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create` | `TENANT` | Initiate Stripe Checkout Session for an APPROVED rental request |
| `POST` | `/api/payments/confirm` | `TENANT` | Confirm Stripe payment status using `session_id` |
| `POST` | `/api/payments/webhook` | Public (Stripe Signature) | Stripe webhook listener for real-time payment events |
| `GET` | `/api/payments` | Authenticated | Fetch payment history (Tenant/Landlord/Admin) |
| `GET` | `/api/payments/:id` | Authenticated | View details of a specific payment transaction |

---

### ⭐ Review Module (`/api/reviews`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reviews` | `TENANT` | Submit rating & review for a completed/active rental |
| `GET` | `/api/reviews/property/:propertyId` | Public | Get all tenant reviews for a specific property |

---

### 👑 Admin Module (`/api/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | `ADMIN` | List all platform users |
| `GET` | `/api/admin/users/:id` | `ADMIN` | Get detailed user profile |
| `PATCH` | `/api/admin/users/:id/status` | `ADMIN` | Ban or activate a user account (`ACTIVE` / `BANNED`) |
| `GET` | `/api/admin/properties` | `ADMIN` | Overview of all properties across the platform |
| `GET` | `/api/admin/rentals` | `ADMIN` | Overview of all rental requests |
| `GET` | `/api/admin/payments` | `ADMIN` | Overview of all financial transactions |

---

## ⚡ Response Format & Error Handling

### Success Response Example
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Property retrieved successfully",
  "data": { ... }
}
```

### Paginated Response Example
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Properties retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Rental request must be approved before payment."
}
```

---

## 📄 License & Author

- **Author**: Asif Shahriar Tauhid
- **License**: [ISC](LICENSE)
