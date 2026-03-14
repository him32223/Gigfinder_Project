const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Forces it to look in the /server folder
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runDiagnostics() {
    console.log("\n=============================================");
    console.log("   🔍 RUNNING SYSTEM DIAGNOSTIC CHECKS...");
    console.log("=============================================\n");
    
    let allPassed = true;

    // 1. Test MongoDB Connection
    try {
        process.stdout.write("⏳ Testing MongoDB Connection... ");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ SUCCESS!");
        await mongoose.disconnect(); // Close connection after test
    } catch (e) {
        console.log("\n❌ FAILED: Could not connect to MongoDB.");
        console.log("   Hint: Check your MONGO_URI password and ensure your IP is whitelisted (0.0.0.0/0).");
        allPassed = false;
    }

    // 2. Test Email SMTP Connection
    try {
        process.stdout.write("⏳ Testing Gmail SMTP Connection... ");
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.verify();
        console.log("✅ SUCCESS!");
    } catch (e) {
        console.log("\n❌ FAILED: Could not log in to Gmail.");
        console.log("   Hint: Ensure you are using a 16-letter Google App Password, not your normal password.");
        allPassed = false;
    }

    // 3. Test Gemini API Key
    try {
        process.stdout.write("⏳ Testing Gemini AI Key... ");
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) throw new Error("Invalid Key Length");
        console.log("✅ SUCCESS!");
    } catch (e) {
        console.log("\n❌ FAILED: Gemini API Key is missing or invalid.");
        allPassed = false;
    }

    console.log("\n=============================================");
    if (allPassed) {
        console.log("🚀 ALL SYSTEMS GO! Launching GigFinder...");
        process.exit(0); // 0 means Success to the .bat file
    } else {
        console.log("🛑 DIAGNOSTIC FAILED. Please fix your .env file keys.");
        process.exit(1); // 1 means Error to the .bat file
    }
}

runDiagnostics();