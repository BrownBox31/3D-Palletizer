import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Box } from '@mui/material'

// Pages
import Dashboard from './pages/PalletizerDashBoard'
import ConfigurationPage from './pages/ConfigurationPage'
import LayerCreationPage from './pages/LayerCreationPage'
import PalletBuildComposer from './pages/PalletBuidComposer'
import RobotPlacement from './pages/RobertPlacement'
import PalletConfigurationPage from './pages/PalletConfigurationPage'
import ItemConfigurationPage from './pages/ItemConfigurationPage'
import BoxPlacementByRobo from './pages/BoxPlacementByRobo'
import LoginPage from './pages/LoginPage'
import NavBar from './components/NavBar'
import Footer from './components/Footer'  


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const hideNav = location.pathname === '/'

  return (

    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideNav && <NavBar />}

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      {!hideNav && <Footer />}
    </Box>
  )
}

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<ConfigurationPage />} />
          <Route path="/pallet" element={<PalletConfigurationPage />} />
          <Route path="/item" element={<ItemConfigurationPage />} />
          <Route path="/layout" element={<LayerCreationPage />} />
          <Route path="/build-composer" element={<PalletBuildComposer />} />
          <Route path="/robot-placement" element={<RobotPlacement />} />
          <Route path="/box-placement" element={<BoxPlacementByRobo />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
