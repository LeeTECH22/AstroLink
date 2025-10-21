# 🚀 AstroLink - NASA Data Explorer

> **Developed by Bruce Lee** - A comprehensive, full-stack web application that integrates multiple NASA public APIs to provide an interactive platform for exploring space data, from daily astronomy pictures to real-time space weather monitoring.

![AstroLink](https://img.shields.io/badge/AstroLink-NASA%20Data%20Explorer-blue?style=for-the-badge&logo=nasa)
![Developer](https://img.shields.io/badge/Developer-Bruce%20Lee-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

## 🌟 Live Demo

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001](http://localhost:5001)

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
- **Dark Space Theme** - Beautiful space-themed UI with smooth animations
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
nasa-data-explorer/
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

### Super Quick Start (Windows)
1. **Double-click `start.bat`** - Automatically installs everything and starts the app!

### Manual Installation

1. **Download/Clone the project**
   ```bash
   # If you have git
   git clone <repository-url>
   cd nasa-data-explorer
   
   # Or download and extract the ZIP file
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the application**
   ```bash
   npm run dev:full
   ```
   This starts both the React frontend (port 3000) and Express backend (port 5000)

4. **Open your browser**
   Navigate to `http://localhost:3000`

### NASA API Key
The project comes with a working NASA API key pre-configured. For production use, get your own free key at [api.nasa.gov](https://api.nasa.gov/).

## 🚀 Deployment

### Deploy to Vercel (Frontend)
1. Fork this repository
2. Connect to Vercel
3. Deploy automatically

### Deploy to Railway/Render (Backend)
1. Deploy the `server` folder
2. Set environment variable: `NASA_API_KEY`
3. Set start command: `npm start`

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

### Alternative: Start servers separately
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here

# Server Configuration
PORT=5000
```

### Getting NASA API Key
1. Visit [NASA API Portal](https://api.nasa.gov/)
2. Sign up for a free account
3. Generate your API key
4. Replace `DEMO_KEY` in `.env` with your key

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
- **Framer Motion** - Production-ready motion library
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

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Vitest** - Unit testing framework

## 📱 Pages & Features

### 🏠 Dashboard
- Overview of all available features
- Quick navigation to different sections
- Statistics and highlights

### 📸 APOD (Astronomy Picture of the Day)
- Daily featured space images
- Historical date selection
- HD image downloads
- Detailed astronomical explanations

### 🤖 Mars Rover Photos
- Photos from Curiosity, Perseverance, Opportunity, and Spirit
- Filter by rover, sol (Martian day), and camera
- High-resolution image viewing
- Mission and camera information

### ☄️ Near Earth Objects
- Real-time asteroid tracking
- Interactive data tables and charts
- Size vs distance visualizations
- Potentially hazardous object alerts

### ☀️ Space Weather
- Solar flare monitoring
- Coronal mass ejection tracking
- Space weather impact assessments
- Real-time alerts and notifications

### 🌍 Earth Images (EPIC)
- Full Earth imagery from L1 Lagrange point
- Date-based image selection
- Geographic coordinate data
- Download capabilities

### 🗺️ Natural Events
- Interactive world map of natural disasters
- Real-time event tracking
- Category-based filtering
- Detailed event information

### 🖼️ Image Library
- Search NASA's vast image collection
- Filter by media type (images, videos, audio)
- High-resolution downloads
- Mission and metadata information

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#3B82F6 to #8B5CF6)
- **Secondary**: Gray scale (#1F2937 to #F9FAFB)
- **Accent Colors**: 
  - Success: #10B981 (Green)
  - Warning: #F59E0B (Amber)
  - Error: #EF4444 (Red)
  - Info: #3B82F6 (Blue)

### Typography
- **Font Family**: Inter, system fonts
- **Headings**: Bold weights (600-800)
- **Body**: Regular weight (400)
- **Code**: Monospace fonts

### Components
- **Cards**: Glass morphism effect with backdrop blur
- **Buttons**: Gradient backgrounds with hover effects
- **Forms**: Dark theme with focus states
- **Navigation**: Sticky header with smooth transitions

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy automatically on push

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm run server`
5. Add environment variables

### Environment Variables for Production
```env
NASA_API_KEY=your_production_api_key
PORT=5000
NODE_ENV=production
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write unit tests for new features
- Follow the existing code structure
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA** for providing free, open access to incredible space data
- **NASA API Team** for maintaining excellent documentation
- **Open Source Community** for the amazing tools and libraries
- **Space Exploration Enthusiasts** for inspiration and feedback

## 📞 Support

- 📧 Email: support@nasa-explorer.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔗 Links

- [NASA Open Data Portal](https://api.nasa.gov/)
- [NASA Official Website](https://www.nasa.gov/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

**Built with ❤️ for space exploration enthusiasts and developers**

*Explore the cosmos, one API call at a time* 🌌