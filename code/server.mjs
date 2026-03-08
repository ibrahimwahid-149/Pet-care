// Import required libraries for the server
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import session from "express-session";
import multer from "multer";
import axios from "axios";

// Store the student id used for all routes
const STUDENT_ID = "M01010179";
// Create the express application
const app = express();
// Enable json parsing for incoming requests
app.use(express.json());
// Enable cors so the frontend can communicate with the server
app.use(cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    methods: ["GET", "POST", "DELETE"],
    credentials: true
})
);
// Uploaded images will be as static files
app.use("/uploads", express.static("uploads"));

// Configure multer for post image uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "uploads/");
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + "-" + file.originalname);
        }
    })
});
// Configure multer for profile picture uploads
const profileUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "uploads/");
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + "-" + file.originalname);
        }
    })
});

app.use(
    session({
        secret: "petcare-secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: false,
            sameSite: "lax"
        }
    })
);

// Define server port and database connection details
const PORT = 8080;
const mongoURL = "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoURL);

let db, users, posts, follows;

// Register a new user account
app.post(`/${STUDENT_ID}/users`, async (req, res) => {
    const { username, email, password } = req.body;
    // Validate required fields
    if (!username || !email || !password) {
        return res.json({ success: false, message: "All fields required" });
    }
    // Check if the email is already registered
    const existing = await users.findOne({ email });
    if (existing) {
        return res.json({ success: false, message: "Email already registered" });
    }
    // Insert the new user into the database
    await users.insertOne({
        username,
        email,
        password,
        profilePic: null   
    });

    req.session.user = {
        username,
        email,
        profilePic: null
    };

    res.json({
        success: true,
        username,
        email,
        profilePic: null
    });
});

// Search for users by username
app.get(`/${STUDENT_ID}/users`, async (req, res) => {
    const q = req.query.q || "";

    const results = await users
        .find({ username: { $regex: q, $options: "i" } })
        .project({ password: 0 })
        .toArray();

    res.json(results);
});

// Log a user in using email and password
app.post(`/${STUDENT_ID}/login`, async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, password });

    if (!user) {
        return res.json({ success: false, message: "Invalid login" });
    }

    // Store user data in the session
    req.session.user = {
        username: user.username,
        email: user.email,
        profilePic: user.profilePic || null
    };

    res.json({
        success: true,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic || null
    });
});

// Check if a user is currently logged in
app.get(`/${STUDENT_ID}/login`, async (req, res) => {
    if (!req.session.user) {
        return res.json({ loggedIn: false });
    }

    const user = await users.findOne(
        { email: req.session.user.email },
        { projection: { password: 0 } }
    );

    res.json({
        loggedIn: true,
        user
    });
});

// Log a user out and destroy their session
app.delete(`/${STUDENT_ID}/login`, (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: "Logged out" });
    });
});

// Create a text only post
app.post(`/${STUDENT_ID}/contents`, async (req, res) => {

    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const { text } = req.body;

    if (!text) {
        return res.json({ success: false, message: "Text required" });
    }

    await posts.insertOne({
        text,
        user: req.session.user.username,
        date: new Date()
    });

    res.json({ success: true, message: "Post added" });
});

// Search posts by text content
app.get(`/${STUDENT_ID}/contents`, async (req, res) => {
    const q = req.query.q || "";

    const results = await posts
        .find({ text: { $regex: q, $options: "i" } })
        .toArray();

    res.json(results);
});

// Upload a post with an image
app.post(`/${STUDENT_ID}/upload`, upload.single("image"), async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const { text } = req.body;

    if (!text) {
        return res.json({ success: false, message: "Text required" });
    }

    if (!req.file) {
        return res.json({ success: false, message: "Image file required" });
    }

    const imagePath = req.file.filename;

    await posts.insertOne({
        text,
        user: req.session.user.username,
        image: imagePath,
        date: new Date()
    });

    res.json({
        success: true,
        message: "Post uploaded",
        image: imagePath
    });
});

// Upload or update a user profile picture
app.post(`/${STUDENT_ID}/profilepic`, profileUpload.single("image"), async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    if (!req.file) {
        return res.json({ success: false, message: "No file uploaded" });
    }

    const filename = req.file.filename;

    // Update the user in MongoDB
    await users.updateOne(
        { email: req.session.user.email },
        { $set: { profilePic: filename } }
    );

    // Update current session
    req.session.user.profilePic = filename;

    res.json({
        success: true,
        message: "Profile picture updated",
        image: filename
    });
});

// Follow another user
app.post(`/${STUDENT_ID}/follow/:target`, async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: "Not logged in" });
  }

  const follower = req.session.user.username;
  const target = req.params.target;

  await follows.insertOne({ follower, target });

  res.json({ success: true, message: "Now following " + target });
});

// Unfollow a user
app.delete(`/${STUDENT_ID}/follow/:target`, async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: "Not logged in" });
  }

  const follower = req.session.user.username;
  const target = req.params.target;

  await follows.deleteMany({ follower, target });

  res.json({ success: true, message: "Unfollowed " + target });
});

// Get the number of users the current user follows
app.get(`/${STUDENT_ID}/followingcount`, async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, count: 0 });
    }

    const follower = req.session.user.username;
    const count = await follows.countDocuments({ follower });

    res.json({ success: true, count });
});

// Load the feed for the logged in user
app.get(`/${STUDENT_ID}/feed`, async (req, res) => {

    if (!req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const username = req.session.user.username;

    const following = await follows.find({ follower: username }).toArray();
    const followedUsers = following.map(f => f.target);

    const feedPostsRaw = await posts
        .find({
            user: { $in: [...followedUsers, username] }
        })
        .sort({ date: -1 })
        .toArray();

    // Attach profile pictures to each post
    const feedPosts = await Promise.all(
        feedPostsRaw.map(async post => {
            const userData = await users.findOne({ username: post.user });
            post.profilePic = userData?.profilePic || null;
            return post;
        })
    );

    res.json(feedPosts);
});

// Fetch external pet facts from public API's
app.get(`/${STUDENT_ID}/petdata`, async (req, res) => {
    try {
        const dogFactReq = axios.get("https://dogapi.dog/api/v2/facts");
        const catFactReq = axios.get("https://catfact.ninja/fact");

        const [dogFactRes, catFactRes] = await Promise.all([
            dogFactReq,
            catFactReq,
        ]);

        res.json({
            success: true,
            dogFact: dogFactRes.data.data[0].attributes.body,
            catFact: catFactRes.data.fact,
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Unable to load third-party data" });
    }
});

// Connect to the database and start the server
async function start() {
    await client.connect();
    db = client.db("petcareDB");
    users = db.collection("users");
    posts = db.collection("posts");
    follows = db.collection("follows");
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/${STUDENT_ID}/`);
    });
}

// Start server
start();
