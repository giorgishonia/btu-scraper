const express = require("express");
const { BTUParser } = require("./BTUParser");
const admin = require("firebase-admin");
const cors = require("cors");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BTU Schedule Scraper API");
});

app.get("/api/schedule", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const parser = new BTUParser();
    const schedule = await parser.init();

    if (schedule && Object.keys(schedule).length > 0) {
      await admin.firestore().collection("schedules").doc(userId).set({
        schedule,
        updatedAt: new Date().toISOString(),
        userId,
      });

      return res.json({ schedule, success: true });
    }

    throw new Error("Schedule parsing incomplete");
  } catch (error) {
    console.error("Error during schedule scraping:", error);
    res
      .status(500)
      .json({ error: error.message || "An unknown error occurred" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
