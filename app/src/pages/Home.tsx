import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../sections/Hero';
import StatsBar from '../sections/StatsBar';
import LiveScanTicker from '../components/LiveScanTicker';
import ScanSection from '../sections/ScanSection';
import HowItWorks from '../sections/HowItWorks';
import Features from '../sections/Features';
import TechStack from '../sections/TechStack';
import CTASection from '../sections/CTASection';
import Footer from '../sections/Footer';

export default function Home() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, [hash]);

  return (
    <>
      <main>
        <Hero />
        <StatsBar />
        <LiveScanTicker />
        <ScanSection />
        <HowItWorks />
        <Features />
        <TechStack />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
