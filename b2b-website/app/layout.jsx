import './globals.css';
import { LanguageProvider } from '../context/LanguageContext';

export const metadata = {
  title: 'Vera Thailandia | Premier Inbound DMC & Tour Operator in Thailand (B2B)',
  description: 'Vera Thailandia is the leading incoming Destination Management Company (DMC) and Tour Operator in Thailand specialized in the Italian and European travel market.',
  keywords: 'Tour Operator Thailandia, DMC Thailand, Viaggi Thailandia B2B, Incoming Thailandia, Agenzia Viaggi Thailandia, Escursioni Thailandia',
  openGraph: {
    title: 'Vera Thailandia - B2B Inbound Tour Operator & DMC',
    description: 'Direct hotel rates, bespoke itineraries, Italian-speaking guides and 24/7 assistance across Thailand for travel agencies.',
    url: 'https://www.verathailandia.com',
    siteName: 'Vera Thailandia',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
