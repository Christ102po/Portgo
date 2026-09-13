function parseTimeToMinutes(value) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  if (ampm) {
    ampm = ampm.toUpperCase();
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

module.exports = { parseTimeToMinutes, currentMinutesOfDay };
