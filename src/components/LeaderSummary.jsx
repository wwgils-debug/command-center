function LeaderSummary({
    leader,
    leaderEvaluations,
    evaluationTemplate,
    roles,
}) {

    const role = roles.find((role) => role.id === leader.roleId)

    const leaderScores = leaderEvaluations.map((evaluation) => {
        const scores = Object.values(evaluation.answers || {})

        if (scores.length === 0) {
            return 0
        }

        return (
            scores.reduce((total, score) => total + score, 0) /
            scores.length
        )
    })

    const overallAverage =
        leaderScores.reduce((total, score) => total + score, 0) /
        leaderScores.length

    const questionAverages = evaluationTemplate.questions.map((question) => {
        const questionScores = leaderEvaluations
            .map((evaluation) => evaluation.answers?.[question.id])
            .filter((score) => score !== undefined)

    if (questionScores.length === 0) {
        return {
            questionId: question.id,
            text: question.text,
            average: 0,
        }
    }
 
    const average =
        questionScores.reduce((total, score) => total + score, 0) /
        questionScores.length

    return {
        questionId: question.id,
        text: question.text,
        average: average,

    }
})
   const highestRatedQuestion = questionAverages.reduce(
        (highest, question) =>
            question.average > highest.average ? question : highest
    )

    const lowestRatedQuestion = questionAverages.reduce(
        (lowest, question) =>
            question.average < lowest.average ? question : lowest
    )
    

    return (
        <div
            className="leader-report"
            style={{
                border: "1px solid #ccc",
                padding: "16px",
                marginBottom: "20px",
                borderRadius: "8px",
            }}
        >
            <h2> Leadership Evaluation Report</h2>


            <h3>{leader.name}</h3>
            <p>{role?.name}</p>
            <p>
                Report generated: {new Date().toLocaleDateString()}
            </p>
            
            <p>
                Based on {leaderEvaluations.length} anonymous evaluations
            </p>

            <h4>Overall Score</h4>

            <p
                style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginTop: "4px",
                }}
            >
                {overallAverage.toFixed(2)} / 5.00
            </p>
            
            <p>
                Highest-rated area: {highestRatedQuestion.text}
                {" - "}
                {highestRatedQuestion.average.toFixed(2)} / 5.00
            </p>

            <p>
                Lowest-rated area: {lowestRatedQuestion.text}
                {" - "}
                {lowestRatedQuestion.average.toFixed(2)} / 5.00
            </p>

            <h4>Question Averages</h4>
            <p>
                Average score for each evaluation question
            </p>

            {questionAverages.map((question) => (
                <div
                    key={question.questionId}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "20px",
                        marginBottom: "8px",
                    }}
                >

                <span>{question.text}</span>
                <span>{question.average.toFixed(2)} / 5.00</span>
                </div>
            ))}

            <p> 
                Written comments: {
                    leaderEvaluations.filter(
                        (evaluation) => evaluation.comments?.trim() !== ""
                    ).length
                }
            </p>

            <h4>Anonymous Comments</h4>

            {leaderEvaluations.filter(
                (evaluation) => evaluation.comments?.trim() !== ""
            ).length === 0&& (
                <p>No written comments were submitted.</p>
            )}

            {leaderEvaluations
                .filter((evaluation) => evaluation.comments?.trim() !== "")
                .map((evaluation) => (
                    <div
                        key={evaluation.id}
                        style={{
                            padding: "10px",
                            marginBottom: "8px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "6px",
                        }}
                    >
                        {evaluation.comments}
                    </div>
                ))}
        </div>
    )
}
export default LeaderSummary