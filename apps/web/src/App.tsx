import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { MapPage } from './pages/MapPage';
import { MyAreaPage } from './pages/MyAreaPage';
import { ReportPage } from './pages/ReportPage';
import { CasesPage } from './pages/CasesPage';
import { OfficialUpdatesPage } from './pages/OfficialUpdatesPage';
import { DataMethodologyPage } from './pages/DataMethodologyPage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการโหลดหน้าเว็บ">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="my-area" element={<MyAreaPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="official-updates" element={<OfficialUpdatesPage />} />
            <Route path="data-methodology" element={<DataMethodologyPage />} />
            <Route path="about" element={<AboutPage />} />
            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
