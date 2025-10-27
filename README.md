# IndiFleet - Quantum-Enhanced Fleet Management System

IndiFleet is a comprehensive fleet management platform that leverages quantum computing for optimized vehicle routing, blockchain technology for secure transactions, and modern web technologies for an intuitive user interface.

## 🚀 Features

- **Quantum-Optimized Routing**: Uses Qiskit quantum circuits to solve vehicle routing problems with enhanced efficiency
- **Blockchain Integration**: Smart contracts for secure delivery tracking and escrow payments
- **Real-time GPS Tracking**: Google Maps integration for live fleet monitoring
- **Interactive Dashboard**: React-based frontend with charts and analytics for truck drivers and postal services
- **RESTful API**: Express.js backend for data management, AI integration, and sentiment analysis
- **Authentication & Security**: JWT-based auth with bcrypt encryption
- **WebSocket Support**: Real-time updates for GPS tracking

## 🏗️ Architecture

This is a monorepo containing four main components:

### Frontend (`frontend/`)
- **Technology**: React + Vite + React Router
- **Purpose**: User dashboard for fleet management
- **Key Features**:
  - Real-time maps with Google Maps API
  - Interactive charts (Chart.js, ApexCharts, CanvasJS)
  - Authentication for truck drivers and postal services
  - Driver and vehicle management interfaces
  - Delivery tracking and status updates

### Backend (`backend/`)
- **Technology**: Node.js + Express + WebSocket
- **Purpose**: API server and business logic
- **Key Features**:
  - RESTful API endpoints for CRUD operations
  - Google AI (Gemini) integration for route optimization
  - Firebase Firestore for data storage
  - GPS tracking services with real-time updates
  - Sentiment analysis for driver feedback
  - Rate limiting and CORS support

### Quantum Engine (`quantum/`)
- **Technology**: Python + Qiskit + NumPy + Pandas
- **Purpose**: Quantum computing for advanced routing optimization
- **Key Features**:
  - Quantum circuit-based VRP solver using angle encoding
  - Classical-quantum hybrid approach
  - Data preprocessing and feature engineering
  - Visualization with Matplotlib
  - Constraint enforcement (capacity, distance, time)

### Blockchain Layer (`fleet/`)
- **Technology**: Solidity + Hardhat + Web3.js
- **Purpose**: Secure delivery and payment system
- **Key Features**:
  - Four smart contracts: AccessRegistry, DeliveryManagement, Escrow, ProofOfDelivery
  - Role-based access control (FleetOwner, Carrier, Customer)
  - Decentralized escrow for payments
  - Proof of delivery tracking

## 📋 Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn
- Hardhat (for blockchain development)
- Git

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/siba-sundar/QuantumFleet.git
   cd QuantumFleet
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   - Copy `.env.example` to `.env` in root, frontend/, and backend/
   - Configure API keys for Google Maps, Firebase, etc.

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access at: http://localhost:5173

5. **Setup Backend**
   ```bash
   cd ../backend
   npm install
   npm run dev
   ```
   API available at: http://localhost:3000

6. **Setup Quantum Engine**
   ```bash
   cd ../quantum
   pip install -r requirements.txt
   python sample.py
   ```

7. **Setup Blockchain**
   ```bash
   cd ../fleet
   npm install
   npx hardhat compile
   npx hardhat test
   ```

## 🛠️ Technologies Used

### Frontend
- React 18 with Hooks
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Google Maps API for location services
- Chart.js, ApexCharts, CanvasJS for data visualization

### Backend
- Node.js with ES modules
- Express.js for API framework
- WebSocket for real-time communication
- Firebase Admin SDK
- Google AI (Gemini) for NLP
- JWT for authentication
- bcryptjs for password hashing

### Quantum
- Python 3.8+
- Qiskit for quantum computing
- NumPy and Pandas for data processing
- Matplotlib for visualization
- Scikit-learn for preprocessing

### Blockchain
- Solidity ^0.8.0
- Hardhat for development
- OpenZeppelin contracts
- Web3.js for interaction

## 📁 Project Structure

```
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API services
│   │   └── routes/        # App routes
│   └── package.json
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access
│   │   └── models/        # Data models
│   └── api.js
├── quantum/               # Python quantum engine
│   ├── optimizer.py       # Main optimization logic
│   ├── quantum_layer.py   # Qiskit circuits
│   ├── constraints_layer.py # Constraint handling
│   └── visualization.py   # Plotting utilities
├── fleet/                 # Solidity smart contracts
│   ├── contracts/         # Smart contract files
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
├── scripts/               # Utility scripts
├── docs/                  # Documentation
└── package.json           # Monorepo configuration
```

## 🔧 Configuration

### Environment Variables
Create `.env` files in respective directories:

**Frontend (.env):**
```
VITE_GOOGLE_MAPS_API_KEY=your_api_key
VITE_API_BASE_URL=http://localhost:3000
```

**Backend (.env):**
```
PORT=3000
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_AI_API_KEY=your_ai_key
JWT_SECRET=your_jwt_secret
```

## 📡 API Endpoints

The backend provides the following main endpoints:

- `GET /api/trucks` - Get all trucks
- `POST /api/reservations` - Create truck reservation
- `GET /api/gps/:truckId` - Get GPS data for truck
- `POST /api/sentiment/analyze` - Analyze driver sentiment
- `WS /gps-updates` - WebSocket for real-time GPS updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 The Team - APX Nova

- **Aditya Dutt**
- **Siba Sundar**
- **Rajveer Singh Khanduja**
- **Vishakha Bhandari**
- **Khushi Dixit**
- **Manasa Nimmala**

## 🙏 Acknowledgments

- Google for Qiskit, AI APIs, and Maps
- Ethereum community for blockchain tools
- Open source contributors
- Quantum computing research community</content>
