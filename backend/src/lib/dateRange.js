function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveRange({ range, from, to }) {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (range === "custom" && from && to) {
    return { start: startOfDay(new Date(from)), end: addDays(startOfDay(new Date(to)), 1) };
  }

  switch (range) {
    case "week": {
      const dayOfWeek = todayStart.getDay();
      const start = addDays(todayStart, -dayOfWeek);
      return { start, end: addDays(todayStart, 1) };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: addDays(todayStart, 1) };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: addDays(todayStart, 1) };
    }
    case "today":
    default:
      return { start: todayStart, end: addDays(todayStart, 1) };
  }
}

module.exports = { resolveRange, startOfDay, addDays };
