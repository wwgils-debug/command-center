import Login from "./pages/Login"
import { supabase } from "./lib/supabase"
import { useEffect, useState} from 'react'

import Results from "./pages/Results"
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Evaluations from "./pages/Evaluations";
import Metrics from "./pages/Metrics";

function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authError, setAuthError] = useState("")
  const [stores, setStores] = useState([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [storeError, setStoreError] = useState("")
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

  useEffect(() => {
    let active = true
    //Listen for Login, Logout, and session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setCheckingSession(false)
      }
    })

    //Restore an existing Login when the app opens.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return

        if (error) {
          setAuthError(error.message)
        }

        setSession(data.session)
        setCheckingSession(false)
      })
      .catch(() => {
        if (!active) return

        setAuthError("Unable to check your login. Please refresh.")
        setCheckingSession(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

useEffect(() => {
  let active = true

  if (!session?.user.id) {
    setStores([])
    setStoreError("")
    setLoadingStores(false)
    return
  }

  async function loadStores() {
    setLoadingStores(true)
    setStoreError("")
    setStores([])

    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, store_number")
        .order("name")

      if (!active) return

      if (error) {
        setStoreError(error.message)
      } else {
        setStores(data ?? [])
      }
    } catch {
      if (active) {
        setStoreError("Unable to load stores. Please try again.")
      }
    } finally {
        if (active) {
          setLoadingStores(false)    
      }
    }
  }

  loadStores()

  return () => {
    active = false
  }
}, [session?.user.id])


  if (checkingSession) {
    return <p>Checking login...</p>
  }
  
  if (!session) {
    return (
      <main>
        <Header />
        {authError && <p role="alert">{authError}</p>}
        <Login />
      </main>
    )
  }
      
  return (
    <main>
      <Header />
      
      <section>
        {loadingStores && <p>Loading stores...</p>}

        {storeError && <p role="alert">{storeError}</p>}

        {!loadingStores && !storeError && stores.length === 0 &&(
          <p>No accessible stores found.</p>
        )}

        {stores.map((store) => (
          <p key={store.id}>
              Store: {store.name} ({store.store_number})
          </p>
        ))}
      </section>

      <button
        onClick={async () => {
          const { error } = await supabase.auth.signOut()

          if (error) {
            setStoreError(error.message)
          }
        }}
      >

        Log out
      </button>


      <Navigation setCurrentPage={setCurrentPage}/>
      
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'evaluations' && (
        <Evaluations
          storeId={stores.length === 1 ? stores[0].id : null}
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