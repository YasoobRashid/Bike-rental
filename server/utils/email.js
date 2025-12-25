const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Bike Rental App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text, 
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('[Email] Error:', err);
    throw err;
  }
}

module.exports = sendEmail;