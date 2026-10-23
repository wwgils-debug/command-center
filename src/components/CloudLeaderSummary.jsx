function CloudLeaderSummary({ leader }) {
    const questions = leader.questionAverages ?? []
    const comments = leader.comments ?? []


    // Exclude questions with no answers from highest/lowest ranking.
    const ratedQuestions = questions
        .filter((question) => question.average !== null)
        .sort((a, b) => b.average - a.average)

    const highest = ratedQuestions[0]
    const lowest = ratedQuestions[ratedQuestions.length - 1]

    function formatScore(score) {
        return score == null ? "No answers" : Number(score).toFixed(2)
    }

    return (
        <div className="leader-report">
            <h2>Leadership Evaluation Report</h2>
            <h3>{leader.name}</h3>
            <p>{leader.positionName}</p>
            <p>
                Report generated: {new Date().toLocaleDateString()}
            </p>
            <p>
                Based on {leader.responseCount} anonymous evaluations
            </p>

            <h4>Overall Score</h4>
            <p>{formatScore(leader.overallAverage)} / 5.00</p>

            {highest && (
                <p>
                    Highest-rated area: {highest.text}
                    {" - "}
                    {formatScore(highest.average)} / 5.00
                </p>
             )}

            <h4>Quesiton Averages</h4>

            {questions.map((question) => (
                <p key={question.id}>
                    {question.text}: {formatScore(question.average)}
                </p>
            ))}

            <h4>Anonymous Comments</h4>
            <p>Written comments: {comments.length}</p>

            {comments.length === 0 && (
                <p>No written comments were submitted.</p>
            )}

            {comments.map((comment, index) => (
                <blockquote key={index}>{comment}</blockquote>
            ))}
        </div>
    )
}


export default CloudLeaderSummary