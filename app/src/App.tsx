import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { siteConfig } from './config';
import Home from './pages/Home';
import BotPage from './pages/BotPage';
import ActivityPage from './pages/ActivityPage';
import IntelPage from './pages/IntelPage';
import ReportPage from './pages/ReportPage';
import TrendingPage from './pages/TrendingPage';
import PrivacyPage from './pages/PrivacyPage';
import SearchPage from './pages/SearchPage';
import ComparePage from './pages/ComparePage';
import InstallPage from './pages/InstallPage';
import ApiDocsPage from './pages/ApiDocsPage';
import PageTransition from './components/PageTransition';

function App() {
  useEffect(() => {
    document.title = siteConfig.siteTitle || 'gitscan';
    document.documentElement.lang = siteConfig.language || 'en';

    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = siteConfig.siteDescription || '';
  }, []);

  return (
    <PageTransition>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bot" element={<BotPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/intel" element={<IntelPage />} />
        <Route path="/report/:jobId" element={<ReportPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/api-docs" element={<ApiDocsPage />} />
      </Routes>
    </PageTransition>
  );
}

export default App;
