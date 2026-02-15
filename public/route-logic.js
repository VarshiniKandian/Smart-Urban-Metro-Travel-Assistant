// route-logic.js
document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('city');
    const fromSelect = document.getElementById('from');
    const toSelect = document.getElementById('to');
    const findBtn = document.getElementById('findRoute');

    // --- Metro Timings Data ---
    const METRO_TIMINGS = {
        hyderabad: {
            first: '06:00 AM',
            last: '11:45 PM',
            notes: 'On Sundays, service starts around 07:00 AM.'
        },
        chennai: {
            first: '05:47 AM',
            last: '10:07 PM',
            notes: 'Other corridors may vary slightly.'
        },
        bengaluru: {
            first: '05:00 AM',
            last: '11:00 PM',
            notes: 'Sundays usually start at 06:00 AM.'
        },
        mumbai: {
            first: '05:30 AM',
            last: '11:50 PM',
            notes: 'Last train varies by direction (Versova: 11:25 PM).'
        },
        jaipur: {
            first: '06:25 AM',
            last: '10:22 PM',
            notes: 'Service may extend slightly on weekends.'
        }
    };
    
    const map = L.map('map', { attributionControl: false, zoomControl: false })
        .setView([17.4375, 78.4483], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // --- Metro Timings Control (TOP RIGHT CORNER) ---
    const timingsControl = L.control({ position: 'topright' });
    timingsControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'metro-timings');
        div.id = 'metroTimingsBox';
        div.innerHTML = '<div class="timings-header">METRO TIMINGS</div><p style="font-size:13px; color:#aaa; margin:0;">Select a city to view timings.</p>';
        
        L.DomEvent.disableClickPropagation(div);
        return div;
    };
    timingsControl.addTo(map);


    // --- Metro Line Legend Control (BOTTOM RIGHT CORNER) ---
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'metro-legend');
        div.innerHTML = '';
        return div;
    };
    legend.addTo(map);


    let stationCoords = {};
    let metroData = {};
    let routeLayers = [];
    let allMarkers = [];

    function updateLegend(city) {
        const legendDiv = document.querySelector('.metro-legend');
        if (!legendDiv) return;

        let html = '<div class="legend-header">METRO LINES</div>';
        const cityLower = city.toLowerCase();

        if (cityLower === 'hyderabad') {
            html += `
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
        } else if (cityLower === 'chennai') {
            html += `
                <div class="legend-item green"><div class="line-color"></div><div class="line-info"><span>Green Line</span><small>Airport to St. Thomas Mount</small></div></div>
                <div class="legend-item blue"><div class="line-color"></div><div class="line-info"><span>Blue Line</span><small>Washermanpet to Chennai Beach</small></div></div>
            `;
        } else if (cityLower === 'bengaluru') {
            html += `
                <div class="legend-item purple">
                    <div class="line-color"></div>
                    <div class="line-info">
                        <span>Purple Line</span>
                        <small>Whitefield to Kengeri</small>
                    </div>
                </div>
                <div class="legend-item green">
                    <div class="line-color"></div>
                    <div class="line-info">
                        <span>Green Line</span>
                        <small>Yelachenahalli to Nagasandra</small>
                    </div>
                </div>
            `;
        } else if (cityLower === 'mumbai') {
            // FIX: Use Blue class and Blue description for Mumbai Line 1
            html += `<div class="legend-item blue"><div class="line-color"></div><div class="line-info"><span>Blue Line</span><small>Line 1: Versova to Ghatkopar</small></div></div>`;
        } else if (cityLower === 'jaipur') {
            html += `<div class="legend-item pink"><div class="line-color"></div><div class="line-info"><span>Pink Line</span><small>Transport Nagar to Badi Chaupar</small></div></div>`;
        }

        legendDiv.innerHTML = html;
    }

    function updateTimingsBox(city) {
        const timingsBox = document.getElementById('metroTimingsBox');
        if (!timingsBox) return;

        const cityData = METRO_TIMINGS[city.toLowerCase()];
        const cityName = city.toUpperCase();

        if (cityData) {
            timingsBox.innerHTML = `
                <div class="timings-header">METRO TIMINGS</div>
                <ul>
                    <li>
                        <strong>${cityName} Metro</strong>
                        <small>First Train: ${cityData.first}</small>
                        <small>Last Train: ${cityData.last}</small>
                        <small style="color: #fbc02d;">* ${cityData.notes}</small>
                    </li>
                </ul>
            `;
        } else {
            timingsBox.innerHTML = '<div class="timings-header">METRO TIMINGS</div><p style="font-size:13px; color:#aaa; margin:0;">Select a city to view timings.</p>';
        }
    }


    function populateStations(city) {
        fromSelect.innerHTML = '<option value="" disabled selected>Select station</option>';
        toSelect.innerHTML = '<option value="" disabled selected>Select station</option>';
        stationCoords = {};

        const loadingAlert = alertManager.loading('Loading stations...');

        fetch(`/stations?city=${city}`)
            .then(res => res.json())
            .then(stations => {
                loadingAlert.close();
                stations.forEach(station => {
                    fromSelect.add(new Option(station, station));
                    toSelect.add(new Option(station, station));
                    stationCoords[station] = [0, 0];
                });

                fetch(`/data/${city}-metro.json`)
                    .then(res => res.json())
                    .then(data => {
                        metroData = data;
                        Object.keys(data).forEach(station => {
                            stationCoords[station] = [data[station].lat, data[station].lng];
                        });

                        updateLegend(city);
                        updateTimingsBox(city); // Update timings box on successful load
                        alertManager.toastSuccess(`Loaded ${stations.length} stations`);
                    })
                    .catch(err => {
                        alertManager.error('Failed to load metro data.');
                    });
            })
            .catch(error => {
                loadingAlert.close();
                alertManager.error('Failed to load stations');
            });
    }

    citySelect.addEventListener('change', () => {
        const city = citySelect.value;
        if (city) populateStations(city);
    });

    /**
     * Retrieves the line color. No specific override is needed for Mumbai
     * since the data provides 'Blue' and the visual is correct.
     */
    function getLineColor(line, city = citySelect.value) {
        const colors = {
            Red: '#d32f2f',
            Blue: '#1976d2', // This is the color used for Mumbai Line 1 (Aqua/Deep Blue)
            Green: '#388e3c',
            Yellow: '#fbc02d',
            Purple: '#7b1fa2',
            Orange: '#f57c00',
            Pink: '#e91e63'
        };
        // Removed the forced Mumbai -> Red override.
        return colors[line] || '#ffffff';
    }

    // --- Route Calculation ---
    function calculateFare(city, stations) {
        if (stations <= 0) return 0;
        let fare = 0;
        const normalizedCity = city.toLowerCase();

        if (normalizedCity === 'hyderabad') {
            fare = stations <= 3 ? 10 : stations <= 6 ? 15 : stations <= 9 ? 20 : stations <= 12 ? 25 :
                stations <= 15 ? 30 : stations <= 18 ? 35 : stations <= 21 ? 40 : stations <= 24 ? 45 :
                stations <= 27 ? 50 : stations <= 30 ? 55 : 60;
        } else if (normalizedCity === 'chennai') {
            fare = stations <= 2 ? 10 : stations <= 5 ? 20 : stations <= 8 ? 30 : stations <= 11 ? 40 : 50;
        } else if (normalizedCity === 'mumbai') {
            fare = stations <= 3 ? 10 : stations <= 6 ? 20 : stations <= 9 ? 30 : 40;
        } else if (normalizedCity === 'jaipur') {
            fare = stations <= 2 ? 10 : stations <= 5 ? 15 : stations <= 8 ? 20 : stations <= 11 ? 25 : 30;
        } else if (normalizedCity === 'bengaluru') {
            fare = stations <= 2 ? 10 : stations <= 5 ? 15 : stations <= 8 ? 20 : stations <= 11 ? 25 :
                stations <= 14 ? 30 : stations <= 17 ? 35 : stations <= 20 ? 40 : stations <= 23 ? 45 :
                stations <= 26 ? 50 : stations <= 29 ? 55 : 60;
        }

        return fare;
    }

    findBtn.addEventListener('click', () => {
        const from = fromSelect.value;
        const to = toSelect.value;
        const city = citySelect.value;

        if (!city) {
            alertManager.error("Please select a city first.");
            return;
        }
        if (!from || !to) {
            alertManager.error("Please select both source and destination stations.");
            return;
        }
        if (from === to) {
            alertManager.error("Source and destination cannot be the same.");
            return;
        }

        // Start Journey
        window.currentJourney = {
            userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
            fromStation: from,
            toStation: to,
            startTime: new Date(),
            endTime: null,
            route: null,
            totalTime: null,
            fare: null
        };

        alertManager.success(`Journey started from ${from} to ${to}!`);

        // Clear old map layers
        routeLayers.forEach(layer => map.removeLayer(layer));
        allMarkers.forEach(marker => map.removeLayer(marker));
        routeLayers = [];
        allMarkers = [];
        document.getElementById('estimatedTimeDisplay').innerHTML = 'Estimated Time: --';

        const loadingAlert = alertManager.loading('Finding best route...');

        fetch(`/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&city=${encodeURIComponent(city)}`)
            .then(res => res.json())
            .then(async (data) => {
                loadingAlert.close();
                const path = data.path || [];
                if (path.length === 0) {
                    alertManager.error("No valid route found between the selected stations.");
                    return;
                }

                const stationsTraveled = path.length > 1 ? path.length - 1 : 0;
                const fare = calculateFare(city, stationsTraveled);
                const totalTime = Number(data.totalTime) || 0;

                const segments = [];
                let segment = [];
                
                path.forEach((stop, idx) => {
                    const coords = stationCoords[stop.station] || [0,0];
                    segment.push(coords);
                    
                    // Determine the line for the station and marker color
                    let stationLine = stop.line || 'N/A';
                    
                    // FIX: For the starting station, use the line of the *next* station
                    if (idx === 0 && path.length > 1) {
                        stationLine = path[idx + 1].line;
                    }

                    // Get the actual color
                    const actualColor = getLineColor(stationLine, city);

                    // Only show line if a line is available
                    const lineContent = (stationLine && stationLine !== 'N/A') ? `<br>Line: ${stationLine}` : '';
                    const tooltipContent = `<strong>${stop.station}</strong>${lineContent}`;

                    const marker = L.circleMarker(coords, {
                        color: actualColor,
                        radius: 6,
                        weight: 2,
                        fillOpacity: 1
                    }).addTo(map);
                    
                    marker.bindTooltip(tooltipContent, {
                        permanent: true,
                        direction: 'right',
                        className: 'station-tooltip-route'
                    }).openTooltip();
                    
                    allMarkers.push(marker);

                    if (idx < path.length - 1 && path[idx + 1].line !== stop.line) {
                        segments.push({ coords: [...segment], line: stop.line });
                        segment = [coords];
                    }
                });

                if (segment.length > 1) segments.push({ coords: segment, line: path[path.length - 1].line });

                segments.forEach(seg => {
                    // Get the actual color for the polyline segment
                    const polylineColor = getLineColor(seg.line, city);

                    const polyline = L.polyline(seg.coords, {
                        color: polylineColor,
                        weight: 6,
                        opacity: 0.9,
                        smoothFactor: 1
                    }).addTo(map);
                    routeLayers.push(polyline);
                    map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
                });

                for (let i = 0; i < path.length - 1; i++) {
                    const curr = path[i];
                    const next = path[i + 1];
                    const midLat = (stationCoords[curr.station][0] + stationCoords[next.station][0]) / 2;
                    const midLng = (stationCoords[curr.station][1] + stationCoords[next.station][1]) / 2;
                    const time = metroData[curr.station] && metroData[curr.station].neighbors ? metroData[curr.station].neighbors.find(n => n.station === next.station)?.time : null;

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
                if (estDisplay) {
                    estDisplay.innerHTML = `
                        Estimated Time: ${totalTime} min<br>
                        Estimated Fare: ₹${fare}
                    `;
                }

                if (window.currentJourney) {
                    window.currentJourney.route = data.path;
                    window.currentJourney.totalTime = totalTime;
                    window.currentJourney.fare = fare;
                }

                alertManager.toastSuccess(`Route found! ${totalTime} min • ₹${fare}`);
            })
            .catch(error => {
                loadingAlert.close();
                alertManager.error('Failed to find route. Please try again.');
            });
    });

});