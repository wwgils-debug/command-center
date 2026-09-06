import { useState} from 'react'

import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Evaluations from "./pages/Evaluations";
import Metrics from "./pages/Metrics";

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  return (
    <main>
      <Header />
      <Navigation setCurrentPage={setCurrentPage}/>
      
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'evaluations' && <Evaluations />}
      {currentPage === 'metrics' && <Metrics />}
    </main>
  )
}

export default App