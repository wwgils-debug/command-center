import {useState} from "react"
import LeaderCard from "../components/LeaderCard"
import { leaders, roles } from "../data/mockData"

const evaluationQuestions = [
    { id: 1, text: "Communicates clearly with the team"},
    { id: 2, text: "Provides effective leadership during shifts"},
    { id: 3, text: "Treats team members with respect"},
]

function Evaluations() {
   const [selectedRole, setSelectedRole] = useState("All")
   const [selectedLeader, setSelectedLeader] = useState(null)
   const [answers, setAnswers] = useState({})
   const [comments, setComments] = useState("")
   const [submitted, setSubmitted] = useState(false)

   const allQuestionsAnswered =
        evaluationQuestions.every((question) => answers[question.id])

   const handleSubmit = () => {
        if (!allQuestionsAnswered) {
            return
        }

        const evaluation = {
            leaderId: selectedLeader.id,
            answers: answers,
            comments: comments,
        }

     
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

                    {evaluationQuestions.map((question) => (
                        <div key={question.id}>
                            <p>{question.text}</p>

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
                                    fontWeight: answers[question.id] === score ? "bold" : "normal",
                                }}
                            >
                                {score}
                            </button>                                    
                        ))}
                    </div>
                    ))} 

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