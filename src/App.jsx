import { useEffect, useState} from 'react'

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

     const [minimumResponses,  setMinimumResponses ] = useState(() => {
      const savedMinimumResponses = localStorage.getItem("minimumResponses")

      return savedMinimumResponses
        ? Number(savedMinimumResponses)
        :5
     })

     useEffect(()=> {
      localStorage.setItem("minimumResponses", minimumResponses)
      }, [minimumResponses])
      
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
        <Results 
          submittedEvaluations={submittedEvaluations} 
          minimumResponses={minimumResponses}
          setMinimumResponses={setMinimumResponses}
        />
      )}
    </main>
  )
}

export default App