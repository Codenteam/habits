import * as nodemailer from 'nodemailer';

async function main() {
  // Connect to Greenmail SMTP (use 127.0.0.1 to force IPv4)
  const transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: 3025,
    secure: false,
  });

  // Create and send test email 1 (important)
  await transporter.sendMail({
    from: 'security@example.com',
    to: 'test@localhost',
    subject: 'URGENT: Security Alert - Immediate Action Required',
    text: 'This is an urgent security alert! Your account may have been compromised. Please take immediate action.',
  });
  console.log('Test email 1 (important) sent!');

  // Send another email (semi-important)
  await transporter.sendMail({
    from: 'manager@example.com',
    to: 'test@localhost',
    subject: 'Meeting Request: Q1 Review',
    text: 'Meeting scheduled for tomorrow at 2pm to discuss Q1 results.',
  });
  console.log('Test email 2 (semi-important) sent!');

  transporter.close();
  console.log('Done!');
}

main().catch(console.error);
