const express = require("express");
const puppeteer = require("puppeteer-core");

// add stealth plugin and use defaults (all evasion techniques)
// const StealthPlugin = require("puppeteer-extra-plugin-stealth");
//puppeteer.use(StealthPlugin());
const multer = require("multer");
const bodyParser = require("body-parser");
require("dotenv").config();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const app = express();
const port = 3000;
// puppeteer.use(StealthPlugin());

// Puppeteer launch arguments
const launchArgs = JSON.stringify({
  args: [`--window-size=1920,1080`],
  headless: false,
  stealth: false,
  timeout: 600000,
});

// Setup multer for handling multipart/form-data
const upload = multer();

// Middleware for parsing JSON requests
app.use(bodyParser.json()); // To parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Handling POST requests
app.post("/import-to-smartlead", upload.none(), async (req, res) => {
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
  // const browser = await puppeteer.launch({
  //   headless: false,
  // });
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
      try {
        await page.waitForSelector('input[type="password"]', { visible: true });
      } catch (error) {
        console.log(`Incorrect google email : ${google_login_email}`);
        res.status(400).send(`Incorrect email : ${google_login_password}`);
        return;
      }
      await delay(3000);
      await page.type('input[type="password"]', google_login_password);
      await page.waitForSelector(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      await page.click(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      await delay(3000);
      const invalidPass = await page.$(
        "::-p-text(Wrong password. Try again or click Forgot password to reset it.)"
      );
      if (invalidPass) {
        console.log(`Incorrect google password : ${google_login_email}`);
        res.status(400).send(`Incorrect password : ${google_login_email}`);
        return;
      }
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
    console.log(`Account added successfully : ${google_login_email}`);
    res.send("Account added successfully");
  } catch (error) {
    // await page.screenshot({ path: "screenshot.png" });
    console.error(
      `${google_login_email} Error during account addition:`,
      error.message
    );
    res.status(500).send("An error occurred while adding the account.");
  } finally {
    await browser.close();
    console.log("Browser closed");
  }
});

app.post("/import-to-instantly", upload.none(), async (req, res) => {
  let {
    instantly_login_email,
    instantly_login_password,
    google_login_email,
    google_login_password,
    instantly_workspace,
  } = req.body;

  console.log("[Instantly] Received request to add account");

  // Check if data is in JSON format
  if (req.is("application/json")) {
    console.log("[Instantly] Request is in JSON format");
    // Validate JSON request body
    if (
      !instantly_login_email ||
      !instantly_login_password ||
      !google_login_email ||
      !google_login_password ||
      !instantly_workspace
    ) {
      console.log("[Instantly] Missing required fields in the JSON request");
      return res
        .status(400)
        .send("Missing required fields in the JSON request.");
    }
  }

  // Check if data is in multipart/form-data format
  if (req.is("multipart/form-data")) {
    console.log("[Instantly] Request is in multipart/form-data format");
    // Validate form data
    if (
      !instantly_login_email ||
      !instantly_login_password ||
      !google_login_email ||
      !google_login_password ||
      !instantly_workspace
    ) {
      console.log("[Instantly] Missing required fields in the form data");
      return res.status(400).send("Missing required fields in the form data.");
    }
  }

  console.log("[Instantly] Adding account to Instantly...");
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${process.env.BROWSERLESS_TOKEN}&launch=${launchArgs}`,
  });
  // const browser = await puppeteer.launch({
  //   headless: false,
  // });
  const page = await browser.newPage();

  try {
    await page.goto("https://app.instantly.ai/auth/login", {
      timeout: 120000,
      waitUntil: "networkidle2",
    });
    console.log("[Instantly] Login page loaded");
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', instantly_login_email);
    await page.type('input[name="password"]', instantly_login_password);
    console.log("[Instantly] Credentials entered");
    await page.click('button[type="submit"]');
    console.log("[Instantly] Login button clicked");
    try {
      await page.waitForNavigation({
        timeout: 20000,
      });
    } catch (error) {}
    await page.waitForSelector("button.MuiButton-colorSecondary.cursorPointer");
    console.log("[Instantly] Navigated to dashboard");

    await page.evaluate(() => {
      document
        .querySelector("button.MuiButton-colorSecondary.cursorPointer")
        .click();
    });

    try {
      await page.waitForSelector(
        `li[role='menuitem']::-p-text(${instantly_workspace})`
      );
      await page.click(`li[role="menuitem"]::-p-text(${instantly_workspace})`);
      console.log(`[Instantly] Selected workspace: ${instantly_workspace}`);
    } catch (error) {
      console.log(`[Instantly] ${instantly_workspace} workspace not found`);
      res.status(400).send(`${instantly_workspace} workspace not found`);
      return;
    }

    await delay(3000);

    // Additional logic to handle Google login or other steps can go here
    if (google_login_email && google_login_password) {
      await page.waitForSelector(
        "button.MuiButton-containedSizeMedium.MuiButton-colorPrimary"
      );
      await page.click(
        "button.MuiButton-containedSizeMedium.MuiButton-colorPrimary"
      );
      await page.waitForSelector(
        "#connect-cards-container > div > div:nth-child(3) h6:nth-child(2)"
      );
      await delay(2000);
      await page.evaluate(() =>
        document
          .querySelector(
            "#connect-cards-container > div > div:nth-child(3) h6:nth-child(2)"
          )
          .click()
      );
      await page.waitForSelector(
        '[style="padding-top: 86px;"] button[type="button"]'
      );
      await delay(2000);

      await page.evaluate(() =>
        document
          .querySelector('[style="padding-top: 86px;"] button[type="button"]')
          .click()
      );
      await page.waitForSelector(".col-12.col-lg-6 button");
      await delay(2000);

      await page.evaluate(() =>
        document.querySelector(".col-12.col-lg-6 button").click()
      );
      await delay(2000);
      await page.waitForSelector(
        'button[type="button"].MuiButton-sizeMedium h6.mb-0:not(.text-muted)'
      );
      const newPagePromise = new Promise((x) =>
        browser.once("targetcreated", (target) => x(target.page()))
      );
      await page.evaluate(() =>
        document
          .querySelector(
            'button[type="button"].MuiButton-sizeMedium h6.mb-0:not(.text-muted)'
          )
          .click()
      );
      const newPage = await newPagePromise;
      console.log(
        `[Instantly] - ${google_login_email} Handle Google account login... `
      );
      try {
        await newPage.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 20000,
        });
      } catch (error) {}
      await newPage.waitForSelector('input[type="email"]');
      await delay(2000);
      await newPage.type('input[type="email"]', google_login_email);
      await newPage.click('[data-primary-action-label="Next"] button');
      try {
        await newPage.waitForSelector('input[type="password"]', {
          visible: true,
        });
      } catch (error) {
        console.log(
          `[Instantly] Incorrect google email : ${google_login_email}`
        );
        res.status(400).send(`Incorrect email : ${google_login_password}`);
        return;
      }
      await delay(3000);
      await newPage.type('input[type="password"]', google_login_password);
      await newPage.waitForSelector(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      await newPage.click(
        '[data-primary-action-label="Next"] button[type="button"]'
      );
      await delay(5000);
      const invalidPass = await newPage.$(
        "::-p-text(Wrong password. Try again or click Forgot password to reset it.)"
      );
      if (invalidPass) {
        console.log(
          `[Instantly] Incorrect google password : ${google_login_email}`
        );
        res.status(400).send(`Incorrect password : ${google_login_email}`);
        return;
      }
      try {
        await newPage.waitForSelector("::-p-text(Continue)");
        await newPage.click("::-p-text(Continue)");
      } catch (error) {}
      try {
        await newPage.waitForSelector("::-p-text(Allow)");
        await newPage.click("::-p-text(Allow)");
      } catch (error) {}
    }
    await delay(5000);
    console.log(
      `[Instantly] Account added successfully : ${google_login_email}`
    );
    const screenshotBuffer = await page.screenshot({
      path: "screenshot.png",
      fullPage: true,
    });
    res.setHeader("Content-Type", "image/png");
    res.send(screenshotBuffer);
    res.send("Account added successfully");
  } catch (error) {
    console.error(
      `[Instantly] ${google_login_email} Error during account addition:`,
      error.message
    );
    res.status(500).send("An error occurred while adding the account.");
  } finally {
    // await page.screenshot({ path: "screenshot.png", fullPage: true });
    await browser.close();
    console.log("[Instantly] Browser closed");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
//Deploy
