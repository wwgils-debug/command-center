import LeaderSummary from "../components/LeaderSummary"
import { leaders, evaluationTemplate } from "../data/mockData"

function Results({ submittedEvaluations}) {
    return ( 
        <section>
            <h2> Evaluation Results</h2>

            {leaders.map((leader) => {
                const leaderEvaluations = submittedEvaluations.filter(
                    (evaluation) => evaluation.leaderId === leader.id
                )

                if (leaderEvaluations.length === 0) {
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