function LeaderCard({ name, role, onStart}) {
    return (
        <div>
            <h3>{name}</h3>
            <p>{role}</p>
            <button onClick={onStart}>Start Evaluation</button>
        </div>
    )
}

export default LeaderCard