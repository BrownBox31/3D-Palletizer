import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Box } from '@mui/material'

import Dashboard from './pages/PalletizerDashBoard'
import ConfigurationPage from './pages/ConfigurationPage'
import LayerCreationPage from './pages/LayerCreationPage'
import PalletBuildComposer from './pages/PalletBuidComposer'
import RobotPlacement from './pages/RobertPlacement'
import PalletConfigurationPage from './pages/PalletConfigurationPage'
import ItemConfigurationPage from './pages/ItemConfigurationPage'
import BoxPlacementByRobo from './pages/BoxPlacementByRobo'
import LoginPage from './pages/LoginPage'
import OperatorRunPage from './pages/OperatorRunPage'
import NavBar from './components/NavBar'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const hideNav = location.pathname === '/'

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const root = document.getElementById('root')
    if (root) root.style.overflow = 'hidden'
  }, [location.pathname])

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {!hideNav && <NavBar />}

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
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
          <Route path="/run" element={<OperatorRunPage />} />
          <Route path="/box-placement" element={<BoxPlacementByRobo />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
