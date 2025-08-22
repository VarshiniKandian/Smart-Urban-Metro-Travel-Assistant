document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById("hamburger");
  const menuOptions = document.getElementById("menuOptions");
  const chartContainer = document.getElementById("chartContainer");
  const monthlyChartCanvas = document.getElementById("monthlyChart");
  const farePieChartCanvas = document.getElementById("farePieChart");
  const mapDiv = document.getElementById("map");

  let monthlyChart, farePieChart;

  // Toggle hamburger menu
  hamburger.addEventListener('click', () => {
    menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
  });

  // Hide menu when clicking outside
  window.addEventListener('click', (e) => {
    if (!menuOptions.contains(e.target) && e.target !== hamburger && !chartContainer.contains(e.target)) {
      menuOptions.style.display = 'none';
      chartContainer.style.display = 'none';
      if(monthlyChart) monthlyChart.destroy();
      if(farePieChart) farePieChart.destroy();
    }
  });

  // Hide chart when clicking on the map
  mapDiv.addEventListener('click', () => {
    chartContainer.style.display = 'none';
    if(monthlyChart) monthlyChart.destroy();
    if(farePieChart) farePieChart.destroy();
  });

  // Fetch user's journeys from Firestore
  async function fetchTravelHistory(userId) {
    const snapshot = await firebase.firestore()
      .collection("journeys")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        from: data.fromStation,
        to: data.toStation,
        date: data.startTime.toDate().toISOString().slice(0,10),
        fare: data.fare || 0,
        totalTime: data.totalTime || 0
      };
    });
  }

  // Process monthly stats
  function getMonthlyStats(trips) {
    const monthStats = {};
    trips.forEach(trip => {
      const month = trip.date.slice(0,7);
      if(!monthStats[month]){
        monthStats[month] = { trips: 0, totalFare: 0 };
      }
      monthStats[month].trips += 1;
      monthStats[month].totalFare += trip.fare;
    });
    return monthStats;
  }

  // Process daily stats
  function getDailyStats(trips) {
    const dayStats = {};
    trips.forEach(trip => {
      const day = trip.date;
      if(!dayStats[day]) dayStats[day] = 0;
      dayStats[day] += 1;
    });
    return dayStats;
  }

  // Process station stats
  function getStationStats(trips) {
    const stationCounts = {};
    trips.forEach(trip => {
      if(trip.from) stationCounts[trip.from] = (stationCounts[trip.from] || 0) + 1;
      if(trip.to) stationCounts[trip.to] = (stationCounts[trip.to] || 0) + 1;
    });
    return stationCounts;
  }

  // Show monthly bar chart
  async function showMonthlyChart() {
    chartContainer.style.display = 'block';
    const userId = firebase.auth().currentUser.uid;
    const trips = await fetchTravelHistory(userId);
    const monthStats = getMonthlyStats(trips);

    const labels = Object.keys(monthStats).sort();
    const data = labels.map(m => monthStats[m].trips);

    if(monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(monthlyChartCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Number of Trips', data, backgroundColor: 'rgba(54, 162, 235, 0.7)' }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index', intersect: false } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });
  }

  // Show fare distribution pie chart
  async function showFarePieChart() {
    chartContainer.style.display = 'block';
    const userId = firebase.auth().currentUser.uid;
    const trips = await fetchTravelHistory(userId);
    const monthStats = getMonthlyStats(trips);

    const labels = Object.keys(monthStats).sort();
    const data = labels.map(m => monthStats[m].totalFare);

    if(farePieChart) farePieChart.destroy();

    farePieChart = new Chart(farePieChartCanvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          label: 'Fare Distribution',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ]
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true } } }
    });
  }

  // Show daily trips bar chart
  async function showDailyChart() {
    chartContainer.style.display = 'block';
    const userId = firebase.auth().currentUser.uid;
    const trips = await fetchTravelHistory(userId);
    const dayStats = getDailyStats(trips);

    const labels = Object.keys(dayStats).sort();
    const data = labels.map(d => dayStats[d]);

    if(monthlyChart) monthlyChart.destroy();
    if(farePieChart) farePieChart.destroy();

    monthlyChart = new Chart(monthlyChartCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Trips per Day', data, backgroundColor: 'rgba(255, 159, 64, 0.7)' }] },
      options: { responsive: true, plugins: { legend: { display: false }, tooltip: { enabled: true } }, interaction: { mode: 'nearest', axis: 'x', intersect: false } }
    });
  }

  // Show top stations pie chart
  async function showStationChart() {
    chartContainer.style.display = 'block';
    const userId = firebase.auth().currentUser.uid;
    const trips = await fetchTravelHistory(userId);
    const stationStats = getStationStats(trips);

    const sortedStations = Object.entries(stationStats).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const labels = sortedStations.map(s=>s[0]);
    const data = sortedStations.map(s=>s[1]);

    if(farePieChart) farePieChart.destroy();
    if(monthlyChart) monthlyChart.destroy();

    farePieChart = new Chart(farePieChartCanvas, {
      type: 'pie',
      data: { labels, datasets: [{ label: 'Number of times visited', data, backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(199, 199, 199,0.6)',
        'rgba(83,102,255,0.6)',
        'rgba(255,102,255,0.6)',
        'rgba(102,255,102,0.6)'
      ] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true } } }
    });
  }

  // Event listeners for menu options
  document.getElementById("monthlyStatsOption").addEventListener("click", showMonthlyChart);
  document.getElementById("fareStatsOption").addEventListener("click", showFarePieChart);

  const ul = menuOptions.querySelector("ul");

  const dailyLi = document.createElement("li");
  dailyLi.innerText = "Daily Travel Stats";
  dailyLi.id = "dailyStatsOption";
  ul.appendChild(dailyLi);

  const topStationsLi = document.createElement("li");
  topStationsLi.innerText = "Most Visited Stations";
  topStationsLi.id = "topStationsOption";
  ul.appendChild(topStationsLi);

  document.getElementById("dailyStatsOption").addEventListener("click", showDailyChart);
  document.getElementById("topStationsOption").addEventListener("click", showStationChart);
});
