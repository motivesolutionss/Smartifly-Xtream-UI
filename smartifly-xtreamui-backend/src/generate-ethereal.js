const nodemailer = require("nodemailer");

nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error("Error creating account", err);
    return;
  }

  console.log("✔ Ethereal test account created:");
  console.log("SMTP HOST:", account.smtp.host);
  console.log("SMTP PORT:", account.smtp.port);
  console.log("SMTP SECURE:", account.smtp.secure);
  console.log("USERNAME:", account.user);
  console.log("PASSWORD:", account.pass);
  console.log("WEB LOGIN:", account.web);
});
