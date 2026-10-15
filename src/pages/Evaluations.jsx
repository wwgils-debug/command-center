import {useState, useEffect } from "react"
import LeaderCard from "../components/LeaderCard"
import { 
    leaders, 
    roles, 
    evaluationTemplate,
    evaluationTickets,
    activeWindowId,
 } from "../data/mockData"

function Evaluations({
    submittedEvaluations,
    setSubmittedEvaluations
}) {
   console.log("Active window:", activeWindowId)
   const [selectedRole, setSelectedRole] = useState("All")
   const [selectedLeader, setSelectedLeader] = useState(null)
   const [answers, setAnswers] = useState({})
   const [comments, setComments] = useState("")
   const [submitted, setSubmitted] = useState(false)
   const [tickets, setTickets] = useState(() => {
    const savedTickets = localStorage.getItem("evaluationTickets")

    return savedTickets
        ? JSON.parse(savedTickets)
        : evaluationTickets
   })

   const [ticketMessage, setTicketMessage] = useState("")


   useEffect(()=> {
        localStorage.setItem(
            "submittedEvaluations",
            JSON.stringify(submittedEvaluations)
        )
   }, [submittedEvaluations])

   useEffect(() => {
    localStorage.setItem(
        "evaluationTickets",
        JSON.stringify(tickets)
    )
   }, [tickets])


   const allQuestionsAnswered =
        evaluationTemplate.questions
        .filter((question) => question.required)
        .every((question) => answers[question.id])

   const handleSubmit = () => {
        if (!allQuestionsAnswered) {
            return
        }
        const availableTicket = tickets.find(
            (ticket) =>
                ticket.leaderId === selectedLeader.id &&
                ticket.windowId === activeWindowId &&
                ticket.used === false
        )
        
        if (!availableTicket) {
            setTicketMessage("No valid evaluation ticket is available.")
            return
        }

        const evaluation = {
            id: crypto.randomUUID(),
            leaderId: selectedLeader.id,
            windowId: activeWindowId,
            templateId: evaluationTemplate.id,
            templateVersion: evaluationTemplate.version,
            answers: answers,
            comments: comments.trim(),
            status: "submitted",
        }

        console.log("Evaluation:", evaluation)

        setSubmittedEvaluations([
            ...submittedEvaluations,
            evaluation,
        ])
        setTickets(
            tickets.map((ticket) =>
                ticket.id === availableTicket.id
                    ? {...ticket, used: true}
                    :ticket
            )
        )
        setSubmitted(true)
        setAnswers({})
        setComments("")
        setSelectedLeader(null)
   }

   const filteredLeaders =
   selectedRole === "All"
        ? leaders
        : leaders.filter((leader) => leader.roleId === selectedRole)

        if (selectedLeader) {
            const role = roles.find((role) => role.id === selectedLeader.roleId)

            return (
                <section>
                    <h2>Leadership Evaluation</h2>
                    
                    <p>
                        Evaluation window: {activeWindowId}
                    </p>

                    <p>
                        Evaluating: {selectedLeader.name} - {role?.name}
                    </p>

                    <p>
                        Rating scale: 1 = Needs Improvement, 5 = Excellent
                    </p>

                    <button onClick={() => {
                        setAnswers({})
                        setComments("")
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

                    <button 
                        onClick={handleSubmit}
                        disabled={!allQuestionsAnswered}
                    >

                        Submit Evaluation
                    </button>

                </section>
            )
        }

   return (
    <section>
        <h2>Evaluations</h2>

        <p>
            Evaluation window: {activeWindowId}
        </p>

        <p>
            Submitted evaluations for thie window:{
                submittedEvaluations.filter(
                    (evaluation) => evaluation.windowId === activeWindowId
                ).length
            }
        </p>
        <button
            onClick={() => {
                setTickets(evaluationTickets)
                setTicketMessage("Test tickets reset.")
            }}
        >

        Development: Reset Test Tickets
    </button>

    <p>
        Testing tool only - restores mock evaluation tickets.
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

            const hasAvailableTicket = tickets.some(
                (ticket) =>
                    ticket.leaderId === leader.id &&
                    ticket.windowId === activeWindowId &&
                    ticket.used === false
            )
        
            return (
            <LeaderCard
                key={leader.id}
                name={leader.name}
                role={role?.name}
                disabled={!hasAvailableTicket}
                ticketStatus={
                    hasAvailableTicket
                        ? "Evaluation available"
                        : "No evaluation available"
                }
                onStart={() => {
                    console.log("Tickets:", tickets)
                    console.log("Active window:", activeWindowId)
                    const availableTicket = tickets.find(
                        (ticket) =>
                            ticket.leaderId === leader.id &&
                            ticket.windowId === activeWindowId &&
                            ticket.used === false
                    )

                    if (!availableTicket) {
                        setTicketMessage("No evaluation ticket is available for this leader.")
                        return
                    }
                    setTicketMessage("")
                    setSubmitted(false)
                    setSelectedLeader(leader)
                }}
            />
            )
        })}
        </section>
   )
}

export default Evaluations