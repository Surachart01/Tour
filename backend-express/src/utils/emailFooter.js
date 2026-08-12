import fs from 'fs';
import path from 'path';

/**
 * Standard Email Footer Signature Component for VeraThailandia Co., Ltd.
 */

export const LOGO_CID = 'verathailandia_logo_cid';
export const EMAIL_FOOTER_MARKER = 'data-verathailandia-email-footer="true"';

export function getLogoFilePath() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/assets/image.png'),
    path.resolve(process.cwd(), 'src/assets/logo.png'),
    path.resolve(process.cwd(), '../frontend-main/production/images/Verathailand_logo.png')
  ];
  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      return logoPath;
    }
  }
  return null;
}

export function getLogoAttachment() {
  const logoPath = getLogoFilePath();
  if (logoPath) {
    return {
      filename: 'image.png',
      path: logoPath,
      cid: LOGO_CID
    };
  }
  return null;
}

export function getLogoSrc() {
  const logoPath = getLogoFilePath();
  if (logoPath) {
    try {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.warn('Could not read logo for base64:', e.message);
    }
  }
  return 'https://verathailandia.com/wp-content/uploads/2023/10/logo-verathailandia.png';
}

export function buildEmailFooter({
  senderName = 'VeraThailandia Reservations Team',
  senderEmail = 'reservation@verathailandia.com',
  salutation = 'Best regards,',
  useCid = true
} = {}) {
  const cleanEmail = String(senderEmail).replace(/^.*<([^>]+)>.*$/, '$1').trim();
  const cleanName = senderName || 'VeraThailandia Reservations Team';
  const cleanSalutation = salutation || 'Best regards,';

  // Prefer CID attachment for maximum compatibility with Gmail/Outlook, fallback to base64/URL
  const logoSrc = useCid && getLogoFilePath() ? `cid:${LOGO_CID}` : getLogoSrc();

  return `
    <div ${EMAIL_FOOTER_MARKER} style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dbe5ec; font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.5;">
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.4;">${cleanSalutation}<br/><strong>${cleanName}</strong></p>
      
      <div style="margin: 12px 0;">
        <img src="${logoSrc}" alt="VeraThailandia Co., Ltd." style="max-height: 64px; height: 64px; width: auto; display: block;" />
      </div>

      <p style="margin: 10px 0 12px 0; font-size: 12px; color: #333333; line-height: 1.4;">
        <strong>VeraThailandia Co., Ltd.</strong><br/>
        20th Floor, Room 160/424-425, ITF Silom Palace, 160 Silom Road, Suriya Wong, Bangrak, Bangkok 10500, Thailand
      </p>

      <table style="font-size: 12px; color: #333333; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 1px 4px 1px 0; vertical-align: middle; white-space: nowrap; width: 1%;">📧 <strong>Email:</strong></td>
          <td style="padding: 1px 0 1px 4px; vertical-align: middle;"><a href="mailto:${cleanEmail}" style="color: #0066cc; text-decoration: underline;">${cleanEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 1px 4px 1px 0; vertical-align: middle; white-space: nowrap; width: 1%;">📞 <strong>Phone:</strong></td>
          <td style="padding: 1px 0 1px 4px; vertical-align: middle;">(+66 2) 126 6914</td>
        </tr>
        <tr>
          <td style="padding: 1px 4px 1px 0; vertical-align: middle; white-space: nowrap; width: 1%;">🌐 <strong>Website:</strong></td>
          <td style="padding: 1px 0 1px 4px; vertical-align: middle;"><a href="https://www.verathailandia.com" target="_blank" style="color: #0066cc; text-decoration: underline;">www.verathailandia.com</a></td>
        </tr>
        <tr>
          <td style="padding: 1px 4px 1px 0; vertical-align: middle; white-space: nowrap; width: 1%;">🧾 <strong>Tax ID:</strong></td>
          <td style="padding: 1px 0 1px 4px; vertical-align: middle;">0105547045569</td>
        </tr>
      </table>

      <div style="font-size: 12px; color: #008000; font-weight: normal; margin-top: 14px;">
        <span style="font-size: 14px;">🌲</span> Before printing, think about environmental responsibility
      </div>
    </div>
  `;
}

export function ensureStandardEmailFooter(html, options = {}) {
  if (html === undefined || html === null || html === '') return html;
  const content = String(html);
  if (content.includes(EMAIL_FOOTER_MARKER)) return content;
  const footer = buildEmailFooter(options);
  if (/<\/body>/i.test(content)) return content.replace(/<\/body>/i, `${footer}</body>`);
  if (/<\/html>/i.test(content)) return content.replace(/<\/html>/i, `${footer}</html>`);
  return `${content}${footer}`;
}

export function ensureStandardEmailFooterText(text, options = {}) {
  if (text === undefined || text === null || text === '') return text;
  const content = String(text);
  if (content.includes('VeraThailandia Co., Ltd.') && content.includes('Tax ID: 0105547045569')) {
    return content;
  }
  return `${content}${buildEmailFooterText(options)}`;
}

export function prepareEmailWithStandardFooter(mailOptions = {}, footerOptions = {}) {
  const options = {
    senderEmail: footerOptions.senderEmail || mailOptions.from || 'reservation@verathailandia.com',
    ...footerOptions
  };
  const attachments = Array.isArray(mailOptions.attachments) ? [...mailOptions.attachments] : [];
  const logoAttachment = getLogoAttachment();

  if (logoAttachment && !attachments.some((attachment) => attachment?.cid === LOGO_CID)) {
    attachments.push(logoAttachment);
  }

  return {
    ...mailOptions,
    html: ensureStandardEmailFooter(mailOptions.html, options),
    text: ensureStandardEmailFooterText(mailOptions.text, options),
    attachments
  };
}

export function buildEmailFooterText({
  senderName = 'VeraThailandia Reservations Team',
  senderEmail = 'reservation@verathailandia.com',
  salutation = 'Best regards,'
} = {}) {
  const cleanEmail = String(senderEmail).replace(/^.*<([^>]+)>.*$/, '$1').trim();
  const cleanName = senderName || 'VeraThailandia Reservations Team';
  const cleanSalutation = salutation || 'Best regards,';

  return [
    '',
    cleanSalutation,
    cleanName,
    '',
    'VeraThailandia Co., Ltd.',
    '20th Floor, Room 160/424-425, ITF Silom Palace, 160 Silom Road, Suriya Wong, Bangrak, Bangkok 10500, Thailand',
    `Email: ${cleanEmail}`,
    'Phone: (+66 2) 126 6914',
    'Website: www.verathailandia.com',
    'Tax ID: 0105547045569',
    '',
    'Before printing, think about environmental responsibility'
  ].join('\n');
}
