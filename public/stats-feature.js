// stats-feature.js (Streamlined to render only the original 4 charts)
document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on the dedicated stats page by looking for a unique element
  if (!document.getElementById("monthlyChart")) {
    return;
  }
  
  // --- WAIT FOR AUTHENTICATION STATE BEFORE PROCEEDING ---
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      // If user is not logged in after check, show alert and redirect
      alertManager.error("Please log in to view analytics.", "Authentication Required");
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
      return;
    }

    // --- USER IS LOGGED IN: PROCEED TO RENDER CHARTS ---
    const monthlyChartCanvas = document.getElementById("monthlyChart");
    const farePieChartCanvas = document.getElementById("farePieChart");
    const dailyChartCanvas = document.getElementById("dailyChart");
    const stationChartCanvas = document.getElementById("stationChart");
    
    let monthlyChart, farePieChart, dailyChart, stationChart;
    const userId = user.uid;
    
    // --- Core Data Fetching ---
    async function fetchTravelHistory(uid) {
      const loadingAlert = alertManager.loading('Fetching all travel data...');
      try {
          const snapshot = await firebase.firestore()
            .collection("journeys")
            .where("userId", "==", uid)
            .get();
          
          loadingAlert.close();
          if (snapshot.empty) {
              alertManager.info("No travel data found.", "No Trips Logged");
              return [];
          }

          alertManager.toastSuccess(`Loaded ${snapshot.docs.length} trip records.`);
          return snapshot.docs.map(doc => {
            const data = doc.data();
            const date = data.startTime && data.startTime.toDate ? data.startTime.toDate().toISOString().slice(0,10) : new Date().toISOString().slice(0,10);

            return {
              from: data.fromStation,
              to: data.toStation,
              date: date,
              // Ensure values are explicitly converted to Number
              fare: Number(data.fare) || 0,
              totalTime: Number(data.totalTime) || 0
            };
          });
      } catch (error) {
          loadingAlert.close();
          console.error("Analytics fetch error:", error);
          alertManager.error("Failed to load statistics: " + error.message);
          return [];
      }
    }

    const trips = await fetchTravelHistory(userId);
    if (trips.length === 0) return;


    // --- Data Processing Functions (Original 4) ---
    function getMonthlyStats(trips) {
      const monthStats = {};
      trips.forEach(trip => {
        const month = trip.date.slice(0,7);
        if(!monthStats[month]){ monthStats[month] = { trips: 0, totalFare: 0 }; }
        monthStats[month].trips += 1;
        monthStats[month].totalFare += trip.fare;
      });
      return monthStats;
    }
    
    function getDailyStats(trips) {
      const dayStats = {};
      trips.forEach(trip => {
        const day = trip.date;
        if(!dayStats[day]) dayStats[day] = 0;
        dayStats[day] += 1;
      });
      return dayStats;
    }
    
    function getStationStats(trips) {
      const stationCounts = {};
      trips.forEach(trip => {
        const from = trip.from;
        const to = trip.to;
        if(from) stationCounts[from] = (stationCounts[from] || 0) + 1;
        if(to && from !== to) stationCounts[to] = (stationCounts[to] || 0) + 1;
      });
      return stationCounts;
    }

    // --- Chart Rendering ---
    
    // Chart.js Default Settings (Dark Theme)
    Chart.defaults.color = '#ccc';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, 
        plugins: {
            legend: { labels: { color: '#ccc' } },
            title: { display: false },
            tooltip: { enabled: true }
        },
        scales: {
            x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
        }
    };
    
    // 1. Monthly Trips Chart (Bar)
    (function renderMonthlyChart() {
      const monthStats = getMonthlyStats(trips);
      const labels = Object.keys(monthStats).sort();
      const data = labels.map(m => monthStats[m].trips);

      monthlyChart = new Chart(monthlyChartCanvas, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Number of Trips', data, backgroundColor: 'rgba(54, 162, 235, 0.7)' }] },
        options: { ...chartOptions, scales: { x: { ...chartOptions.scales.x }, y: { ...chartOptions.scales.y, beginAtZero: true } }, plugins: { ...chartOptions.plugins, legend: { display: false } } }
      });
    })();

    // 2. Fare Distribution Chart (Pie)
    (function renderFarePieChart() {
      const monthStats = getMonthlyStats(trips);
      const labels = Object.keys(monthStats).sort();
      const data = labels.map(m => monthStats[m].totalFare);

      farePieChart = new Chart(farePieChartCanvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Fare Spent (₹)',
            data: data,
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)'
            ]
          }]
        },
        options: { ...chartOptions, scales: {}, plugins: { ...chartOptions.plugins } }
      });
    })();

    // 3. Daily Trips Chart (Line)
    (function renderDailyChart() {
      const dayStats = getDailyStats(trips);
      const labels = Object.keys(dayStats).sort();
      const data = labels.map(d => dayStats[d]);

      dailyChart = new Chart(dailyChartCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Trips per Day', data, backgroundColor: 'rgba(255, 159, 64, 0.7)', borderColor: 'rgba(255, 159, 64, 1)', tension: 0.3, fill: true }] },
        options: { ...chartOptions, scales: { x: { ...chartOptions.scales.x }, y: { ...chartOptions.scales.y, beginAtZero: true } }, plugins: { ...chartOptions.plugins, legend: { display: false } } }
      });
    })();
    
    // 4. Most Visited Stations Chart (Doughnut)
    (function renderStationChart() {
      const stationStats = getStationStats(trips);
      const sortedStations = Object.entries(stationStats).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const labels = sortedStations.map(s=>s[0]);
      const data = sortedStations.map(s=>s[1]);

      stationChart = new Chart(stationChartCanvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ label: 'Visits', data, backgroundColor: [
          'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199,0.8)', 'rgba(83,102,255,0.8)', 'rgba(255,102,255,0.8)', 'rgba(102,255,102,0.8)'
        ] }] },
        options: { ...chartOptions, scales: {}, plugins: { ...chartOptions.plugins, legend: { position: 'right', labels: { color: '#ccc' } } } }
      });
    })();
    
  }); // End of onAuthStateChanged
}); // End of DOMContentLoaded