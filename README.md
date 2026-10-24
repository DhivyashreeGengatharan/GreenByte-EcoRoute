# GreenByte - Sustainable Carbon Credit Platform

## Overview
GreenByte is an innovative web application that promotes sustainable transportation by integrating carbon credit systems with intelligent route planning. The platform helps users reduce their carbon footprint through eco-friendly routing decisions and carbon offset purchases.

## Features

### 🔐 User Authentication
- Secure JWT-based authentication system
- User registration and login
- Protected routes and API endpoints

### 🗺️ Smart Route Planning
- Pollution-aware route calculation using real-time AQI data
- Integration with OpenStreetMap and OSRM for routing
- Carbon emission calculations for different routes
- Traffic and weather data integration

### 💚 Carbon Credit System
- Store and track carbon credits in MongoDB Atlas
- Purchase carbon offsets through integrated marketplace
- Real-time carbon savings calculations
- Wallet system for credit management

### 📊 Analytics Dashboard
- User carbon footprint tracking
- Route history and savings visualization
- Environmental impact metrics
- Performance analytics

### 🛒 Marketplace Integration
- Browse and purchase carbon credits
- Vendor listings for offset projects
- Transaction history
- Payment integration

### 🌍 Environmental Impact
- Real-time air quality monitoring
- Building density analysis
- Urban planning insights
- Community participation features

## Technology Stack
- **Backend**: Node.js, Express.js, MongoDB Atlas
- **Frontend**: React, TypeScript, Vite
- **Authentication**: JWT tokens
- **Mapping**: Leaflet, OpenStreetMap
- **APIs**: AQI data, weather, traffic
- **Deployment**: Vercel (backend), static hosting (frontend)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd greenbyte
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Configure .env with MongoDB URI
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd ../web-client
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/carbon/store` - Store carbon credits
- `GET /api/routing/calculate` - Calculate eco-routes
- `GET /api/aqi` - Air quality data

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License
This project is licensed under the MIT License.

## Contact
For questions or support, please open an issue in the repository.