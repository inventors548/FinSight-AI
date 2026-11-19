
const nodemailer = require("nodemailer");

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
};

const sendLoginNotification = async (user) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM
  } = process.env;

  // Do not interrupt login if SMTP is not configured.
  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !EMAIL_FROM
  ) {
    console.warn("Login notification skipped: SMTP is not configured.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const loginTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "long"
  });

  const safeName = escapeHtml(user.name);
  const safeEmail = escapeHtml(user.email);

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: user.email,
    subject: "New Login Alert - FinSight AI",

    text: `
Hello ${user.name},

A successful login to your FinSight AI account was detected.

Login Details:
Email: ${user.email}
Date and Time: ${loginTime}
Status: Successful

If this was you, no action is required.

If you do not recognize this login, please change your password immediately.

Regards,
FinSight AI Security Team
`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;color:#222;">
        <h2 style="color:#2563eb;">FinSight AI</h2>

        <h3>New Login Detected</h3>

        <p>Hello <strong>${safeName}</strong>,</p>

        <p>A successful login to your FinSight AI account was detected.</p>

        <div style="background:#f3f4f6;padding:18px;border-radius:10px;">
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Date and Time:</strong> ${escapeHtml(loginTime)}</p>
          <p><strong>Status:</strong>
            <span style="color:green;">Successful</span>
          </p>
        </div>

        <p>If this was you, no action is required.</p>

        <p style="color:#dc2626;">
          If you do not recognize this login, change your password immediately.
        </p>

        <hr />

        <p style="font-size:12px;color:#777;">
          This is an automated security notification from FinSight AI.
        </p>
      </div>
    `
  });

  console.log(`Login notification email sent to ${user.email}`);

  return true;
};

module.exports = {
  sendLoginNotification
};
