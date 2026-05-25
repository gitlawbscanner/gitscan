import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
    );
  }, [location.pathname]);

  return <div ref={ref}>{children}</div>;
}
