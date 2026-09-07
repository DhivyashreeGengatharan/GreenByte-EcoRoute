# Project Structure & Tech Stack

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: JSON Web Tokens (JWT)
- **CORS**: Enabled for cross-origin requests
- **Environment**: dotenv for configuration

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet with React-Leaflet
- **State Management**: React Context API
- **Routing**: React Router

### External APIs & Services
- **Routing**: Open Source Routing Machine (OSRM)
- **Maps**: OpenStreetMap tiles
- **Air Quality**: Real-time AQI data APIs
- **Weather**: Weather data integration
- **Traffic**: Real-time traffic data
- **Geocoding**: Location search and coordinates

### Development Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Code Quality**: ESLint
- **Type Checking**: TypeScript
- **Build**: Vite for frontend, npm scripts for backend

## File Structure

```
GreenByte/
├── backend/                          # Node.js/Express API server
│   ├── middleware/
│   │   └── authMiddleware.js         # JWT authentication middleware
│   ├── models/
│   │   └── User.js                   # MongoDB user model
│   ├── routes/
│   │   ├── auth.js                   # Authentication endpoints
│   │   └── carbon.js                 # Carbon credit endpoints
│   ├── .env                          # Environment variables
│   ├── .gitignore                    # Git ignore rules
│   ├── package.json                  # Backend dependencies
│   ├── package-lock.json             # Dependency lock file
│   ├── server.js                     # Main server file
│   └── vercel.json                   # Vercel deployment config
│
├── web-client/                       # React/TypeScript frontend
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── api/                      # API service functions
│   │   │   ├── aqi.tsx               # Air quality API
│   │   │   ├── carbon.ts             # Carbon credit API
│   │   │   └── routing.ts            # Routing API
│   │   ├── assets/                   # Images and resources
│   │   ├── auth/                     # Authentication components
│   │   │   ├── AuthContext.tsx       # Auth context provider
│   │   │   ├── AuthModal.tsx         # Login/register modal
│   │   │   └── useAuth.ts            # Auth hook
│   │   ├── components/               # Reusable UI components
│   │   │   ├── AnalyticsView.tsx     # Analytics dashboard
│   │   │   ├── Dashboard.tsx         # Main dashboard
│   │   │   ├── LeafletMap.tsx        # Map component
│   │   │   ├── LocationSearchInput.tsx # Location search
│   │   │   ├── Marketplace.tsx       # Carbon marketplace
│   │   │   ├── Navbar.tsx            # Navigation bar
│   │   │   └── Wallet.tsx            # User wallet
│   │   ├── .env.example              # Environment template
│   │   ├── .env.local                # Local environment
│   │   ├── App.css                   # Global styles
│   │   ├── App.tsx                   # Main app component
│   │   ├── index.css                 # Base styles
│   │   └── main.tsx                  # App entry point
│   ├── .gitignore                    # Git ignore rules
│   ├── eslint.config.js              # ESLint configuration
│   ├── index.html                    # HTML template
│   ├── package.json                  # Frontend dependencies
│   ├── package-lock.json             # Dependency lock file
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── tsconfig.app.json             # TypeScript app config
│   ├── tsconfig.json                 # TypeScript config
│   ├── tsconfig.node.json            # TypeScript node config
│   └── vite.config.ts                # Vite configuration
│
├── .git/                             # Git repository
├── .vscode/                          # VS Code settings
├── README.md                         # Project overview
└── PROJECT_STRUCTURE.md              # This file
```

## Key Architecture Decisions

### Backend Architecture
- **RESTful API**: Clean REST endpoints for all operations
- **Middleware Chain**: Authentication, CORS, and error handling
- **Database Abstraction**: Direct MongoDB driver usage
- **Environment Configuration**: Secure credential management

### Frontend Architecture
- **Component-Based**: Modular React components
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach with Tailwind
- **State Management**: Context API for global state

### Data Flow
1. User interacts with React components
2. API calls to Express backend
3. Backend processes requests with MongoDB
4. External APIs provide environmental data
5. Results returned to frontend for display

## Deployment
- **Backend**: Deployed on Vercel with serverless functions
- **Frontend**: Static hosting (Vercel/Netlify)
- **Database**: MongoDB Atlas cloud database
- **CI/CD**: Automated deployment on push to main branch