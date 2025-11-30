# 🚀 AstroLink - NASA Data Explorer

> **Developed by Bruce Lee** - A comprehensive, full-stack web application that integrates multiple NASA public APIs to provide an interactive platform for exploring space data, from daily astronomy pictures to real-time space weather monitoring.

![AstroLink](https://img.shields.io/badge/AstroLink-NASA%20Data%20Explorer-blue?style=for-the-badge&logo=nasa)
![Developer](https://img.shields.io/badge/Developer-Bruce%20Lee-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

## 🌟 Live Demo

- **Frontend (Vite dev)**: `http://localhost:5173`
- **Backend API (Express dev)**: `http://localhost:5001`

## 📸 Screenshots

![AstroLink Dashboard](https://via.placeholder.com/800x400/1a237e/ffffff?text=AstroLink+Dashboard)
*Main dashboard showing all NASA data sources*

![Natural Events Map](https://via.placeholder.com/800x400/1a237e/ffffff?text=Interactive+Natural+Events+Map)
*Interactive map showing real-time natural disasters and events*

## ✨ Features

### 🌟 Core Functionality
- **Astronomy Picture of the Day (APOD)** - Daily space images with detailed explanations
- **Mars Rover Photos** - Browse images from NASA's Mars rovers with advanced filtering
- **Near Earth Objects (NEO)** - Track asteroids with interactive charts and data visualization
- **Space Weather (DONKI)** - Monitor solar flares and coronal mass ejections
- **Earth Images (EPIC)** - View our planet from space with satellite imagery
- **Natural Events (EONET)** - Track natural disasters with interactive maps
- **Image Library** - Search NASA's vast collection of space imagery

### 🎨 User Experience
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Professional Light Theme** - Clean, modern UI with smooth animations
- **Interactive Charts** - Data visualization with Chart.js
- **Interactive Maps** - Leaflet.js integration for geographic data
- **Real-time Data** - Live updates from NASA APIs
- **Advanced Filtering** - Filter data by date, category, rover, camera, etc.

### 🛠 Technical Features
- **Full-Stack Architecture** - React frontend with Express.js backend
- **API Security** - Backend proxy to hide API keys
- **Type Safety** - Full TypeScript implementation
- **Modern React** - Hooks, Context, and latest React patterns
- **Performance Optimized** - React Query for caching and data management
- **Error Handling** - Comprehensive error boundaries and user feedback

## 🏗 Architecture

```
AstroLink/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── services/          # API service layer
│   └── types/             # TypeScript type definitions
├── server/                # Express.js backend
│   └── index.js          # API proxy server
└── public/               # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LeeTECH22/AstroLink.git
   cd AstroLink
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the application**
   ```bash
   npm run dev:full
   ```
   This starts both the React frontend (port 5173) and Express backend (port 5001)

4. **Open your browser**
   Navigate to `http://localhost:3000`

### NASA API Key
- Get a free key at [api.nasa.gov](https://api.nasa.gov/)
- For local dev, set `NASA_API_KEY` in `.env` (backend)
- For production (Vercel), set `VITE_NASA_API_KEY` in Environment Variables (frontend)
- Optionally set `VITE_API_URL` to your backend’s `/api` URL; otherwise the app will call NASA endpoints directly (using `VITE_NASA_API_KEY`) when the proxy is unavailable

## 📡 NASA APIs Integrated

| API | Description | Features |
|-----|-------------|----------|
| **APOD** | Astronomy Picture of the Day | Daily images, historical archive, HD versions |
| **Mars Rover Photos** | Images from Mars rovers | Multiple rovers, camera filters, sol-based search |
| **NeoWs** | Near Earth Object Web Service | Asteroid tracking, size estimates, approach dates |
| **DONKI** | Space Weather Database | Solar flares, CME tracking, geomagnetic storms |
| **EPIC** | Earth Polychromatic Imaging Camera | Full Earth images, natural color, daily updates |
| **EONET** | Earth Observatory Natural Event Tracker | Disaster tracking, real-time events, geographic data |
| **NASA Image Library** | NASA's image and video library | Search functionality, multiple media types |

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI framework with concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Chart.js** - Interactive charts and visualizations
- **Leaflet** - Interactive maps
- **Lucide React** - Beautiful icon library

### Backend
- **Express.js** - Web application framework
- **Axios** - HTTP client for API requests
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 🚀 Deployment

### Deploy to Vercel (Frontend)
1. Connect this repo to Vercel
2. In Vercel Project Settings → Environment Variables add:
   - `VITE_NASA_API_KEY = YOUR_KEY`
   - `VITE_API_URL = https://your-backend.example.com/api` (optional)
3. Redeploy
4. The app will use the backend if available; otherwise it will automatically call NASA APIs directly with `VITE_NASA_API_KEY`

### Deploy to Railway/Render (Backend)
1. Deploy the `server` folder
2. Set environment variable: `NASA_API_KEY`
3. Set start command: `npm start`
4. Expose the public URL and use it as `VITE_API_URL` on Vercel

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Bruce Lee**
- Passionate about space exploration and making NASA's incredible data accessible to everyone
- Specialized in React, TypeScript, and modern web technologies

## 🙏 Acknowledgments

- NASA for providing free, open access to incredible space data
- NASA API Team for maintaining excellent documentation
- Open Source Community for the amazing tools and libraries

---

**Built with ❤️ for space exploration enthusiasts and developers**

*Explore the cosmos, one API call at a time* 🌌