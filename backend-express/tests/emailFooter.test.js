import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EMAIL_FOOTER_MARKER,
  LOGO_CID,
  getLogoFilePath,
  prepareEmailWithStandardFooter
} from '../src/utils/emailFooter.js';

test('standard email footer includes company identity, address, and embedded logo', () => {
  const message = prepareEmailWithStandardFooter({
    from: 'VeraThailandia Reservations <reservation@verathailandia.com>',
    html: '<p>Booking confirmed.</p>',
    text: 'Booking confirmed.'
  });

  assert.match(message.html, new RegExp(EMAIL_FOOTER_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(message.html, /cid:verathailandia_logo_cid/);
  assert.match(message.html, /20th Floor, Room 160\/424-425, ITF Silom Palace/);
  assert.match(message.html, /Tax ID:<\/strong><\/td>[\s\S]*0105547045569/);
  assert.match(message.text, /VeraThailandia Co\., Ltd\./);
  assert.match(message.text, /Bangkok 10500, Thailand/);

  if (getLogoFilePath()) {
    assert.equal(message.attachments.filter((attachment) => attachment.cid === LOGO_CID).length, 1);
  }
});

test('standard email footer and logo are never duplicated', () => {
  const first = prepareEmailWithStandardFooter({
    html: '<p>Message</p>',
    text: 'Message'
  });
  const second = prepareEmailWithStandardFooter(first);

  assert.equal(second.html.split(EMAIL_FOOTER_MARKER).length - 1, 1);
  assert.equal(second.attachments.filter((attachment) => attachment.cid === LOGO_CID).length, 1);
  assert.equal(second.text.split('VeraThailandia Co., Ltd.').length - 1, 1);
});

test('standard email footer stays inside a complete HTML email body', () => {
  const message = prepareEmailWithStandardFooter({
    html: '<!doctype html><html><body><main>Booking confirmed.</main></body></html>'
  });

  assert.ok(message.html.indexOf(EMAIL_FOOTER_MARKER) > message.html.indexOf('<main>'));
  assert.ok(message.html.indexOf(EMAIL_FOOTER_MARKER) < message.html.indexOf('</body>'));
});

test('all backend email gateways apply the shared footer template', () => {
  const root = resolve(process.cwd(), 'src');
  const sources = [
    'utils/workflowEmail.js',
    'controllers/pdfController.js',
    'controllers/emailController.js',
    'controllers/stopsalesController.js',
    'controllers/specialPackageController.js'
  ].map((file) => readFileSync(resolve(root, file), 'utf8'));

  for (const source of sources) {
    assert.match(source, /prepareEmailWithStandardFooter/);
  }
});
