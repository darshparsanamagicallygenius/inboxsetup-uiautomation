const express = require("express");
const puppeteer = require("puppeteer-core");
const multer = require("multer");
const bodyParser = require("body-parser");
require("dotenv").config();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const app = express();
const port = 3000;

// Puppeteer launch arguments
const launchArgs = JSON.stringify({
  args: [`--window-size=1920,1080`],
  headless: false,
  stealth: true,
  timeout: 600000,
});

// Setup multer for handling multipart/form-data
const upload = multer();

// Middleware for parsing JSON requests
app.use(bodyParser.json()); // To parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Handling POST requests
app.post("/add_account", upload.none(), async (req, res) => {
  let {
    smartlead_login_email,
    smartlead_login_password,
    google_login_email,
    google_login_password,
  } = req.body;

  // Check if data is in JSON format
  if (req.is("application/json")) {
    // Validate JSON request body
    if (
      !smartlead_login_email ||
      !smartlead_login_password ||
      !google_login_email ||
      !google_login_password
    ) {
      return res
        .status(400)
        .send("Missing required fields in the JSON request.");
    }
  }

  // Check if data is in multipart/form-data format
  if (req.is("multipart/form-data")) {
    // Validate form data
    if (
      !smartlead_login_email ||
      !smartlead_login_password ||
      !google_login_email ||
      !google_login_password
    ) {
      return res.status(400).send("Missing required fields in the form data.");
    }
  }

  console.log("Adding account...");
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${process.env.BROWSERLESS_TOKEN}&launch=${launchArgs}`,
  });
  /**
   * @type {Page}
   */
  const page = await browser.newPage();

  try {
    // await page.screenshot({ path: "screenshot.png" });

    try {
      await page.goto("https://app.smartlead.ai/login", {
        timeout: 120000,
        waitUntil: "networkidle2",
      });
    } catch (error) {}
    // await page.screenshot({ path: "screenshot.png" });X
    console.log("Login page loaded");
    await page.waitForSelector('input[name="email"]');
    // Step 1: Input Smartlead credentials
    await page.click('input[name="email"]');
    await page.type('input[name="email"]', smartlead_login_email);
    await page.click('input[name="password"]');
    await page.type('input[name="password"]', smartlead_login_password);
    // await page.screenshot({ path: "screenshot.png" });
    console.log("Credentials entered");
    // Step 2: Click "Login"
    await page.click('button[type="submit"]');
    // await page.screenshot({ path: "screenshot.png" });
    console.log("Login button clicked");
    try {
      await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    } catch (error) {}
    // await page.screenshot({ path: "screenshot.png" });
    console.log("Navigated to dashboard");
    try {
      await page.waitForSelector("i.close-icon");

      await page.click("i.close-icon");
    } catch (error) {}
    // await page.screenshot({ path: "screenshot.png" });

    try {
      await page.goto("https://app.smartlead.ai/app/email-accounts-new", {
        timeout: 90000,
        waitUntil: "networkidle2",
      });
    } catch (error) {}
    // Additional logic to handle Google login or other steps can go here
    // Example: Using the Google login credentials
    if (google_login_email && google_login_password) {
      await page.waitForSelector("button.add-accounts-button");
      await page.click("button.add-accounts-button");
      await page.waitForSelector("button.select-btn");
      await delay(2000);
      await page.evaluate(() =>
        document.querySelector("button.select-btn").click()
      );
      await page.waitForSelector("div.email-connect-card");
      await delay(2000);

      await page.evaluate(() =>
        document.querySelector("div.email-connect-card").click()
      );
      await page.waitForSelector(".connect-action-footer button.q-hoverable");
      await delay(2000);

      await page.evaluate(() =>
        document
          .querySelector(".connect-action-footer button.q-hoverable")
          .click()
      );
      console.log("Handle Google account login...");
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      await page.waitForSelector('input[type="email"]');
      await delay(2000);
      await page.type('input[type="email"]', google_login_email);
      await page.click('[data-primary-action-label="Next"] button');
      await page.waitForSelector('input[type="password"]', { visible: true });
      await delay(3000);
      await page.type('input[type="password"]', google_login_password);
      await page.waitForSelector(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      await page.click(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      try {
        await page.waitForSelector("::-p-text(Continue)");
        await page.click("::-p-text(Continue)");
      } catch (error) {}
      try {
        await page.waitForSelector("::-p-text(Allow)");
        await page.click("::-p-text(Allow)");
      } catch (error) {}
    }
    // await page.screenshot({ path: "screenshot.png" });

    try {
      await page.waitForSelector('[role="dialog"] button[type="button"]');
      await page.click('[role="dialog"] button[type="button"]');
    } catch (error) {}
    res.send("Account added successfully");
  } catch (error) {
    // await page.screenshot({ path: "screenshot.png" });
    console.error("Error during account addition:", error.message);
    res.status(500).send("An error occurred while adding the account.");
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
