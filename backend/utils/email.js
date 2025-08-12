import nodemailer from 'nodemailer';

// Create transporter (using Gmail as example - replace with your email service)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@digidocs.com',
      to: email,
      subject: 'Verify Your DigiDocs Account - OTP',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #3B82F6, #10B981); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">DigiDocs</h1>
            <p style="color: white; margin: 5px 0 0 0;">Digital Document Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Account</h2>
            <p style="color: #666; line-height: 1.6;">
              Welcome to DigiDocs! Please use the following OTP to verify your account:
            </p>
            
            <div style="background: white; border: 2px dashed #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 5px;">${otp}</span>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              This OTP is valid for 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
              <p>This is an automated message from DigiDocs. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent to:', email);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

export const sendShareNotification = async (email, documentTitle, sharedBy, shareToken) => {
  try {
    const transporter = createTransporter();
    
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@digidocs.com',
      to: email,
      subject: `Document Shared: ${documentTitle}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #3B82F6, #10B981); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">DigiDocs</h1>
            <p style="color: white; margin: 5px 0 0 0;">Document Shared With You</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Document Shared</h2>
            <p style="color: #666; line-height: 1.6;">
              <strong>${sharedBy}</strong> has shared a document with you:
            </p>
            
            <div style="background: white; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 5px 0;">${documentTitle}</h3>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${shareUrl}" 
                 style="display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Document
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you can't click the button above, copy and paste this link into your browser:<br>
              <a href="${shareUrl}" style="color: #3B82F6;">${shareUrl}</a>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
              <p>This is an automated message from DigiDocs. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Share notification sent to:', email);
  } catch (error) {
    console.error('Error sending share notification:', error);
    throw new Error('Failed to send share notification');
  }
};