import { getTransporterForRole, SENDER_ROLES } from '../src/utils/smtpTransporter.js';
import { buildEmailFooter, getLogoAttachment } from '../src/utils/emailFooter.js';

async function testSendQuotation() {
  console.log('Testing sendQuotation email with fallback strategy...');

  const quotationTransporter = getTransporterForRole(SENDER_ROLES.QUOTATION);
  const logoAtt = getLogoAttachment();

  try {
    const info = await quotationTransporter.sendMail({
      from: 'VeraThailandia Quotations <info@verathailandia.com>',
      to: 'titlemy36@gmail.com',
      subject: '[TEST QUOTATION EMAIL] VeraThailandia Quotation DEC02_2026',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;line-height:1.55;">
          <h2>Quotation Document - DEC02_2026</h2>
          <p>Dear Customer,</p>
          <p>Please find as follow the requested quotation and attached the excursion and tour descriptions.</p>
          ${buildEmailFooter({ senderName: 'Verathailandia Reservations Team', senderEmail: 'info@verathailandia.com', salutation: 'Best regards,' })}
        </div>
      `,
      attachments: logoAtt ? [logoAtt] : []
    });
    console.log('Quotation Email Sent Result (Primary):', info);
  } catch (err) {
    console.warn('Primary failed, testing fallback...', err.message);
    const fallbackTransporter = getTransporterForRole(SENDER_ROLES.RESERVATION);
    const info = await fallbackTransporter.sendMail({
      from: 'VeraThailandia <reservation@verathailandia.com>',
      to: 'titlemy36@gmail.com',
      subject: '[TEST QUOTATION EMAIL] VeraThailandia Quotation DEC02_2026',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;line-height:1.55;">
          <h2>Quotation Document - DEC02_2026</h2>
          <p>Dear Customer,</p>
          <p>Please find as follow the requested quotation and attached the excursion and tour descriptions.</p>
          ${buildEmailFooter({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })}
        </div>
      `,
      attachments: logoAtt ? [logoAtt] : []
    });
    console.log('Quotation Email Sent Result (Fallback):', info);
  }
}

testSendQuotation().catch(console.error);
