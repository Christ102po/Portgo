const { getWeather } = require("../lib/weather");

async function getCurrentWeather(req, res) {
  const weather = await getWeather();
  res.json({ weather });
}

module.exports = { getCurrentWeather };
