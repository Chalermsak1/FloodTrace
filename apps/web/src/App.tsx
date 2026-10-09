import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { MapPage } from './pages/MapPage';
import { AreaDetailPage } from './pages/AreaDetailPage';
import { MyAreaPage } from './pages/MyAreaPage';
import { ReportPage } from './pages/ReportPage';
import { CasesPage } from './pages/CasesPage';
import { OfficialUpdatesPage } from './pages/OfficialUpdatesPage';
import { ForecastPage } from './pages/ForecastPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { DataMethodologyPage } from './pages/DataMethodologyPage';
import { AboutPage } from './pages/AboutPage';
import { AdminReportsPage } from './pages/AdminReportsPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการโหลดหน้าเว็บ">
      <BrowserRouter>
        <Routes>
          {/* Internal Staff Operations Console (Protected & Separated from Citizen UI) */}
          <Route path="/admin" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />

          {/* Public Citizen Interface */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="area-detail" element={<AreaDetailPage />} />
            <Route path="my-area" element={<MyAreaPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="official-updates" element={<OfficialUpdatesPage />} />
            <Route path="news" element={<Navigate to="/official-updates?tab=news" replace />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
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
