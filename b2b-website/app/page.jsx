import TopBar from '../components/TopBar';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import QuickRateBar from '../components/QuickRateBar';
import ServicesSection from '../components/ServicesSection';
import ItinerariesSection from '../components/ItinerariesSection';
import InteractivePlanner from '../components/InteractivePlanner';
import DestinationsSection from '../components/DestinationsSection';
import TestimonialsSection from '../components/TestimonialsSection';
import WhyUsSection from '../components/WhyUsSection';
import AgentPortalCTA from '../components/AgentPortalCTA';
import RfpFormSection from '../components/RfpFormSection';
import Footer from '../components/Footer';
import FloatingContact from '../components/FloatingContact';
import ScrollReveal from '../components/ScrollReveal';

export default function HomePage() {
  return (
    <main>
      <ScrollReveal />
      <TopBar />
      <Navbar />
      <HeroSection />
      <QuickRateBar />
      <ServicesSection />
      <ItinerariesSection />
      <InteractivePlanner />
      <DestinationsSection />
      <TestimonialsSection />
      <WhyUsSection />
      <AgentPortalCTA />
      <RfpFormSection />
      <Footer />
      <FloatingContact />
    </main>
  );
}
