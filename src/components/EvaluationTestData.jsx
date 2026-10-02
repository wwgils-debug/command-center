function EvaluationTestData({
    submittedEvaluations,
    leaders,
    evaluationTemplate,
}) {
    return(
        <>
            <h3>Development Test Data</h3>
            
            {submittedEvaluations.map((evaluation) => {
                const leader = leaders.find(
                    (leader) => leader.id === evaluation.leaderId
                )

                const scores = Object.values(evaluation.answers)

                const average =
                    scores.reduce((total, score) => total +score, 0) /
                    scores.length

                return (
                    <div key={evaluation.id}>
                        <h3>{leader?.name}</h3>

                        <p>
                            Average Score: {average.toFixed(2)}
                        </p>

                        {evaluationTemplate.questions.map((question) => (
                            <p key={question.id}>
                                {question.text}: {evaluation.answers[question.id]}
                            </p>
                        ))}

                        <p>
                            Comments: {evaluation.comments || "No comments"}
                        </p>

                        <p> 
                            Status: {evaluation.status}
                        </p>
                    </div>
                )
            })}
        </>
    )
}
export default EvaluationTestData