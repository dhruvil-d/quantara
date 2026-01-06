import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* ================= SIGNUP ================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Normalize email
    const normalizedEmail = email ? email.toLowerCase().trim() : "";
    console.log(`[SIGNUP] Attempt for: ${normalizedEmail}`);

    if (!normalizedEmail || !password || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log(`[SIGNUP] User already exists: ${normalizedEmail}`);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    console.log(`[SIGNUP] Success: ${newUser._id}`);
    res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error(`[SIGNUP] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      console.error("[LOGIN] CRITICAL: JWT_SECRET is missing in .env file!");
      return res.status(500).json({ error: "Server configuration error. Contact admin." });
    }

    // Normalize email
    const normalizedEmail = email ? email.toLowerCase().trim() : "";
    console.log(`[LOGIN] Attempt for: ${normalizedEmail}`);

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log(`[LOGIN] User not found: ${normalizedEmail}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[LOGIN] Password mismatch for: ${normalizedEmail}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log(`[LOGIN] Success for: ${normalizedEmail}`);
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(`[LOGIN] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;
