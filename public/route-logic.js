document.addEventListener('DOMContentLoaded', () => {
  const citySelect = document.getElementById('city');
  const fromSelect = document.getElementById('from');
  const toSelect = document.getElementById('to');
  const findBtn = document.getElementById('findRoute');

  // --- Initialize Leaflet map ---
  const map = L.map('map', { attributionControl: false, zoomControl: false })
    .setView([17.4375, 78.4483], 12);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // --- Legend ---
  const legend = L.control({position: 'bottomright'});
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'metro-legend');
    div.innerHTML = `
      <div class="legend-header">METRO LINES</div>
      <div class="legend-item red">
        <div class="line-color"></div>
        <div class="line-info">
          <span>Red Line</span>
          <small>Corridor I: Miyapur to LB Nagar</small>
        </div>
      </div>
      <div class="legend-item blue">
        <div class="line-color"></div>
        <div class="line-info">
          <span>Blue Line</span>
          <small>Corridor II: Nagole to Raidurg</small>
        </div>
      </div>
      <div class="legend-item green">
        <div class="line-color"></div>
        <div class="line-info">
          <span>Green Line</span>
          <small>Corridor III: JBS to MGBS</small>
        </div>
      </div>
    `;
    return div;
  };
  legend.addTo(map);

  // --- Global variables ---
  let stationCoords = {};
  let metroData = {};
  let routeLayers = [];
  let allMarkers = [];
  let totalTimeContainer = document.createElement('div');
  totalTimeContainer.className = 'total-time-container';
  document.body.appendChild(totalTimeContainer);
  totalTimeContainer.style.display = 'none';

  // --- Populate stations based on selected city ---
  function populateStations(city) {
    fromSelect.innerHTML = `<option value="" disabled selected>Select station</option>`;
    toSelect.innerHTML = `<option value="" disabled selected>Select station</option>`;
    stationCoords = {};

    fetch(`/stations?city=${city}`)
      .then(res => res.json())
      .then(stations => {
        stations.forEach(station => {
          fromSelect.add(new Option(station, station));
          toSelect.add(new Option(station, station));
          stationCoords[station] = [0, 0];
        });

        fetch(`/data/${city === 'chennai' ? 'chennai-metro.json' : 'hyderabad-metro.json'}`)
          .then(res => res.json())
          .then(data => {
            metroData = data;
            Object.keys(data).forEach(station => {
              stationCoords[station] = [data[station].lat, data[station].lng];
            });
          });
      });
  }

  citySelect.addEventListener('change', () => {
    const city = citySelect.value;
    if (city) populateStations(city);
  });

// --- Fare calculation ---
function calculateFare(city, stations) {
  if (stations <= 0) return 0;
  let fare = 0;

  if (city === 'Hyderabad') {
    if (stations <= 3) fare = 10;
    else if (stations <= 6) fare = 15;
    else if (stations <= 9) fare = 20;
    else if (stations <= 12) fare = 25;
    else if (stations <= 15) fare = 30;
    else if (stations <= 18) fare = 35;
    else if (stations <= 21) fare = 40;
    else if (stations <= 24) fare = 45;
    else if (stations <= 27) fare = 50;
    else if (stations <= 30) fare = 55;
    else fare = 60;
  } 
  
  else if (city === 'Chennai') {
    if (stations <= 2) fare = 10;
    else if (stations <= 5) fare = 20;
    else if (stations <= 8) fare = 30;
    else if (stations <= 11) fare = 40;
    else fare = 50;
  } 
  
  else if (city === 'Mumbai') {
    if (stations <= 3) fare = 10;
    else if (stations <= 6) fare = 20;
    else if (stations <= 9) fare = 30;
    else fare = 40;
  } 
  
  else if (city === 'Jaipur') {
    if (stations <= 2) fare = 10;
    else if (stations <= 5) fare = 15;
    else if (stations <= 8) fare = 20;
    else if (stations <= 11) fare = 25;
    else fare = 30;
  } 
  
  else if (city === 'Bengaluru') {
    if (stations <= 2) fare = 10;
    else if (stations <= 5) fare = 15;
    else if (stations <= 8) fare = 20;
    else if (stations <= 11) fare = 25;
    else if (stations <= 14) fare = 30;
    else if (stations <= 17) fare = 35;
    else if (stations <= 20) fare = 40;
    else if (stations <= 23) fare = 45;
    else if (stations <= 26) fare = 50;
    else if (stations <= 29) fare = 55;
    else fare = 60;
  }

  return fare;
}


  // --- Find route ---
  findBtn.addEventListener('click', () => {
    const from = fromSelect.value;
    const to = toSelect.value;
    const city = citySelect.value;
    if (!from || !to || from === to || !city) return;

    routeLayers.forEach(layer => map.removeLayer(layer));
    allMarkers.forEach(marker => map.removeLayer(marker));
    routeLayers = [];
    allMarkers = [];
    totalTimeContainer.style.display = 'none';

    fetch(`/route?from=${from}&to=${to}&city=${city}`)
      .then(res => res.json())
      .then(data => {
        const path = data.path || [];
        if (path.length === 0) return;

        const stationsTraveled = path.length > 1 ? path.length - 1 : 0;
        const fare = calculateFare(city, stationsTraveled);

        const segments = [];
        let segment = [];
        let currentLine = path[0].line;

        path.forEach((stop, idx) => {
          const coords = stationCoords[stop.station];
          segment.push(coords);

          const marker = L.circleMarker(coords, {
            color: getLineColor(stop.line),
            radius: 6,
            weight: 2,
            fillOpacity: 1
          }).addTo(map);
          marker.bindTooltip(`<strong>${stop.station}</strong><br>Line: ${stop.line || 'N/A'}`).openTooltip();
          allMarkers.push(marker);

          if (idx < path.length - 1 && path[idx + 1].line !== stop.line) {
            segments.push({ coords: [...segment], line: stop.line });
            segment = [coords];
          }
        });

        if (segment.length > 1) {
          segments.push({ coords: segment, line: path[path.length - 1].line });
        }

        segments.forEach(seg => {
          const polyline = L.polyline(seg.coords, {
            color: getLineColor(seg.line),
            weight: 6,
            opacity: 0.9,
            smoothFactor: 1
          }).addTo(map);
          routeLayers.push(polyline);
          map.fitBounds(polyline.getBounds());
        });

        // Add time labels
        for (let i = 0; i < path.length - 1; i++) {
          const curr = path[i];
          const next = path[i + 1];
          const midLat = (stationCoords[curr.station][0] + stationCoords[next.station][0]) / 2;
          const midLng = (stationCoords[curr.station][1] + stationCoords[next.station][1]) / 2;
          const time = metroData[curr.station].neighbors.find(n => n.station === next.station)?.time;

          if (time) {
            const timeLabel = L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'time-label',
                html: `<span>${time} min</span>`,
                iconSize: [40, 20]
              })
            }).addTo(map);
            routeLayers.push(timeLabel);
          }
        }

        const estDisplay = document.getElementById('estimatedTimeDisplay');
        const totalTime = data.totalTime || '--';
        if (estDisplay) {
          estDisplay.innerHTML = `
            Estimated Time: ${totalTime} min<br>
            Estimated Fare: ₹${fare}
          `;
        }

        totalTimeContainer.innerHTML = `<strong>Total Time:</strong> ${totalTime} minutes<br><strong>Estimated Fare:</strong> ₹${fare}`;
        totalTimeContainer.style.display = 'block';

        if (window.currentJourney) {
          window.currentJourney.route = data.path;
          window.currentJourney.totalTime = totalTime;
          window.currentJourney.fare = fare;
        }
      });
  });

  // --- Instructions panel ---
  const instructionsBtn = document.getElementById('instructionsBtn');
  const instructionsPanel = document.getElementById('instructionsPanel');
  const instructionsOutput = document.getElementById('instructionsOutput');

  instructionsBtn.addEventListener('click', () => {
    const from = fromSelect.value;
    const to = toSelect.value;
    const city = citySelect.value;

    if (!from || !to) {
      alert('Please select both starting and destination stations.');
      return;
    }

    fetch(`/route?from=${from}&to=${to}&city=${city}`)
      .then(res => res.json())
      .then(data => {
        instructionsOutput.innerHTML = '';

        if (!data.path || data.path.length === 0) {
          instructionsOutput.innerHTML = '<p>No route found!</p>';
          return;
        }

        data.path.forEach((stop, index) => {
          const stationName = stop.station || 'Unknown Station';
          const lineName = stop.line || 'Unknown Line';
          instructionsOutput.innerHTML += `<p>${index + 1}. Go to <strong>${stationName}</strong> (Line: ${lineName})</p>`;
        });

        instructionsPanel.classList.add('show');
      })
      .catch(err => {
        console.error(err);
        instructionsOutput.innerHTML = '<p>Error fetching route. Please try again.</p>';
      });
  });

  // Close button for instructions panel
  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✖';
  closeBtn.className = 'close-instructions-btn';
  instructionsPanel.prepend(closeBtn);

  closeBtn.addEventListener('click', () => {
    instructionsPanel.classList.remove('show');
  });

  // --- Line colors ---
  function getLineColor(line) {
    const colors = {
      Red: '#d32f2f',
      Blue: '#1976d2',
      Green: '#388e3c',
      Yellow: '#fbc02d',
      Purple: '#7b1fa2',
      Orange: '#f57c00'
    };
    return colors[line] || '#ffffff';
  }

  // --- Profile dropdown toggle ---
  const profileContainer = document.getElementById('profileContainer');
  const profileDropdown = profileContainer.querySelector('.profile-dropdown');

  profileContainer.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent document click from immediately closing
    profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileContainer.contains(e.target)) {
      profileDropdown.style.display = 'none';
    }
  });
});
