function LeaderSummary({
    leader,
    leaderEvaluations,
    evaluationTemplate,
}) {

    const leaderScores = leaderEvaluations.map((evaluation) => {
        const scores = Object.values(evaluation.answers)

        return (
            scores.reduce((total, score) => total + score, 0) /
            scores.length
        )
    })

    const overallAverage =
        leaderScores.reduce((total, score) => total + score, 0) /
        leaderScores.length

    const questionAverages = evaluationTemplate.questions.map((question) => {
        const questionScores = leaderEvaluations.map(
            (evaluation) => evaluation.answers[question.id]
        )
    
    const average =
        questionScores.reduce((total, score) => total + score, 0) /
        questionScores.length

    return {
        questionId: question.id,
        text: question.text,
        average: average,

    }
})

    return (
        <div>
            <h3>{leader.name}</h3>

            <p>
                Evaluations received: {leaderEvaluations.length}
            </p>

            <p>
                Overall average: {overallAverage.toFixed(2)}

            </p>

            {questionAverages.map((question) => (
                <p key={question.questionId}>
                    {question.text}: {question.average.toFixed(2)}
                </p>
            ))}
        </div>
     )
}

export default LeaderSummary