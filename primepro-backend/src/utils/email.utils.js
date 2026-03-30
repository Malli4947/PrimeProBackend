const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️  SMTP not configured — email not sent');
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from:    `"${process.env.FROM_NAME || 'PrimePro'}" <${process.env.FROM_EMAIL}>`,
    to, subject, html, text,
  });
  console.log(`📧 Email sent to ${to}`);
};

// Pre-built email templates
const sendEnquiryConfirmation = (enquiry) =>
  sendEmail({
    to:      enquiry.email,
    subject: 'We received your enquiry — PrimePro',
    html: `
      <h2>Hi ${enquiry.name},</h2>
      <p>Thank you for your enquiry. Our team will contact you within 2 business hours.</p>
      <p><strong>Enquiry type:</strong> ${enquiry.type}</p>
      <p><strong>Message:</strong> ${enquiry.message}</p>
      <br/>
      <p>Regards,<br/>PrimePro Team<br/>📞 1800 500 600</p>
    `,
  });

const sendEnquiryNotification = (enquiry) =>
  sendEmail({
    to:      process.env.FROM_EMAIL,
    subject: `New Enquiry: ${enquiry.type} — from ${enquiry.name}`,
    html: `
      <h2>New Enquiry Received</h2>
      <table>
        <tr><td><strong>Name</strong></td><td>${enquiry.name}</td></tr>
        <tr><td><strong>Email</strong></td><td>${enquiry.email}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${enquiry.phone}</td></tr>
        <tr><td><strong>Type</strong></td><td>${enquiry.type}</td></tr>
        <tr><td><strong>Message</strong></td><td>${enquiry.message}</td></tr>
      </table>
    `,
  });

module.exports = { sendEmail, sendEnquiryConfirmation, sendEnquiryNotification };