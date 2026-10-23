import { loadEvaluationWindow } from "../lib/loadEvaluationWindow"
import {useState, useEffect } from "react"
import LeaderCard from "../components/LeaderCard"
import { supabase } from "../lib/supabase"
import { getEvaluationTicket } from "../lib/getEvalulationTicket"
import { anonymousSupabase } from "../lib/anonymousSupabase"


function Evaluations({
    storeId,
}) {
   
   const [selectedRole, setSelectedRole] = useState("All")
   const [selectedLeader, setSelectedLeader] = useState(null)
   const [answers, setAnswers] = useState({})
   const [comments, setComments] = useState("")
   const [submitted, setSubmitted] = useState(false)
   
   const [ticketMessage, setTicketMessage] = useState("")
   const [roles, setRoles] = useState([])
   const [leaders, setLeaders] = useState([])
   const [loadingLeaders, setLoadingLeaders] = useState(true)
   const [leaderError, setLeaderError] = useState("")
   const [activeWindow, setActiveWindow] = useState(null)
   const [evaluationTemplate, setEvaluationTemplate] = useState({
        questions: []
   })

   const activeWindowId = activeWindow?.id
   const [selectedTicket, setSelectedTicket] = useState(null)
   const [requestingTicket, setRequestingTicket] = useState(false)
   const [submitting, setSubmitting] = useState(false)

    
useEffect(() => {
    let active = true

    async function loadLeaders() {
        setLoadingLeaders(true)
        setLeaderError("")
        setRoles([])
        setLeaders([])
        setSelectedRole("All")
        setSelectedLeader(null)
        setAnswers({})
        setComments("")

        try {
            if (!storeId) {
                throw new Error("Select one store to load its leaders.")
            }

            const windowData = await loadEvaluationWindow(storeId)

            if (!active) return

            setActiveWindow(windowData.window)
            setEvaluationTemplate(windowData.template)

            //Load this stores positions.
            const { data: positions, error: positionsError } =
                await supabase
                    .from("positions")
                    .select("id, name, hierarchy_level")
                    .eq("store_id", storeId)
                    .order("hierarchy_level")

                    if (positionsError) throw positionsError
                    if (!active) return

                    // A store without positions cannot have leaders yet.
                    if (positions.length === 0) return

                    //Load active leaders attached to those positions.
                    const { data: storeLeaders, error: leadersError } =
                        await supabase
                            .from("leaders")
                            .select("id, name, position_id")
                            .in("position_id", positions.map((position) => position.id))
                            .eq("active", true)
                            .order("name")

                    if (leadersError) throw leadersError
                    if (!active) return

                    setRoles(positions)

                    //Match the field name already used by our components.
                    setLeaders(
                        storeLeaders.map((leader) => ({
                            id: leader.id,
                            name: leader.name,
                            roleId: leader.position_id,
                        }))
                    )
        } catch (error) {
            if (active) {
                setLeaderError(error.message || "Unable to load leaders.")
            }
        } finally {
            if (active) {
                setLoadingLeaders(false)
            }
        }
    }

    loadLeaders()

    return () => {
        active = false
    }
}, [storeId])

   const allQuestionsAnswered =
        evaluationTemplate.questions
        .filter((question) => question.required)
        .every((question) => answers[question.id])

   const handleSubmit = async () => {
    if (submitting || !allQuestionsAnswered) return

    if (!selectedTicket?.token) {
        setTicketMessage("No valid evaluation ticket is available.")
        return
    }

    setSubmitting(true)
    setTicketMessage("")

    try {
        const { data, error } = await anonymousSupabase.rpc(
            "submit_evaluation",
            {
                p_token: selectedTicket.token,
                p_answers: answers,
                p_comments: comments.trim(),
            }
        )

        if (error) throw error
        if (data !== true) {
            throw new Error("Submission was not confirmed.")
        }

        //Retain a used marker, but remove the secret token.
        try {
            localStorage.setItem(
                selectedTicket.storageKey,
                JSON.stringify({
                    leaderId: selectedTicket.leaderId,
                    windowId: selectedTicket.windowId,
                    expiresAt: selectedTicket.expiresAt,
                    used: true,
                })
            )
        } catch {
            setTicketMessage(
                "Evaluation saved, but the browser could not update its ticket record."
            )
        }

        setSelectedTicket(null)
        setSubmitted(true)
        setAnswers({})
        setComments("")
        setSelectedLeader(null)
    } catch (error) {
        setTicketMessage(
            error.message || "Unable to confirm submission. Your answers are still here."
        )
    } finally {
        setSubmitting(false)
    }
   }

   const filteredLeaders =
   selectedRole === "All"
        ? leaders
        : leaders.filter((leader) => leader.roleId === selectedRole)

        if (loadingLeaders) {
            return <p>Loading leaders...</p>
        }

        if (leaderError) {
            return <p role="alert">{leaderError}</p>
        }

        if (leaders.length === 0) {
            return <p>No active leaders were found for this store.</p>
        }

        if (selectedLeader) {
            const role = roles.find((role) => role.id === selectedLeader.roleId)

            return (
                <section>
                    <h2>Leadership Evaluation</h2>
                    
                    <p>
                        Evaluation window: {activeWindow?.name}
                    </p>

                    <p>
                        Evaluating: {selectedLeader.name} - {role?.name}
                    </p>

                    <p>
                        Rating scale: 1 = Needs Improvement, 5 = Excellent
                    </p>

                    <button 
                        disabled={submitting}
                        onClick={() => {
                            setAnswers({})
                            setComments("")
                            setSelectedTicket(null)
                            setTicketMessage("")
                            setSelectedLeader(null)
                        }}
                    >
                        Back to Leaders
                    </button>

                    {evaluationTemplate.questions.map((question) => (
                        <div key={question.id}>
                            <p>
                                {question.text}
                                {question.required && " *"}
                            </p>

                            {question.type === "rating" && (
                                <>
                                    {[1, 2, 3, 4, 5].map((score) => (
                                        <button
                                            key={score}
                                            onClick={() =>
                                                setAnswers({
                                                    ...answers,
                                                    [question.id]: score,
                                                })
                                            }
                                            style={{
                                                fontWeight: 
                                                    answers[question.id] === score ? "bold" : "normal",
                                            }}
                                        >
                                            {score}
                                        </button>                                    
                                        ))}
                                    </>
                                )}
                            </div>
                    ))}
                        
                    <p>* Required</p>
                    
                    <p>
                        Additional comments (optional)
                    </p>

                    <textarea
                        placeholder="Additional comments"
                        rows="4"
                        value={comments}
                        onChange={(event) => setComments(event.target.value)}
                    ></textarea>

                    <br />

                    {ticketMessage && <p role="alert">{ticketMessage}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !allQuestionsAnswered || !selectedTicket}
                    >
                        {submitting ? "Submitting..." : "Submit Evaluation"}
                    </button>

                </section>
            )
        }

   return (
    <section>
        <h2>Evaluations</h2>

        <p>
            Evaluation window: {activeWindow?.name}
        </p>

       

        {ticketMessage && (
            <p>{ticketMessage}</p>
        )}
        
       

        {submitted && (

            <p>
                Evaluation submitted successfully. Your evaluation ticket has been used.
            </p>
        )}

        

        <label>
            <h3>Select a Leader to Evaluate</h3>

            Leadership Level:
            <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                >
                <option value="All">All</option>
                
                {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                        {role.name}
                    </option>
                ))}
                </select>
        </label>

        {filteredLeaders.map((leader) => {
            const role = roles.find((role) => role.id === leader.roleId)

            return (
                <LeaderCard
                    key={leader.id}
                    name={leader.name}
                    role={role?.name}
                    disabled={requestingTicket}
                    ticketStatus={
                        requestingTicket
                        ? "Requesting ticket..."
                        : "Eligibility checked when selected"
                    }
                    onStart={async () => {
                        if (requestingTicket) return
                        setRequestingTicket(true)
                        setTicketMessage("")
                        setSelectedTicket(null)

                        try {
                            const ticket = await getEvaluationTicket(
                                leader.id,
                                activeWindowId
                            )

                            setSelectedTicket(ticket)
                            setSubmitted(false)
                            setAnswers({})
                            setComments("")
                            setSelectedLeader(leader)
                        } catch (error) {
                            setTicketMessage(
                                error.message || "Unable to obtain a ticket."
                            )
                        } finally {
                            setRequestingTicket(false)
                        }
                    }}
                />    
            )
        })}
    </section>
   )
}

export default Evaluations