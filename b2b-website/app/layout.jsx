import './globals.css';
import { LanguageProvider } from '../context/LanguageContext';

export const metadata = {
  title: 'Vera Thailandia | Thailand DMC for Travel Professionals',
  description: 'Thailand inbound operations, tailor-made journeys, accommodation, transfers and local support for travel agencies and tour operators.',
  keywords: 'Tour Operator Thailandia, DMC Thailand, Viaggi Thailandia B2B, Incoming Thailandia, Agenzia Viaggi Thailandia, Escursioni Thailandia',
  openGraph: {
    title: 'Vera Thailandia | Thailand Inbound DMC',
    description: 'One local operations team for accommodation, touring, transport and guest support across Thailand.',
    url: 'https://www.verathailandia.com',
    siteName: 'Vera Thailandia',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
