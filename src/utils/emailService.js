const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email
const sendEmail = async (options) => {
  const transporter = createTransporter();
  
  const message = {
    from: `${process.env.FROM_NAME || 'FreelanceForum'} <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };
  
  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
  
  return info;
};

// Email templates
const emailTemplates = {
  welcome: (user) => ({
    subject: 'Welcome to FreelanceForum!',
    html: `
      <h1>Welcome ${user.name}!</h1>
      <p>Thank you for joining our freelancing community.</p>
      <p>Your username: <strong>${user.username}</strong></p>
      <p>Start exploring projects and connect with amazing freelancers!</p>
    `,
  }),
  
  newMessage: (sender, receiver) => ({
    subject: 'New message from ' + sender.name,
    html: `
      <h1>You have a new message!</h1>
      <p><strong>${sender.name}</strong> sent you a message on FreelanceForum.</p>
      <p>Login to your account to read and reply.</p>
    `,
  }),
  
  threadReply: (thread, commenter, receiver) => ({
    subject: `New comment on "${thread.title}"`,
    html: `
      <h1>New comment on your thread</h1>
      <p><strong>${commenter.name}</strong> commented on your thread "${thread.title}".</p>
      <p>Login to see the comment and reply.</p>
    `,
  }),
  
  newsletter: (user, content) => ({
    subject: 'FreelanceForum Weekly Digest',
    html: `
      <h1>Weekly Digest</h1>
      <p>Hi ${user.name},</p>
      <p>Here's what's been happening in the community this week:</p>
      ${content}
    `,
  }),
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  if (!user.email) return;
  
  const template = emailTemplates.welcome(user);
  await sendEmail({
    email: user.email,
    subject: template.subject,
    html: template.html,
  });
};

// Send notification email
const sendNotificationEmail = async (user, notification) => {
  if (!user.email || !user.notificationPrefs.newsletter) return;
  
  let template;
  
  switch (notification.type) {
    case 'new_message':
      template = emailTemplates.newMessage(notification.sender, user);
      break;
    case 'thread_reply':
      template = emailTemplates.threadReply(notification.thread, notification.commenter, user);
      break;
    default:
      return;
  }
  
  await sendEmail({
    email: user.email,
    subject: template.subject,
    html: template.html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
  emailTemplates,
};