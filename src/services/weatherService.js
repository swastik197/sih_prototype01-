const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');
let districts = {};
try {
  districts = require('../data/districts.json');
} catch (e) {
  logger.warn('districts.json not found. Using city name directly for weather API.');
}

/**
 * Generate simulated weather data for demo (Indian monsoon season)
 */
function getSimulatedWeather(district) {
  const baseTemp = 28 + Math.random() * 8; // 28-36°C
  const rainfall = Math.random() > 0.3 ? Math.round(Math.random() * 60) : 0;

  const conditions = ['Clear sky', 'Partly cloudy', 'Light rain', 'Moderate rain', 'Heavy rain', 'Thunderstorm'];
  const todayCondition = rainfall > 40 ? 'Heavy rain' : rainfall > 15 ? 'Moderate rain' : rainfall > 0 ? 'Light rain' : 'Partly cloudy';

  const today = new Date();
  const next3Days = [];
  for (let i = 1; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayRain = Math.random() > 0.3 ? Math.round(Math.random() * 55) : 0;
    next3Days.push({
      date: date.toISOString().split('T')[0],
      maxTemp: Math.round(baseTemp + Math.random() * 4),
      minTemp: Math.round(baseTemp - 4 - Math.random() * 3),
      rainfall: dayRain,
      conditions: dayRain > 40 ? 'Heavy rain' : dayRain > 15 ? 'Moderate rain' : dayRain > 0 ? 'Light rain' : conditions[Math.floor(Math.random() * 3)]
    });
  }

  const alerts = [];
  if (rainfall > 50) alerts.push('Heavy rainfall expected today');
  next3Days.forEach(d => {
    if (d.rainfall > 50) alerts.push(`Heavy rainfall expected on ${d.date}`);
    if (d.maxTemp > 42) alerts.push(`Heat wave warning on ${d.date}`);
  });

  return {
    current: { temp: Math.round(baseTemp), humidity: 65 + Math.round(Math.random() * 25), description: todayCondition, rainfall },
    today: { maxTemp: Math.round(baseTemp + 3), minTemp: Math.round(baseTemp - 5), totalRainfall: rainfall, conditions: todayCondition },
    next3Days,
    alerts,
    raw: null
  };
}

/**
 * Process raw OpenWeatherMap 5-day forecast data into structured format
 */
function processApiData(data) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Group forecast points by date
  const dayGroups = {};
  for (const point of data.list) {
    const dateStr = point.dt_txt.split(' ')[0];
    if (!dayGroups[dateStr]) dayGroups[dateStr] = [];
    dayGroups[dateStr].push(point);
  }

  // Process each day
  const processDay = (points) => {
    let maxTemp = -Infinity, minTemp = Infinity, totalRainfall = 0, maxWind = 0;
    const conditionCounts = {};

    for (const p of points) {
      maxTemp = Math.max(maxTemp, p.main.temp_max);
      minTemp = Math.min(minTemp, p.main.temp_min);
      totalRainfall += (p.rain ? p.rain['3h'] || 0 : 0);
      maxWind = Math.max(maxWind, p.wind.speed);
      const cond = p.weather[0].main;
      conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
    }

    const dominantCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0][0];

    return {
      maxTemp: Math.round(maxTemp),
      minTemp: Math.round(minTemp),
      rainfall: Math.round(totalRainfall),
      conditions: dominantCondition,
      maxWind: Math.round(maxWind)
    };
  };

  // Current conditions (first data point)
  const first = data.list[0];
  const current = {
    temp: Math.round(first.main.temp),
    humidity: first.main.humidity,
    description: first.weather[0].description,
    rainfall: first.rain ? Math.round(first.rain['3h'] || 0) : 0
  };

  // Today
  const todayData = dayGroups[todayStr] ? processDay(dayGroups[todayStr]) : { maxTemp: current.temp + 2, minTemp: current.temp - 4, rainfall: current.rainfall, conditions: first.weather[0].main };

  // Next 3 days
  const sortedDates = Object.keys(dayGroups).sort().filter(d => d > todayStr).slice(0, 3);
  const next3Days = sortedDates.map(date => ({
    date,
    ...processDay(dayGroups[date])
  }));

  // Generate alerts
  const alerts = [];
  const allDays = [{ ...todayData, date: todayStr }, ...next3Days];
  for (const day of allDays) {
    if (day.rainfall > 50) alerts.push(`Heavy rainfall (${day.rainfall}mm) expected on ${day.date}`);
    if (day.maxTemp > 42) alerts.push(`Heat wave (${day.maxTemp}°C) warning on ${day.date}`);
    if (day.minTemp < 5) alerts.push(`Frost risk (${day.minTemp}°C) on ${day.date}`);
    if (day.maxWind > 15) alerts.push(`Strong winds on ${day.date}`);
  }

  return { current, today: todayData, next3Days, alerts, raw: data };
}

/**
 * Get weather forecast for a district
 * Falls back to simulated data if API key is missing or call fails
 */
async function getWeatherForecast(districtName) {
  if (!districtName) return getSimulatedWeather('unknown');

  const districtKey = districtName.toLowerCase();

  // Try real API first
  if (config.openWeatherApiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(districtName)},IN&appid=${config.openWeatherApiKey}&units=metric`;
      const response = await axios.get(url, { timeout: 10000 });
      logger.info(`Weather data fetched for ${districtName}`);
      return processApiData(response.data);
    } catch (error) {
      logger.warn(`Weather API failed for ${districtName}: ${error.message}. Using simulated data.`);
    }
  }

  // Fallback to simulated data
  logger.info(`Using simulated weather data for ${districtName}`);
  return getSimulatedWeather(districtName);
}

module.exports = { getWeatherForecast, getSimulatedWeather };
