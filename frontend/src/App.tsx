import { Routes, Route } from 'react-router'
import { LandingPage } from './pages/LandingPage/LandingPage'
import { WizardPage } from './pages/WizardPage/WizardPage'

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/onboarding-wizard/:sessionId" element={<WizardPage />} />
  </Routes>
)
