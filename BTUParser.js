const puppeteer = require("puppeteer");

class BTUParser {
  async init() {
    console.log("1. Starting browser initialization");

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(30000);

      console.log("2. Browser initialized");
      await page.goto("https://classroom.btu.edu.ge/ge/student/me/schedule");
      console.log("3. Waiting for login redirect");

      await page.waitForFunction(
        () => window.location.href.includes("/student/me/courses"),
        { timeout: 60000 }
      );

      console.log("4. Login successful, detected courses page");

      await page.goto("https://classroom.btu.edu.ge/ge/student/me/schedule");
      await page.waitForSelector(".table-responsive");
      console.log("5. Schedule loaded successfully");

      const schedule = await page.evaluate(() => {
        const schedule = {};
        const table = document.querySelector(".table-responsive");
        const rows = table?.querySelectorAll("tr") || [];

        let currentDay = "";
        const dayHeaders = [
          "ორშაბათი",
          "სამშაბათი",
          "ოთხშაბათი",
          "ხუთშაბათი",
          "პარასკევი",
          "შაბათი",
        ];
        const dayMappings = {
          ორშაბათი: "monday",
          სამშაბათი: "tuesday",
          ოთხშაბათი: "wednesday",
          ხუთშაბათი: "thursday",
          პარასკევი: "friday",
          შაბათი: "saturday",
        };

        rows.forEach((row) => {
          const header = row.querySelector("th")?.textContent?.trim();
          if (header && dayHeaders.includes(header)) {
            currentDay = dayMappings[header];
            schedule[currentDay] = [];
          } else if (currentDay && row.children.length > 1) {
            const cols = Array.from(row.children).map(
              (col) => col.textContent?.trim() || ""
            );
            const [time, room, subject, group, lecturer, additionalInfo] = cols;
            schedule[currentDay].push({
              time,
              room,
              subject,
              group,
              lecturer,
              additionalInfo,
            });
          }
        });

        return schedule;
      });

      console.log("6. Schedule parsed successfully");
      return schedule;
    } catch (error) {
      console.error("Error during schedule scraping:", error);
      throw error;
    } finally {
      await browser.close();
      console.log("7. Browser closed");
    }
  }
}

module.exports = { BTUParser };
