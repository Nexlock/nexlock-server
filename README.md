# 🔐 NexLock Server - Smart Locker Management Backend

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Version-1.0.0-brightgreen?style=for-the-badge" />
</div>

## 🚀 What is NexLock Server?

NexLock Server is the **powerful backend engine** that drives the entire NexLock smart locker ecosystem! Built with modern TypeScript and Express.js, it provides real-time communication with ESP32 modules, user management, rental tracking, and administrative controls.

### ✨ Key Features

- 🎯 **Real-time Communication** - WebSocket integration with ESP32 modules
- 📱 **Multi-platform APIs** - REST endpoints for mobile apps and web dashboards
- 🔄 **WiFi Provisioning Support** - Auto-discovery and pairing of new modules
- 👥 **User Management** - Secure authentication for users and admins
- 📊 **Rental Tracking** - Complete locker usage analytics
- 🛡️ **Role-based Access** - Superadmin, admin, and user permissions
- 🔧 **Dynamic Module Management** - Add/remove modules without server restart
- 📈 **Real-time Monitoring** - Live locker status updates

## 🛠️ Tech Stack

### Core Technologies

- **Runtime**: Node.js with Bun
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Authentication**: Passport.js with JWT
- **Validation**: Zod schemas
- **API Documentation**: RESTful design

### Key Dependencies

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.5",
  "prisma": "^5.7.1",
  "@prisma/client": "^5.7.1",
  "passport": "^0.7.0",
  "jsonwebtoken": "^9.0.2",
  "zod": "^3.22.4",
  "bcryptjs": "^2.4.3"
}
```

## 🚀 Quick Start Guide

### 1. 📥 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/nexlock-server.git
cd nexlock-server

# Install dependencies (using Bun)
bun install

# Or with npm
npm install
```

### 2. 🔧 Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/nexlock"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Superadmin Secret (for system setup)
SUPERADMIN_SECRET="your-superadmin-secret-here"

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. 🗄️ Database Setup

```bash
# Generate Prisma client
bun run prisma generate

# Run database migrations
bun run prisma migrate dev

# (Optional) Seed the database
bun run prisma db seed
```

### 4. ⚡ Start the Server

```bash
# Development mode
bun run dev

# Production mode
bun start
```

Server will be available at `http://localhost:3000` 🎉

## 📁 Project Structure

```
nexlock-server/
├── 📁 src/
│   ├── 📁 controllers/        # Request handlers
│   │   ├── authController.ts
│   │   ├── rentalController.ts
│   │   └── superadminModuleController.ts
│   ├── 📁 middleware/         # Express middleware
│   │   ├── auth.ts
│   │   ├── adminAuth.ts
│   │   └── errorHandler.ts
│   ├── 📁 routes/            # API route definitions
│   │   ├── auth.ts
│   │   ├── rental.ts
│   │   └── superadminModule.ts
│   ├── 📁 schemas/           # Zod validation schemas
│   │   ├── auth.ts
│   │   ├── module.ts
│   │   └── rental.ts
│   ├── 📁 services/          # Business logic services
│   │   └── websocketService.ts
│   ├── 📁 utils/             # Utility functions
│   │   ├── nfc.ts
│   │   └── validation.ts
│   └── 📁 config/            # Configuration files
│       └── passport.ts
├── 📁 prisma/                # Database schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── 📁 generated/             # Generated Prisma client
├── 📄 app.ts                # Express app configuration
├── 📄 package.json
└── 📄 README.md             # You are here! 👋
```

## 🔌 API Documentation

### 🔐 Authentication Endpoints

#### User Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/profile
```

#### Admin Authentication

```http
POST /api/v1/admin/register
POST /api/v1/admin/login
GET  /api/v1/admin/profile
```

### 🏢 Superadmin Endpoints

#### Module Management

```http
GET  /api/v1/superadmin/available-modules    # List unpaired modules
POST /api/v1/superadmin/pair-module          # Pair module with admin
POST /api/v1/superadmin/modules              # Create module manually
DELETE /api/v1/superadmin/modules/:id        # Delete module
```

#### System Setup

```http
POST /api/v1/superadmin/admins               # Create admin with modules
```

### 🔒 Rental Endpoints

#### User Operations

```http
POST /api/v1/rentals                         # Create new rental
GET  /api/v1/rentals                         # Get user's rentals
POST /api/v1/rentals/checkout                # End rental
```

#### Admin Operations

```http
GET  /api/v1/locker-statuses                 # Get real-time locker status
```

### 🤖 Module Integration

#### ESP32 Communication

```http
POST /api/v1/validate-nfc                    # Validate NFC code
```

## 🔌 WebSocket Events

### 📡 Module Namespace (`/module`)

#### From ESP32 Modules

```javascript
// Module announces availability (WiFi provisioning)
"module-available" → {
  macAddress: "AA:BB:CC:DD:EE:FF",
  deviceInfo: "NexLock Module",
  version: "1.0",
  capabilities: 3
}

// Module registers after configuration
"register" → {
  moduleId: "DEV_12345678"
}

// Heartbeat from module
"ping" → {
  moduleId: "DEV_12345678"
}

// Locker occupancy status
"locker-status" → {
  moduleId: "DEV_12345678",
  lockerId: "L01",
  occupied: true,
  timestamp: 1234567890
}

// NFC validation request
"validate-nfc" → {
  nfcCode: "abcd1234ef567890",
  moduleId: "DEV_12345678"
}
```

#### To ESP32 Modules

```javascript
// Configuration after pairing
"module-configured" → {
  moduleId: "DEV_12345678",
  lockerIds: ["L01", "L02", "L03"],
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Remote unlock command
"unlock" → {
  lockerId: "L01",
  action: "unlock",
  timestamp: "2024-01-01T00:00:00.000Z"
}

// NFC validation response
"nfc-validation-result" → {
  valid: true,
  lockerId: "L01",
  message: "Access granted"
}

// Registration confirmation
"registered" → {
  moduleId: "DEV_12345678",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

### 🌐 Main Namespace (`/`)

#### To Web Clients

```javascript
// Available modules update (for superadmin)
"available-modules-update" → {
  modules: [...]
}

// Real-time locker status (for dashboards)
"locker-status-update" → {
  moduleId: "DEV_12345678",
  lockerId: "L01",
  occupied: true,
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Admin unlock result
"admin-unlock-result" → {
  moduleId: "DEV_12345678",
  lockerId: "L01",
  success: true
}
```

## 🗄️ Database Schema

### Core Entities

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  name         String
  password     String
  LockerRental LockerRental[]
}

model Admin {
  id       String   @id @default(cuid())
  email    String?  @unique
  name     String?
  password String?
  modules  Module[]
}

model Module {
  id          String   @id @default(cuid())
  name        String
  deviceId    String   @unique
  description String?
  location    String?
  admin       Admin?   @relation(fields: [adminId], references: [id])
  adminId     String?
  lockers     Locker[]
}

model Locker {
  id           String         @id @default(cuid())
  lockerId     String
  module       Module         @relation(fields: [moduleId], references: [id])
  moduleId     String
  LockerRental LockerRental[]
}

model LockerRental {
  id        String    @id @default(cuid())
  nfcCode   String
  startDate DateTime  @default(now())
  endDate   DateTime?
  locker    Locker    @relation(fields: [lockerId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
}
```

## 🎛️ Configuration

### Environment Variables

| Variable            | Description                      | Required | Default     |
| ------------------- | -------------------------------- | -------- | ----------- |
| `DATABASE_URL`      | PostgreSQL connection string     | ✅       | -           |
| `JWT_SECRET`        | Secret for JWT token signing     | ✅       | -           |
| `SUPERADMIN_SECRET` | Secret for superadmin operations | ✅       | -           |
| `PORT`              | Server port                      | ❌       | 3000        |
| `NODE_ENV`          | Environment mode                 | ❌       | development |

### Module Discovery Flow

1. **ESP32 boots** → WiFi provisioning mode
2. **User configures WiFi** → ESP32 connects to server
3. **ESP32 broadcasts availability** → Server receives "module-available"
4. **Superadmin sees module** → Pairs with admin
5. **Server sends configuration** → ESP32 saves and restarts
6. **ESP32 registers** → Normal operation begins

## 🔧 Development

### Running in Development

```bash
# Start with hot reload
bun run dev

# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format
```

### Database Operations

```bash
# Reset database
bun run prisma migrate reset

# View database
bun run prisma studio

# Generate client after schema changes
bun run prisma generate
```

### Environment Setup

```bash
# Copy example environment
cp .env.example .env

# Edit with your configuration
nano .env
```

## 🐛 Troubleshooting

### Common Issues

**🔴 Database Connection Failed**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string
psql "postgresql://username:password@localhost:5432/nexlock"
```

**🔴 WebSocket Connection Issues**

```bash
# Check firewall settings
sudo ufw allow 3000

# Verify CORS configuration in app.ts
```

**🔴 Module Not Appearing**

```bash
# Check server logs for "module-available" events
# Verify ESP32 is connected to same network
# Check WebSocket namespace (/module)
```

**🔴 JWT Token Errors**

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Check token expiration in client
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
export DEBUG=socket.io:*,express:*

# Start server with verbose logging
bun run dev
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/controllers/authController.test.ts

# Run with coverage
bun test --coverage
```

### API Testing

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"password123"}'

# Using httpie
http POST localhost:3000/api/v1/auth/login email=test@example.com password=password123
```

## 🚀 Deployment

### Production Setup

```bash
# Install production dependencies only
bun install --production

# Build the application
bun run build

# Start in production mode
NODE_ENV=production bun start
```

### Docker Deployment

```dockerfile
FROM oven/bun:1.0

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production

COPY . .
RUN bun run prisma generate

EXPOSE 3000
CMD ["bun", "start"]
```

### Environment Configuration

```bash
# Production environment variables
DATABASE_URL="postgresql://user:pass@prod-db:5432/nexlock"
JWT_SECRET="your-production-jwt-secret"
SUPERADMIN_SECRET="your-production-superadmin-secret"
NODE_ENV=production
PORT=3000
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. 📤 **Push** to the branch (`git push origin feature/amazing-feature`)
5. 🎯 **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Zod for input validation
- Write comprehensive tests
- Update API documentation
- Follow conventional commit messages

### Code Style

```bash
# Format code before committing
bun run format

# Lint for errors
bun run lint

# Type check
bun run type-check
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🏆 Credits

Created with ❤️ by the NexLock team

### Special Thanks

- **Prisma** - Next-generation ORM
- **Socket.IO** - Real-time communication
- **Express.js** - Fast, minimalist web framework
- **Zod** - TypeScript-first schema validation
- **Bun** - Fast JavaScript runtime

## 📞 Support

Need help? We've got you covered!

- 📧 **Email**: support@nexlock.com
- 💬 **Discord**: [Join our community](https://discord.gg/nexlock)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/nexlock-server/issues)
- 📖 **Documentation**: [API Docs](https://docs.nexlock.com/api)

---

<div align="center">
  <h3>🌟 Star this repository if you found it helpful! 🌟</h3>
  <p>Made with 💖 and lots of ☕</p>
  <p><strong>Building the future of smart locker management! 🚀</strong></p>
</div>
