import { useState} from 'react'

import Results from "./pages/Results"
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Evaluations from "./pages/Evaluations";
import Metrics from "./pages/Metrics";

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [submittedEvaluations, setSubmittedEvaluations] = useState(() => {
    const savedEvaluations = localStorage.getItem("submittedEvaluations")

    return savedEvaluations
      ? JSON.parse(savedEvaluations)
      : []
  })

  return (
    <main>
      <Header />
      <Navigation setCurrentPage={setCurrentPage}/>
      
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'evaluations' && (
        <Evaluations
          submittedEvaluations={submittedEvaluations}
          setSubmittedEvaluations={setSubmittedEvaluations}
        />
      )}
      {currentPage === 'metrics' && <Metrics />}
      {currentPage === "results" && (
        <Results submittedEvaluations={submittedEvaluations} />
      )}
    </main>
  )
}

export default App