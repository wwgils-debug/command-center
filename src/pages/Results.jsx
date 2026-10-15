import { useState } from "react"
import LeaderSummary from "../components/LeaderSummary"
import { leaders, roles, evaluationTemplate, activeWindowId } from "../data/mockData"
function Results({
    submittedEvaluations,  
    minimumResponses,
    setMinimumResponses,
   
    
 }) {

     const [selectedRole, setSelectedRole] = useState("All")
     const [selectedLeaderId, setSelectedLeaderId] = useState("All")
    const filteredLeaders =
        selectedRole === "All"
            ? leaders
            : leaders.filter((leader) => leader.roleId === selectedRole)

    const reportLeaders =
        selectedLeaderId === "All"
            ? filteredLeaders
            : filteredLeaders.filter(
                (leader) => leader.id === selectedLeaderId
            )

    return ( 
        <section>
            <h2 className="no-print"> Evaluation Results</h2>

                <p>
                    Evaluation window: {activeWindowId}
                </p>
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

                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
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

            {reportLeaders.map((leader) => {
                const leaderEvaluations = submittedEvaluations.filter(
                    (evaluation) =>
                        evaluation.leaderId === leader.id &&
                        evaluation.windowId === activeWindowId
                )

                const responsesNeeded = 
                    minimumResponses - leaderEvaluations.length

                   if (responsesNeeded <= 0) {
                    return (
                        <p key={leader.id}>
                            {leader.name}: {leaderEvaluations.length} responses - Ready to display results
                        </p>
                    )
                   } 

                   return (
                    <p key={leader.id}>
                        {leader.name}: {leaderEvaluations.length} responses - {responsesNeeded} more response
                        {responsesNeeded === 1 ? "" : "s"} needed
                    </p>
                   )
            })}
        </div>

            {!reportLeaders.some((leader) => {
                const leaderEvaluations = submittedEvaluations.filter(
                    (evaluation) => 
                        evaluation.leaderId === leader.id &&
                        evaluation.windowId === activeWindowId
                )

                return leaderEvaluations.length >= minimumResponses
            }) && (

                
                <p>
                    No leaders currently have enough responses to display results.
                </p>
            )}

        
            {reportLeaders.map((leader) => {
                const leaderEvaluations = submittedEvaluations.filter(
                    (evaluation) => 
                        evaluation.leaderId === leader.id &&
                        evaluation.windowId === activeWindowId
                )

                if (leaderEvaluations.length < minimumResponses) {
                    return null
                }

                return (
                    <LeaderSummary
                    key={leader.id}
                    leader={leader}
                    leaderEvaluations={leaderEvaluations}
                    evaluationTemplate={evaluationTemplate}
                    roles={roles}
                />
            ) 
        })}
        </section>
    )
}



export default Results