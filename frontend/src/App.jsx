import { Routes, Route } from 'react-router-dom'
import FleetDashboard from './pages/FleetDashboard.jsx'
import AircraftDetail from './pages/AircraftDetail.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<FleetDashboard />} />
      <Route path="/aircraft/:id" element={<AircraftDetail />} />
    </Routes>
  )
}

export default App
