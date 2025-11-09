const nodemailer = require("nodemailer");
const axios = require("axios");

module.exports = async function checkRules(attacks, orgId) {
  const byCountry = {};
  attacks.forEach(a => {
    byCountry[a.country] = (byCountry[a.country] || 0) + 1;
  });

  for (const [country, count] of Object.entries(byCountry)) {
    if (count > 50) {
      console.log(`🚨 High traffic from ${country}: ${count} attacks for ${orgId}`);

      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `⚠️ ${orgId}: ${count} attacks from ${country}`
      });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });

      await transporter.sendMail({
        from: `"SIEM Alert" <${process.env.SMTP_USER}>`,
        to: "security@yourcompany.com",
        subject: "High Attack Rate Detected",
        text: `High activity detected from ${country}. Count: ${count}`
      });
    }
  }
};
