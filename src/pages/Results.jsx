import LeaderSummary from "../components/LeaderSummary"
import { leaders, evaluationTemplate } from "../data/mockData"

function Results({
    submittedEvaluations,  
    minimumResponses,
    setMinimumResponses,
 }) {
    return ( 
        <section>
            <h2> Evaluation Results</h2>

            <div>
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
            {leaders.map((leader) => {
                const leaderEvaluations = submittedEvaluations.filter(
                    (evaluation) => evaluation.leaderId === leader.id
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
                />
            ) 
        })}
        </section>
    )
}

export default Results