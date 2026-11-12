import { useEffect, useState } from "react"
import CloudLeaderSummary from "../components/CloudLeaderSummary"
import { supabase } from "../lib/supabase"


function Results({
    storeId,
    minimumResponses,
    setMinimumResponses,
}) {
     const [selectedRole, setSelectedRole] = useState("All")
     const [selectedLeaderId, setSelectedLeaderId] = useState("All")
     const [report, setReport] = useState(null)
     const [reportError, setReportError] = useState("")
     const [demoSettings, setDemoSettings] = useState(null)
     const [changingDemoMode, setChangingDemoMode] = useState(false)
     const [refreshKey, setRefreshKey] =useState(0)

     useEffect(() => {
        if (!storeId) return

        let active = true

        async function loadReport() {
            try {
                setReportError("")

                const { data: settings, error: settingsError } =
                    await supabase.rpc("get_demo_report_settings", {
                        p_store_id: storeId,
                    })

                if (settingsError) throw settingsError
                if (active) setDemoSettings(settings)

                

                const { data: window, error: windowError } = await supabase
                    .from("evaluation_windows")
                    .select("id")
                    .eq("store_id", storeId)
                    .lte("starts_at", new Date().toISOString())
                    .order("starts_at", { ascending:false })
                    .order("id")
                    .limit(1)
                    .maybeSingle()

                    if (windowError) throw windowError
                    if (!window) throw new Error("No evaluation window is available for results.")
                const { data, error} = await supabase.rpc("get_evaluation_report", {
                    p_window_it: window.id,
                })

                if (error) throw error
                if (active) setReport(data)
            } catch (error) {
                if (active) setReportError(error.message)
            }
        }

        loadReport()

        return () => {
            active = false
        }

     }, [storeId, refreshKey])

    const liveLeaders = report?.leaders ?? []
    const positionNames = [...new Set(liveLeaders.map((leader) => leader.positionName))]

    const filteredLeaders =
     selectedRole === "All"
        ? liveLeaders
        : liveLeaders.filter((leader) => leader.positionName === selectedRole)

    const reportLeaders =
        selectedLeaderId === "All"
            ? filteredLeaders
            : filteredLeaders.filter(
                (leader) => leader.id === selectedLeaderId
            )

    function canShowReport(leader) {
        return leader.ready && leader.responseCount >= minimumResponses
    }
    return ( 
        <section>
            <h2 className="no-print"> Evaluation Results</h2>
            {reportError && <p role="alert">{reportError}</p>}
            
            {demoSettings?.canToggle && (
                <div className="no-print">
                    <p>
                        Live demo reports: {demoSettings.liveReports ? "On" : "Off"}
                    </p>

                    <button
                        type="button"
                        disabled={changingDemoMode}
                        onClick={async () => {
                            setChangingDemoMode(true)
                            setReportError("")

                            try {
                                const { error } = await supabase.rpc(
                                    "set_demo_live_reports",
                                    {
                                        p_enabled: !demoSettings.liveReports,
                                    }
                                )

                                if (error) throw error

                                setRefreshKey((current) => current + 1)
                            } catch (error) {
                                setReportError(error.message)
                            } finally {
                                setChangingDemoMode(false)
                            }
                        }}
                    >

                        {changingDemoMode
                            ? "Updating..."
                            : demoSettings.liveReports
                                ? "Turn live demo off"
                                : "Turn live demo on"}
                    </button>
                </div>
            )}

            {report && (
                <p>Evaluation window: {report.windowName}</p>
            )}
            
        <div className="no-print">
            <label>
                Leader:
                <select
                    value={selectedLeaderId}
                    onChange={(event) => setSelectedLeaderId(event.target.value)}
                >
                    <option value="All">All</option>

                    {filteredLeaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                            {leader.name}
                        </option>
                    ))}
                </select>
            </label>


                <label>
                Leadership Level:
                <select
                    value={selectedRole}
                    onChange={(event) => {
                        setSelectedRole(event.target.value)
                        setSelectedLeaderId("All")
                    }}
                >
                 
                    <option value="All">All</option>

                    {positionNames.map((positionName) => (
                        <option key={positionName} value={positionName}>
                            {positionName}
                        </option>
                    ))}
                    </select>
                </label>
        </div>

        <div className="no-print">
            <label>
                Minimum responses required:
                <input
                    type="number"
                    min="5"
                    value={minimumResponses}
                    onChange={(event) =>
                        setMinimumResponses(
                            Math.max(5, Number(event.target.value))
                        )
                    }
                />
             </label>
        </div>

        <div className="no-print">   
                <button onClick={() => window.print()}>
                    Print Results
                </button>
        </div>

        <div className="no-print">
            <h3>Response Status</h3>

            {reportLeaders.map((leader) => (
                <p key={leader.id}>
                    {leader.name}: {leader.responseCount} responses
                    {" - "}
                    {canShowReport(leader)
                        ? "Ready to display results"
                        : "Not enough responses"}
                </p>
            ))}

      
        </div>

           {report && !reportLeaders.some(canShowReport) && (
            <p>No leaders currently have enough responses to display results.</p>
           )}

           {reportLeaders
            .filter(canShowReport)
            .map((leader) => (
                <CloudLeaderSummary key={leader.id} leader={leader} />
            ))}
        </section>
    )
}



export default Results