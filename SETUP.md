# 🚀 NASA Data Explorer - Complete Setup Guide

## Quick Start (Windows)

1. **Double-click `start.bat`** - This will automatically install all dependencies and start both frontend and backend servers.

## Manual Setup

### Prerequisites
- Node.js 18+ and npm
- Git (optional)

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 2: Configure API Key

The NASA API key is already configured in the `.env` file:
```
NASA_API_KEY=gWIJqBXp1aTBXFaTDnd7GI9xOYlHfQBMe15cq4qd
```

### Step 3: Start the Application

**Option A: Start both servers together**
```bash
npm run dev:full
```

**Option B: Start servers separately**

Terminal 1 (Backend):
```bash
cd server
npm start
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🌟 Features Overview

### ✅ All 15 NASA APIs Integrated

1. **APOD** - Astronomy Picture of the Day
2. **Mars Rover Photos** - Images from Mars rovers
3. **Near Earth Objects** - Asteroid tracking
4. **DONKI** - Space weather events
5. **EPIC** - Earth imagery from space
6. **EONET** - Natural event tracking
7. **NASA Image Library** - Space imagery search
8. **POWER** - Climate and solar energy data
9. **TechPort** - NASA technology projects
10. **Small Body Database** - Asteroid and comet data
11. **Earthdata Search** - Earth observation datasets
12. **Exoplanet Archive** - Confirmed exoplanets
13. **GIBS** - Global imagery services
14. **ADS** - Astrophysics research papers (demo)
15. **OSDR** - Open science data repository

### 🎨 User Interface Features

- **Responsive Design** - Works on all devices
- **Dark Space Theme** - Beautiful space-themed UI
- **Interactive Charts** - Data visualization with Chart.js
- **Interactive Maps** - Leaflet.js integration
- **Real-time Data** - Live updates from NASA APIs
- **Advanced Filtering** - Filter data by multiple parameters
- **Smooth Animations** - Framer Motion animations

### 🛠 Technical Features

- **React 18** with TypeScript
- **Express.js** backend for API proxy
- **Tailwind CSS** for styling
- **React Query** for data management
- **Chart.js** for visualizations
- **Leaflet** for maps
- **Framer Motion** for animations

## 📁 Project Structure

```
nasa-data-explorer/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/             # Main application pages
│   ├── services/          # API service layer
│   └── types/             # TypeScript definitions
├── server/                # Express.js backend
│   ├── index.js          # Main server file
│   └── package.json      # Server dependencies
├── public/               # Static assets
├── .env                  # Environment variables
├── start.bat            # Windows startup script
├── start.sh             # Linux/Mac startup script
└── package.json         # Frontend dependencies
```

## 🔧 Troubleshooting

### Common Issues

1. **Port already in use**
   - Frontend (3000): Change in `vite.config.ts`
   - Backend (5000): Change in `server/index.js` and `.env`

2. **Dependencies not installing**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **API errors**
   - Check internet connection
   - Verify NASA API key in `.env`
   - Check browser console for detailed errors

### Performance Tips

1. **Reduce API calls** - Increase `staleTime` in React Query
2. **Limit data** - Use pagination and filtering
3. **Optimize images** - Enable lazy loading

## 🚀 Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`

### Backend (Render/Railway)
1. Deploy the `server` folder
2. Set start command: `npm start`
3. Add environment variable: `NASA_API_KEY`

## 📊 API Usage Statistics

- **Total Endpoints**: 15+ NASA APIs
- **Data Sources**: Real-time NASA data
- **Update Frequency**: Live data where available
- **Rate Limits**: Managed by backend proxy

## 🎯 Next Steps

1. **Get Personal API Key**: Visit [api.nasa.gov](https://api.nasa.gov) for higher rate limits
2. **Customize**: Modify components and add new features
3. **Deploy**: Host on Vercel, Netlify, or your preferred platform
4. **Contribute**: Add new NASA APIs or improve existing features

## 📞 Support

- **Issues**: Check browser console for errors
- **API Problems**: Verify NASA API status
- **Performance**: Monitor network tab for slow requests

---

**🌌 Explore the cosmos with NASA's incredible data!**