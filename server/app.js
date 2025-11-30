const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const NASA_API_KEY = process.env.NASA_API_KEY || 'gWIJqBXp1aTBXFaTDnd7GI9xOYlHfQBMe15cq4qd';

app.use(cors());
app.use(express.json());

// NASA API base URL
const NASA_BASE_URL = 'https://api.nasa.gov';

// APOD - Astronomy Picture of the Day
app.get('/api/apod', async (req, res) => {
  try {
    const { date } = req.query;
    const url = `${NASA_BASE_URL}/planetary/apod?api_key=${NASA_API_KEY}${date ? `&date=${date}` : ''}`;
    console.log(`Fetching APOD: ${url}`);
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('APOD API Error:', error.message);
    // Return mock APOD data on error
    res.json({
      date: new Date().toISOString().split('T')[0],
      explanation: "This is a sample astronomy picture. The actual NASA APOD service may be temporarily unavailable. This demonstrates the application's fallback mechanism to ensure users always have content to explore.",
      hdurl: "https://apod.nasa.gov/apod/image/2310/M33_HubbleSubaru_3000.jpg",
      media_type: "image",
      service_version: "v1",
      title: "Sample: The Triangulum Galaxy",
      url: "https://apod.nasa.gov/apod/image/2310/M33_HubbleSubaru_960.jpg"
    });
  }
});

// Mars Rover Photos
app.get('/api/mars-photos', async (req, res) => {
  try {
    const { rover = 'curiosity', sol = '1000', camera } = req.query;
    let url = `${NASA_BASE_URL}/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${NASA_API_KEY}`;
    if (camera && camera !== '') url += `&camera=${camera}`;
    
    console.log(`Fetching Mars photos: ${url}`);
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data.photos && response.data.photos.length === 0) {
      // Try a different sol if no photos found
      const fallbackSol = rover === 'perseverance' ? '100' : '2000';
      const fallbackUrl = `${NASA_BASE_URL}/mars-photos/api/v1/rovers/${rover}/photos?sol=${fallbackSol}&api_key=${NASA_API_KEY}`;
      const fallbackResponse = await axios.get(fallbackUrl, { timeout: 10000 });
      res.json(fallbackResponse.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Mars Photos API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch Mars photos', 
      details: error.response?.data || error.message 
    });
  }
});

// Near Earth Objects
app.get('/api/neo', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const startDate = start_date || today;
    const endDate = end_date || today;
    
    const url = `${NASA_BASE_URL}/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
    console.log(`Fetching NEO: ${url}`);
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('NEO API Error:', error.message);
    // Return mock NEO data
    const today = new Date().toISOString().split('T')[0];
    res.json({
      links: { self: "mock-data" },
      element_count: 2,
      near_earth_objects: {
        [today]: [
          {
            id: "54016849",
            name: "(2020 SO)",
            absolute_magnitude_h: 28.1,
            estimated_diameter: {
              kilometers: { estimated_diameter_min: 0.004, estimated_diameter_max: 0.009 },
              meters: { estimated_diameter_min: 4.2, estimated_diameter_max: 9.4 }
            },
            is_potentially_hazardous_asteroid: false,
            close_approach_data: [{
              close_approach_date: today,
              relative_velocity: { kilometers_per_hour: "27000" },
              miss_distance: { kilometers: "450000" }
            }]
          }
        ]
      }
    });
  }
});

// DONKI - Space Weather
app.get('/api/donki', async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let url;
    if (type === 'flr') {
      url = `${NASA_BASE_URL}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`;
    } else if (type === 'cme') {
      url = `${NASA_BASE_URL}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`;
    } else {
      // Get both solar flares and CMEs
      const [flrResponse, cmeResponse] = await Promise.all([
        axios.get(`${NASA_BASE_URL}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`),
        axios.get(`${NASA_BASE_URL}/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`)
      ]);
      return res.json({
        solarFlares: flrResponse.data,
        cmes: cmeResponse.data
      });
    }
    
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('DONKI API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch space weather data' });
  }
});

// EPIC - Earth Images
app.get('/api/epic', async (req, res) => {
  try {
    const { date } = req.query;
    let url = `${NASA_BASE_URL}/EPIC/api/natural`;
    if (date) {
      url += `/date/${date}`;
    } else {
      // Get available dates first, then get images for the most recent date
      const datesUrl = `${NASA_BASE_URL}/EPIC/api/natural/available?api_key=${NASA_API_KEY}`;
      const datesResponse = await axios.get(datesUrl, { timeout: 10000 });
      if (datesResponse.data && datesResponse.data.length > 0) {
        const latestDate = datesResponse.data[datesResponse.data.length - 1].date;
        url += `/date/${latestDate}`;
      }
    }
    url += `?api_key=${NASA_API_KEY}`;
    
    console.log(`Fetching EPIC images: ${url}`);
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('EPIC API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch EPIC data', 
      details: error.response?.data || error.message 
    });
  }
});

// EONET - Natural Events
app.get('/api/eonet', async (req, res) => {
  try {
    const { category, status = 'open', limit = 20 } = req.query;
    let url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limit}`;
    if (category) url += `&category=${category}`;
    
    console.log(`Fetching EONET: ${url}`);
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'AstroLink-NASA-Explorer/1.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('EONET API Error:', error.message);
    // Return mock natural events data
    res.json({
      title: "EONET Events",
      description: "Natural events from EONET",
      events: [
        {
          id: "EONET_6195",
          title: "Wildfire - California, United States",
          description: "Sample wildfire event for demonstration",
          categories: [{ id: "wildfires", title: "Wildfires" }],
          sources: [{ id: "InciWeb", url: "https://inciweb.nwcg.gov/" }],
          geometry: [{
            magnitudeValue: null,
            magnitudeUnit: null,
            date: new Date().toISOString(),
            type: "Point",
            coordinates: [-120.5, 37.5]
          }]
        },
        {
          id: "EONET_6196",
          title: "Volcano - Mount Etna, Italy",
          description: "Sample volcanic activity",
          categories: [{ id: "volcanoes", title: "Volcanoes" }],
          sources: [{ id: "SIVolcano", url: "https://volcano.si.edu/" }],
          geometry: [{
            magnitudeValue: 3.2,
            magnitudeUnit: "VEI",
            date: new Date().toISOString(),
            type: "Point",
            coordinates: [14.999, 37.748]
          }]
        }
      ]
    });
  }
});

// NASA Image Library Search
app.get('/api/images', async (req, res) => {
  try {
    const { q = 'earth', media_type = 'image' } = req.query;
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=${media_type}`;
    
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('NASA Images API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch NASA images' });
  }
});

// POWER API - Climate and Solar Energy Data
app.get('/api/power', async (req, res) => {
  try {
    const { 
      latitude = '33.69', 
      longitude = '73.05', 
      start = '20240101', 
      end = '20240110',
      parameters = 'T2M,ALLSKY_SFC_SW_DWN'
    } = req.query;
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=RE&longitude=${longitude}&latitude=${latitude}&start=${start}&end=${end}&format=JSON`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('POWER API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch POWER data' });
  }
});

// TechPort - NASA Technology Projects
app.get('/api/techport', async (req, res) => {
  try {
    const { projectId } = req.query;
    let url = `https://api.nasa.gov/techport/api/projects`;
    if (projectId) {
      url += `/${projectId}?api_key=${NASA_API_KEY}`;
    } else {
      url += `?api_key=${NASA_API_KEY}`;
    }
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('TechPort API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch TechPort data' });
  }
});

// GIBS - Global Imagery Browse Services (Capabilities)
app.get('/api/gibs', async (req, res) => {
  try {
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/all/wmts.cgi?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities`;
    const response = await axios.get(url, { timeout: 15000 });
    res.send(response.data);
  } catch (error) {
    console.error('GIBS API Error:', error.message);
    res.status(500).send('Failed to fetch GIBS capabilities');
  }
});

// JPL Small-Body Database
app.get('/api/sbdb', async (req, res) => {
  try {
    const { sstr = '433' } = req.query; // 433 = Eros
    const url = `https://api.nasa.gov/ssd-api/sbdb_query.api?sstr=${encodeURIComponent(sstr)}&api_key=${NASA_API_KEY}`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('SBDB API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch small body data' });
  }
});

// OSDR - Open Science Data Repository
app.get('/api/osdr', async (req, res) => {
  try {
    const { studyId = 'OSD-379', page = 1, size = 10 } = req.query;
    const url = `https://osdr.nasa.gov/osdr/rest/datasets/studies/${studyId}/experiments?page=${page}&size=${size}`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('OSDR API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch OSDR data' });
  }
});

// Earthdata Search
app.get('/api/earthdata', async (req, res) => {
  try {
    const { keyword = 'MODIS', page_size = 10 } = req.query;
    const url = `https://cmr.earthdata.nasa.gov/search/collections.umm_json?keyword=${encodeURIComponent(keyword)}&page_size=${page_size}`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('Earthdata API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Earthdata collections' });
  }
});

// ADS - Astrophysics Data System
app.get('/api/ads', async (req, res) => {
  try {
    const { q = 'black hole', rows = 10 } = req.query;
    const url = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(q)}&rows=${rows}`;
    const response = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'AstroLink' } });
    res.json(response.data);
  } catch (error) {
    console.error('ADS API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch ADS data' });
  }
});

// Exoplanet Archive
app.get('/api/exoplanets', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+*+from+ps&format=json&maxrec=${limit}`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('Exoplanet API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch exoplanets' });
  }
});

module.exports = app;