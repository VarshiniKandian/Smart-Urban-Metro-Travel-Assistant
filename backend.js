const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ✅ FIX: handle both new and old `open` module export styles
let open;
try {
  open = require('open').default || require('open');
} catch (e) {
  console.warn('⚠️ "open" module not found. Install it with: npm install open');
}

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Load metro data paths
const hyderabadDataPath = path.join(__dirname, 'data', 'hyderabad-metro.json');
const chennaiDataPath   = path.join(__dirname, 'data', 'chennai-metro.json');
const bengaluruDataPath = path.join(__dirname, 'data', 'bengaluru-metro.json');
const mumbaiDataPath    = path.join(__dirname, 'data', 'mumbai-metro.json');
const jaipurDataPath    = path.join(__dirname, 'data', 'jaipur-metro.json');

// Routes to serve metro JSON files
app.get('/data/hyderabad-metro.json', (req, res) => res.sendFile(hyderabadDataPath));
app.get('/data/chennai-metro.json', (req, res) => res.sendFile(chennaiDataPath));
app.get('/data/bengaluru-metro.json', (req, res) => res.sendFile(bengaluruDataPath));
app.get('/data/mumbai-metro.json', (req, res) => res.sendFile(mumbaiDataPath));
app.get('/data/jaipur-metro.json', (req, res) => res.sendFile(jaipurDataPath));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, 'public', 'map.html')));

// Route finding algorithm
function findShortestPath(start, end, data) {
  const distances = {};
  const prev = {};
  const visited = new Set();
  const queue = [];

  Object.keys(data).forEach(station => {
    distances[station] = Infinity;
    prev[station] = null;
  });

  distances[start] = 0;
  queue.push({ station: start, time: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.time - b.time);
    const current = queue.shift();
    const currStation = current.station;

    if (visited.has(currStation)) continue;
    visited.add(currStation);

    data[currStation].neighbors.forEach(neighbor => {
      const alt = distances[currStation] + neighbor.time;
      if (alt < distances[neighbor.station]) {
        distances[neighbor.station] = alt;
        prev[neighbor.station] = { station: currStation, line: neighbor.line };
        queue.push({ station: neighbor.station, time: alt });
      }
    });
  }

  const path = [];
  let curr = end;
  while (curr && prev[curr]) {
    path.unshift({ station: curr, line: prev[curr].line });
    curr = prev[curr].station;
  }
  if (curr === start) path.unshift({ station: start, line: null });

  // ✅ Ensure totalTime is numeric and not Infinity
  const totalTime = distances[end] === Infinity ? 0 : distances[end];

  return { path, totalTime };
}

// Helper to pick the correct data file
function getDataPath(cityLower) {
  if (cityLower === 'hyderabad') return hyderabadDataPath;
  if (cityLower === 'chennai') return chennaiDataPath;
  if (cityLower === 'bengaluru') return bengaluruDataPath;
  if (cityLower === 'mumbai') return mumbaiDataPath;
  if (cityLower === 'jaipur') return jaipurDataPath;
  return null;
}

// API endpoint for route finding (case-insensitive city)
app.get('/route', (req, res) => {
  const { from, to, city } = req.query;
  const cityLower = (city || 'hyderabad').toLowerCase();
  const dataPath = getDataPath(cityLower);

  if (!dataPath) return res.status(404).json({ error: 'City not supported' });

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!data[from] || !data[to]) return res.status(400).json({ error: 'Invalid station' });

  const result = findShortestPath(from, to, data);
  res.json(result);
});

// API endpoint for stations list (case-insensitive city)
app.get('/stations', (req, res) => {
  const cityLower = (req.query.city || 'hyderabad').toLowerCase();
  const dataPath = getDataPath(cityLower);

  if (!dataPath) return res.status(404).json({ error: 'City not supported' });

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  res.json(Object.keys(data));
});

// ---- Start server and open browser ----
app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`🚇 Server running: ${url}`);

  if (open && process.env.NODE_ENV !== 'production') {
    try {
      await open(url);
      console.log('🌐 Browser opened automatically!');
    } catch (err) {
      console.error('⚠️ Could not open browser automatically:', err);
    }
  } else {
    console.log('⚙️ Skipping auto-open (production or open not available).');
  }
});
