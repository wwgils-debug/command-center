import {useState, useEffect } from "react"
import LeaderCard from "../components/LeaderCard"
import { 
    leaders, 
    roles, 
    evaluationTemplate,
    evaluationTickets,
 } from "../data/mockData"

function Evaluations({
    submittedEvaluations,
    setSubmittedEvaluations
}) {
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

        const evaluation = {
            id: crypto.randomUUID(),
            leaderId: selectedLeader.id,
            templateId: evaluationTemplate.id,
            templateVersion: evaluationTemplate.version,
            answers: answers,
            comments: comments,
            status: "submitted",
        }

        console.log("Evaluation:", evaluation)

        setSubmittedEvaluations([
            ...submittedEvaluations,
            evaluation,
        ])
        setTickets(
            tickets.map((ticket) =>
                ticket.leaderId === selectedLeader.id && ticket.used === false
                    ? { ...ticket, used: true }
                    : ticket
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
                        Evaluating: {selectedLeader.name} - {role?.name}
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
        <p>Submitted evaluations: {submittedEvaluations.length}</p>
        {ticketMessage && (
            <p>{ticketMessage}</p>
        )}
        
       

        {submitted && (
            <p>Evaluation submitted successfully.</p>
        )}

        <p>Leaders loaded: {leaders.length}</p>
        <p>Filtered leaders: {filteredLeaders.length}</p>

        <label>
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
                onStart={() => {
                    const availableTicket = tickets.find(
                        (ticket) =>
                            ticket.leaderId === leader.id &&
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