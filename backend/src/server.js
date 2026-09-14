require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { verifyMailer } = require("./lib/mailer");
const { verifySemaphoreConfiguration } = require("./lib/semaphore");

const authRoutes = require("./routes/auth.routes");
const otpRoutes = require("./routes/otp.routes");
const passengersRoutes = require("./routes/passengers.routes");
const shipsRoutes = require("./routes/ships.routes");
const schedulesRoutes = require("./routes/schedules.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const recordsRoutes = require("./routes/records.routes");
const reportsRoutes = require("./routes/reports.routes");
const checkinRoutes = require("./routes/checkin.routes");
const advisoryRoutes = require("./routes/advisory.routes");
const adminsRoutes = require("./routes/admins.routes");
const auditLogsRoutes = require("./routes/auditLogs.routes");
const vehiclesRoutes = require("./routes/vehicles.routes");
const displayRoutes = require("./routes/display.routes");
const familyBookingsRoutes = require("./routes/familyBookings.routes");
const ticketsRoutes = require("./routes/tickets.routes");
const devRoutes = require("./routes/dev.routes");
const watchlistRoutes = require("./routes/watchlist.routes");
const weatherRoutes = require("./routes/weather.routes");
const barangayResidentsRoutes = require("./routes/barangayResidents.routes");

const app = express();

// Allow the admin/kiosk frontend from localhost AND any device on the local
// network (phones/tablets hitting the PC's LAN IP). Explicit origins can still
// be pinned via CORS_ORIGIN (comma-separated); anything on a private IP range
// or localhost is allowed automatically during development.
const explicitOrigins = new Set(
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)
);

if (process.env.PUBLIC_APP_URL) {
  explicitOrigins.add(process.env.PUBLIC_APP_URL.trim().replace(/\/$/, ""));
}
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  explicitOrigins.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

const privateHostRegex =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, mobile app shells) send no Origin header.
      if (!origin) return callback(null, true);
      if (explicitOrigins.has(origin.replace(/\/$/, "")) || privateHostRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/passengers", passengersRoutes);
app.use("/api/ships", shipsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/records", recordsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/advisory", advisoryRoutes);
app.use("/api/admins", adminsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/display", displayRoutes);
app.use("/api/family-bookings", familyBookingsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/barangay-residents", barangayResidentsRoutes);

// In production Railway builds the Vite app into frontend/dist. Serving it
// here keeps the whole system on one HTTPS domain, which simplifies mobile use,
// CORS, QR links and API configuration.
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT} (reachable from LAN devices)`);
  verifyMailer();

  verifySemaphoreConfiguration()
    .then((status) => {
      if (status.ok) {
        console.log(
          `[Semaphore] Connected. Account status: ${status.accountStatus}; ` +
            `credits: ${status.creditBalance ?? "unknown"}; sender: ${status.senderName}`
        );
      } else {
        console.error(`[Semaphore] Configuration problem: ${status.message}`);
      }
    })
    .catch((error) => {
      console.error(`[Semaphore] Configuration check failed: ${error?.message || error}`);
    });
});