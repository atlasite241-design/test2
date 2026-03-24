import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import express from "express";
import cors from "cors";
import pool, { query } from "./services/db.js";

async function initDb() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Technicien',
        status TEXT NOT NULL DEFAULT 'active',
        security_question TEXT,
        security_answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add status column if it doesn't exist (for existing databases)
    try {
      await query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
      await query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS security_question TEXT");
      await query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS security_answer TEXT");
      await query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS current_session_id TEXT");
    } catch (e) {
      console.log("Columns already exist or error adding them");
    }

    await query(`
      CREATE TABLE IF NOT EXISTS ont_records (
        id TEXT PRIMARY KEY,
        msan TEXT,
        location TEXT,
        sn TEXT,
        version TEXT,
        vendor_id TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS huawei_records (
        id TEXT PRIMARY KEY,
        msan TEXT,
        location TEXT,
        sn TEXT,
        version TEXT,
        vendor_id TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS user_logs (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        login_time TIMESTAMP NOT NULL,
        logout_time TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0,
        ip_address TEXT,
        city TEXT
      );
    `);

    // Add ip_address and city columns if they don't exist
    try {
      await query("ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS ip_address TEXT");
      await query("ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS city TEXT");
    } catch (e) {
      console.log("Columns already exist or error adding them");
    }
    
    // Create default admin if not exists
    const adminCheck = await query("SELECT * FROM utilisateurs WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      await query(
        "INSERT INTO utilisateurs (username, password, role) VALUES ($1, $2, $3)",
        ["admin", "admin", "Super Admin"]
      );
      console.log("Default admin created");
    }
    
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
    // Do not crash the server, but log the error. 
    // The app will start, but DB calls will fail.
  }
}

const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Request logger and path normalization
  app.use((req, res, next) => {
    // Normalize path: remove double slashes but keep the first one
    if (req.url.includes('//')) {
      const oldUrl = req.url;
      req.url = req.url.replace(/\/+/g, '/');
      console.log(`Normalized URL: ${oldUrl} -> ${req.url}`);
    }
    
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Robust CORS configuration
  app.use(cors({
    origin: '*', // Allow all origins (including Netlify)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Enable pre-flight requests for all routes
  app.options(/.*/, cors());
  
  app.use(express.json({ limit: '50mb' }));

  // In-memory connected users tracking: userId -> last seen timestamp
  const connectedUsers = new Map<number, number>();

  // API Health check
  app.get("/api/health", (req, res) => {
    res.status(200).send("ONT Finder Pro API is running");
  });

  // Simple test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "API is reachable on Vercel!" });
  });

  // Heartbeat endpoint
  app.post("/api/users/heartbeat", async (req, res) => {
    const { userId, sessionId } = req.body;
    if (userId) {
      connectedUsers.set(userId, Date.now());
      
      // Check if session is still valid
      if (sessionId) {
        try {
          const result = await query("SELECT current_session_id FROM utilisateurs WHERE id = $1", [userId]);
          if (result.rows.length > 0 && result.rows[0].current_session_id !== sessionId) {
            return res.json({ success: false, message: "Session expirée ou connectée ailleurs", sessionValid: false });
          }
        } catch (err) {
          console.error("Heartbeat session check error:", err);
        }
      }
    }
    res.json({ success: true, sessionValid: true });
  });

  // Stats endpoint
  app.get("/api/users/stats", async (req, res) => {
    try {
      // Clean up stale users (not seen in last 15 seconds)
      const now = Date.now();
      let activeCount = 0;
      for (const [id, lastSeen] of connectedUsers.entries()) {
        if (now - lastSeen > 15000) {
          connectedUsers.delete(id);
        } else {
          activeCount++;
        }
      }

      const pendingResult = await query("SELECT COUNT(*) FROM utilisateurs WHERE status = 'pending'");
      const pendingCount = parseInt(pendingResult.rows[0].count, 10);

      res.json({ success: true, connectedUsers: activeCount, pendingUsers: pendingCount });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    console.log("Login attempt:", req.body.username);
    const { username, password } = req.body;
    try {
      const result = await query(
        "SELECT * FROM utilisateurs WHERE username = $1 AND password = $2",
        [username, password]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        if (user.status === 'blocked') {
          return res.json({ success: false, message: "Votre compte est bloqué. Veuillez contacter l'administrateur.", status: 'blocked' });
        }
        
        if (user.status === 'pending') {
          return res.json({ success: false, message: "Votre compte est en attente d'approbation par l'administrateur.", status: 'pending' });
        }

        // Check if user is already connected
        const now = Date.now();
        const lastSeen = connectedUsers.get(user.id);
        if (lastSeen && (now - lastSeen < 15000)) {
          return res.json({ 
            success: false, 
            message: "Ce compte est déjà connecté sur un autre terminal. Veuillez patienter ou vous déconnecter de l'autre session.",
            status: 'already_connected'
          });
        }

        // Generate new session ID
        const newSessionId = Date.now().toString() + Math.random().toString(36).substring(2);
        await query("UPDATE utilisateurs SET current_session_id = $1 WHERE id = $2", [newSessionId, user.id]);

        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            status: user.status,
            sessionId: newSessionId 
          } 
        });
      } else {
        res.json({ success: false, message: "Identifiant ou mot de passe incorrect" });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Initialize DB
  initDb().catch(console.error);

  app.post("/api/auth/register/bulk", async (req, res) => {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.json({ success: false, message: "Invalid users" });
    }
    try {
      await query("BEGIN");
      
      const chunkSize = 1000;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        const values: any[] = [];
        const placeholders = chunk.map((user, index) => {
          const offset = index * 3;
          values.push(user.username, user.password, user.role || 'Technicien');
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        }).join(",");
        
        await query(
          `INSERT INTO utilisateurs (username, password, role) VALUES ${placeholders} ON CONFLICT (username) DO NOTHING`,
          values
        );
      }
      
      await query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await query("ROLLBACK");
      console.error("Bulk register error:", err);
      res.status(500).json({ success: false, message: "Erreur lors de la création groupée" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password, role, securityQuestion, securityAnswer } = req.body;
    try {
      const result = await query(
        "INSERT INTO utilisateurs (username, password, role, security_question, security_answer, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [username, password, role || 'Technicien', securityQuestion, securityAnswer, 'pending']
      );
      res.json({ 
        success: true, 
        message: "Compte créé avec succès. En attente d'approbation.",
        user: {
          id: result.rows[0].id.toString(),
          username,
          role: role || 'Technicien',
          status: 'pending'
        }
      });
    } catch (err: any) {
      if (err.code === '23505') {
        res.json({ success: false, message: "Ce nom d'utilisateur est déjà pris" });
      } else {
        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Erreur lors de la création du compte" });
      }
    }
  });

  app.post("/api/auth/recovery/question", async (req, res) => {
    const { username } = req.body;
    try {
      const result = await query("SELECT security_question FROM utilisateurs WHERE username = $1", [username]);
      if (result.rows.length > 0) {
        res.json({ success: true, question: result.rows[0].security_question });
      } else {
        res.json({ success: false, message: "Utilisateur non trouvé" });
      }
    } catch (err) {
      console.error("Recovery question error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/recovery/verify", async (req, res) => {
    const { username, answer } = req.body;
    try {
      const result = await query(
        "SELECT * FROM utilisateurs WHERE username = $1 AND security_answer = $2",
        [username, answer]
      );
      if (result.rows.length > 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Réponse incorrecte" });
      }
    } catch (err) {
      console.error("Recovery verify error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/recovery/reset", async (req, res) => {
    const { username, password } = req.body;
    try {
      await query(
        "UPDATE utilisateurs SET password = $1 WHERE username = $2",
        [password, username]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Recovery reset error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // User Management Routes
  app.get("/api/users", async (req, res) => {
    try {
      const result = await query("SELECT id, username, role, status, created_at as \"createdAt\" FROM utilisateurs ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err: any) {
      console.error("Get users error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
    }
  });

  app.post("/api/users/admin-create", async (req, res) => {
    const { username, password, role } = req.body;
    try {
      await query(
        "INSERT INTO utilisateurs (username, password, role, status) VALUES ($1, $2, $3, $4)",
        [username, password, role || 'Technicien', 'active']
      );
      res.json({ success: true });
    } catch (err: any) {
      if (err.code === '23505') {
        res.json({ success: false, message: "Ce nom d'utilisateur est déjà pris" });
      } else {
        console.error("Admin create user error:", err);
        res.status(500).json({ success: false, message: "Erreur lors de la création du compte" });
      }
    }
  });

  app.patch("/api/users/:username/status", async (req, res) => {
    const { username } = req.params;
    const { status } = req.body;
    if (username === 'admin') {
      return res.json({ success: false, message: "Impossible de modifier le statut de l'administrateur par défaut" });
    }
    try {
      await query("UPDATE utilisateurs SET status = $1 WHERE username = $2", [status, username]);
      res.json({ success: true });
    } catch (err) {
      console.error("Update status error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  app.get("/api/users/:username/status", async (req, res) => {
    const { username } = req.params;
    const sessionId = req.query.sessionId;

    try {
      const result = await query("SELECT status, current_session_id FROM utilisateurs WHERE username = $1", [username]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
      }

      const user = result.rows[0];
      const sessionValid = !sessionId || user.current_session_id === sessionId;

      res.json({ 
        success: true, 
        status: user.status, 
        sessionValid 
      });
    } catch (err) {
      console.error("Check status error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Log connection
  app.post("/api/logs", async (req, res) => {
    const { username, loginTime, logoutTime, durationMinutes } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    let city = "Localisation inconnue";
    try {
      // Use a free geoip service
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        city = geoData.city || "Inconnue";
      }
    } catch (e) {
      console.error("GeoIP error:", e);
    }

    try {
      await query(
        "INSERT INTO user_logs (username, login_time, logout_time, duration_minutes, ip_address, city) VALUES ($1, $2, $3, $4, $5, $6)",
        [username, loginTime, logoutTime, durationMinutes, String(ip), city]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Log error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Get logs
  app.get("/api/logs", async (req, res) => {
    try {
      const result = await query("SELECT * FROM user_logs ORDER BY login_time DESC");
      res.json(result.rows);
    } catch (err) {
      console.error("Get logs error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  app.delete("/api/users/:username", async (req, res) => {
    const { username } = req.params;
    if (username === 'admin') {
      return res.json({ success: false, message: "Impossible de supprimer l'administrateur par défaut" });
    }
    try {
      await query("DELETE FROM utilisateurs WHERE username = $1", [username]);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  app.patch("/api/users/:username/role", async (req, res) => {
    const { username } = req.params;
    const { role } = req.body;
    if (username === 'admin') {
      return res.json({ success: false, message: "Impossible de modifier le rôle de l'administrateur par défaut" });
    }
    try {
      await query("UPDATE utilisateurs SET role = $1 WHERE username = $2", [role, username]);
      res.json({ success: true });
    } catch (err) {
      console.error("Update role error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // ONT Records Routes
  app.get("/api/ont-data", async (req, res) => {
    try {
      const result = await query("SELECT id, msan, location, sn, version, vendor_id as \"vendorId\", status FROM ont_records");
      res.json({ records: result.rows, lastUpdated: new Date().toLocaleString() });
    } catch (err) {
      console.error("Get ONT data error:", err);
      res.status(500).json({ success: false, message: "Erreur lors de la récupération des données" });
    }
  });

  app.post("/api/ont-data", async (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.json({ success: false, message: "Invalid records" });
    }
    try {
      await query("BEGIN");
      // For simplicity, we clear and re-insert. In a real app, we'd do upserts.
      await query("DELETE FROM ont_records");
      
      const chunkSize = 1000;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const values: any[] = [];
        const placeholders = chunk.map((record, index) => {
          const offset = index * 7;
          values.push(record.id, record.msan, record.location, record.sn, record.version, record.vendorId, record.status);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
        }).join(",");
        
        await query(
          `INSERT INTO ont_records (id, msan, location, sn, version, vendor_id, status) VALUES ${placeholders}`,
          values
        );
      }
      
      await query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await query("ROLLBACK");
      console.error("Save ONT data error:", err);
      res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde des données" });
    }
  });

  app.delete("/api/ont-data", async (req, res) => {
    try {
      await query("DELETE FROM ont_records");
      res.json({ success: true });
    } catch (err) {
      console.error("Delete ONT data error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // Huawei Records Routes
  app.get("/api/huawei-data", async (req, res) => {
    try {
      const result = await query("SELECT id, msan, location, sn, version, vendor_id as \"vendorId\", status FROM huawei_records");
      const lastUpdatedResult = await query("SELECT MAX(created_at) as \"lastUpdated\" FROM huawei_records");
      const lastUpdated = lastUpdatedResult.rows[0].lastUpdated;
      res.json({ 
        records: result.rows, 
        lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleString() : null 
      });
    } catch (err) {
      console.error("Get Huawei data error:", err);
      res.status(500).json({ success: false, message: "Erreur lors de la récupération des données" });
    }
  });

  app.post("/api/huawei-data", async (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.json({ success: false, message: "Invalid records" });
    }
    console.log("Received huawei-data POST request. Records count:", records.length);
    try {
      let addedCount = 0;
      await query("BEGIN");
      
      const chunkSize = 1000;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const values: any[] = [];
        const placeholders = chunk.map((record, index) => {
          const offset = index * 7;
          values.push(record.id, record.msan, record.location, record.sn, record.version, record.vendorId, record.status);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
        }).join(",");
        
        const result = await query(
          `INSERT INTO huawei_records (id, msan, location, sn, version, vendor_id, status) 
           VALUES ${placeholders} 
           ON CONFLICT (id) DO NOTHING`,
          values
        );
        if (result.rowCount) {
          addedCount += result.rowCount;
        }
      }
      
      await query("COMMIT");
      console.log("Transfer complete. Added count:", addedCount);
      res.json({ success: true, addedCount });
    } catch (err) {
      await query("ROLLBACK");
      console.error("Save Huawei data error:", err);
      res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde des données" });
    }
  });

  app.delete("/api/huawei-data", async (req, res) => {
    try {
      await query("DELETE FROM huawei_records");
      res.json({ success: true });
    } catch (err) {
      console.error("Delete Huawei data error:", err);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  });

  // API 404 handler - catch-all for unmatched /api routes
  app.all("/api/*", (req, res) => {
    console.log(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ 
      success: false, 
      message: `Route ${req.method} ${req.url} not found`,
      error: "API_NOT_FOUND"
    });
  });

  // Global error handler for API routes
  app.use("/api/*", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
      error: "API_ERROR"
    });
  });

  if (!process.env.VERCEL) {
    async function startViteAndListen() {
      // Vite middleware for development
      if (process.env.NODE_ENV !== "production") {
        const viteModule = "vite";
        const { createServer: createViteServer } = await import(viteModule);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        app.use(express.static("dist"));
      }

      // Handle SPA fallback for production
      if (process.env.NODE_ENV === "production") {
        app.get('*', (req, res) => {
          if (req.url.startsWith('/api/')) {
            return res.status(404).json({ success: false, message: "API not found" });
          }
          res.sendFile("index.html", { root: "dist" });
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log("Database connected successfully.");
      });
    }
    startViteAndListen();
  }

export default app;
