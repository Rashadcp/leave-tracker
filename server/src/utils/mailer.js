import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultLogoPath = path.resolve(__dirname, '../assets/logo.png');


export const getPortalUrl = () => {
  let url = process.env.DOMAIN || process.env.CLIENT_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

// Create reusable Gmail transporter
const createTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
};

/**
 * Send an email with HTML template and fallback logging
 */
const sendMail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const fromEmail = process.env.GMAIL_USER || 'no-reply@winshine.com';

  if (!transporter) {
    console.log(`\n--------------------------------------------------`);
    console.log(`[Email Notification Triggered (Simulation Mode)]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Note: Configure GMAIL_USER & GMAIL_APP_PASSWORD in server/.env to send live emails via Gmail.`);
    console.log(`--------------------------------------------------\n`);
    return { simulated: true };
  }

  // Attach logo file inline via CID if available and no external URL override
  const attachments = [];
  if (!process.env.COMPANY_LOGO_URL && fs.existsSync(defaultLogoPath)) {
    attachments.push({
      filename: 'winshine-logo.png',
      path: defaultLogoPath,
      cid: 'winshine_logo_img'
    });
  }

  try {
    const mailOptions = {
      from: `"Winshine Leave Management" <${fromEmail}>`,
      to,
      subject,
      text,
      html
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Message sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error.message);
    return { error: error.message };
  }
};

export const sendPasswordResetEmail = async ({ employee, token }) => {
  const resetUrl = `${getPortalUrl()}?resetToken=${encodeURIComponent(token)}`;
  return sendMail({
    to: employee.email,
    subject: 'Reset your Winshine Leave Management password',
    text: `Reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1F2937;">
      <h2 style="margin-bottom: 8px;">Reset your password</h2>
      <p>Hello ${employee.name},</p>
      <p>We received a request to reset your Winshine Leave Management password. This link expires in 30 minutes.</p>
      <p style="margin: 24px 0;"><a href="${resetUrl}" style="background: #2563EB; color: #FFFFFF; padding: 11px 18px; border-radius: 6px; text-decoration: none; font-weight: 700;">Reset Password</a></p>
      <p style="font-size: 12px; color: #6B7280;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>`
  });
};

/**
 * Render email header with company logo on white background
 */
const renderEmailHeader = ({ title, subtitle, accentColor = '#2563EB' }) => {
  const logoSrc = process.env.COMPANY_LOGO_URL || 'cid:winshine_logo_img';

  return `
    <!-- Top White Branding Bar for Maximum Logo Clarity -->
    <div style="background-color: #FFFFFF; padding: 18px 24px; border-bottom: 1px solid #E5E7EB; border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="vertical-align: middle; text-align: left;">
            <div style="background-color: #FFFFFF; display: inline-block;">
              <img src="${logoSrc}" alt="Winshine - Win Together Shine Together" style="height: 40px; width: auto; max-width: 220px; display: block; border: 0;" />
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <span style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #4B5563; background-color: #F3F4F6; padding: 5px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
              Leave Portal
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Notification Accent Banner -->
    <div style="background-color: ${accentColor}; color: #FFFFFF; padding: 16px 24px;">
      <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">${title}</h2>
      ${subtitle ? `<p style="margin: 3px 0 0 0; font-size: 13px; opacity: 0.95; color: #FFFFFF;">${subtitle}</p>` : ''}
    </div>
  `;
};

/**
 * Format any date string (YYYY-MM-DD, ISO string, Date object) to DD/MM/YYYY
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
};

/**
 * Format a date range with "to" in DD/MM/YYYY format
 */
export const formatDateRange = (startDate, endDate, separator = 'to') => {
  if (!startDate) return '';
  const d1 = formatDate(startDate);
  if (!endDate || startDate === endDate) return d1;
  const d2 = formatDate(endDate);
  if (d1 === d2) return d1;
  return `${d1} ${separator} ${d2}`;
};

/**
 * 1. Notify HR / Approver when employee submits a Leave Request
 */
export const notifyHRNewLeaveRequest = async ({ employee, approver, leaveRequest, leaveType }) => {
  // New submissions must go to the configured HR inbox. An employee's assigned
  // manager is only a fallback when no central HR mailbox has been configured.
  const hrEmail = process.env.HR_NOTIFICATION_EMAIL?.trim() || approver?.email || 'priya.sharma@winshine.com';
  const portalUrl = getPortalUrl();
  const dates = leaveRequest.isHalfDay 
    ? `${formatDate(leaveRequest.startDate)} (Half Day - ${leaveRequest.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})`
    : `${formatDateRange(leaveRequest.startDate, leaveRequest.endDate)} (${leaveRequest.totalDays} day(s))`;

  const subject = `[New Leave Request] ${employee.name} - ${leaveType?.name || 'Leave'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
      ${renderEmailHeader({
        title: 'New Leave Application Submitted',
        subtitle: 'Leave & Attendance Portal',
        accentColor: '#2563EB'
      })}
      <div style="padding: 24px; color: #1F2937;">
        <p style="margin-top: 0; font-size: 15px;">Hello <strong>${approver?.name || 'HR Team'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563;">An employee has submitted a new leave application awaiting your review:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold; width: 140px;">Employee:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${employee.name} - ${employee.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Category:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${leaveType?.name || 'Leave'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Schedule:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${dates}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Reason:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${leaveRequest.reason}</td>
          </tr>
        </table>

        <div style="margin-top: 24px;">
          <a href="${portalUrl}?tab=approvals" style="background-color: #2563EB; color: #FFFFFF; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
            Review & Approve in Portal
          </a>
        </div>
      </div>
      <div style="background-color: #F9FAFB; padding: 12px 24px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
        This is an automated notification from Winshine Leave Management System.
      </div>
    </div>
  `;

  return sendMail({ to: hrEmail, subject, html, text: `New Leave Request from ${employee.name}: ${dates}. Reason: ${leaveRequest.reason}` });
};

/**
 * 2. Notify HR / Approver when employee submits a Late Arrival Report
 */
export const notifyHRNewLateRequest = async ({ employee, approver, lateRequest }) => {
  // Keep the recipient rule consistent with leave submissions.
  const hrEmail = process.env.HR_NOTIFICATION_EMAIL?.trim() || approver?.email || 'priya.sharma@winshine.com';
  const portalUrl = getPortalUrl();
  const formattedDate = formatDate(lateRequest.date);
  const subject = `[Late Arrival Notice] ${employee.name} - ${formattedDate} (${lateRequest.expectedTime})`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
      ${renderEmailHeader({
        title: 'Late Arrival Reported',
        subtitle: 'Leave & Attendance Portal',
        accentColor: '#D97706'
      })}
      <div style="padding: 24px; color: #1F2937;">
        <p style="margin-top: 0; font-size: 15px;">Hello <strong>${approver?.name || 'HR Team'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563;">An employee has reported an upcoming late arrival:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold; width: 140px;">Employee:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${employee.name} - ${employee.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Date & Expected Time:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${formattedDate} at ${lateRequest.expectedTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Reason:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${lateRequest.reason}</td>
          </tr>
        </table>

        <div style="margin-top: 24px;">
          <a href="${portalUrl}?tab=approvals" style="background-color: #D97706; color: #FFFFFF; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
            Open Approvals Dashboard
          </a>
        </div>
      </div>
      <div style="background-color: #F9FAFB; padding: 12px 24px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
        This is an automated notification from Winshine Leave Management System.
      </div>
    </div>
  `;

  return sendMail({ to: hrEmail, subject, html, text: `Late arrival reported by ${employee.name} on ${formattedDate} at ${lateRequest.expectedTime}. Reason: ${lateRequest.reason}` });
};

/**
 * 3. Notify Employee when HR Approves or Rejects Request (Leave or Late)
 */
export const notifyEmployeeDecision = async ({ employee, approver, request, requestType, action, comment, balanceAfter }) => {
  const isApproved = action === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Declined';
  const headerColor = isApproved ? '#059669' : '#DC2626';
  const portalUrl = getPortalUrl();

  const scheduleInfo = requestType === 'leave'
    ? (request.isHalfDay
        ? `${formatDate(request.startDate)} (Half Day - ${request.halfDayPeriod === 'first_half' ? 'Morning' : 'Afternoon'})`
        : `${formatDateRange(request.startDate, request.endDate)} (${request.totalDays} day(s))`)
    : `${formatDate(request.date)} • Expected ${request.expectedTime}`;

  const subject = `[${statusLabel}] Your ${requestType === 'leave' ? 'Leave Application' : 'Late Arrival Report'} has been ${statusLabel}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
      ${renderEmailHeader({
        title: `Application Status: ${statusLabel}`,
        subtitle: 'Leave & Attendance Portal',
        accentColor: headerColor
      })}
      <div style="padding: 24px; color: #1F2937;">
        <p style="margin-top: 0; font-size: 15px;">Hello <strong>${employee.name}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563;">
          Your ${requestType === 'leave' ? 'leave request' : 'late arrival report'} has been <strong>${statusLabel.toLowerCase()}</strong> by ${approver?.name || 'HR Management'}.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold; width: 140px;">Type:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${requestType === 'leave' ? 'Leave Request' : 'Late Arrival Report'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Schedule:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${scheduleInfo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Decision:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: ${headerColor}; font-weight: bold;">${statusLabel}</td>
          </tr>
          ${comment ? `
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Approver Feedback:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${comment}</td>
          </tr>` : ''}
          ${balanceAfter !== null && balanceAfter !== undefined ? `
          <tr>
            <td style="padding: 8px 12px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: bold;">Remaining Balance:</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-weight: bold; color: #2563EB;">${balanceAfter} day(s)</td>
          </tr>` : ''}
        </table>

        <div style="margin-top: 24px;">
          <a href="${portalUrl}?tab=requests" style="background-color: #2563EB; color: #FFFFFF; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
            View in Portal
          </a>
        </div>
      </div>
      <div style="background-color: #F9FAFB; padding: 12px 24px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
        This is an automated notification from Winshine Leave Management System.
      </div>
    </div>
  `;

  return sendMail({
    to: employee.email,
    subject,
    html,
    text: `Your ${requestType} request has been ${statusLabel} by ${approver?.name || 'HR'}. ${comment ? 'Feedback: ' + comment : ''}`
  });
};
