function Navigation({ setCurrentPage }) {
    return (
        <nav className="no-print">
            <button onClick={() => setCurrentPage('dashboard')}>
                Dashboard
            </button>

            <button onClick={() => setCurrentPage('evaluations')}>
                Evaluations
            </button>
            
            <button onClick={() => setCurrentPage('metrics')}>
                Metrics
            </button>

            <button onClick={() => setCurrentPage("results")}>
                Results
            </button>

        </nav>
    )
}

export default Navigation