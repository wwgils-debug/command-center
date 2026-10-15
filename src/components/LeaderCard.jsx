function LeaderCard({ name, role, onStart, disabled, ticketStatus}) {
    return (
        <div>
            <h3>{name}</h3>
            <p>{role}</p>
            <p>{ticketStatus}</p>
            
            <button 
                onClick={onStart}
                disabled={disabled}
            >
                {disabled ? "No Ticket Available" : "Start Evaluation"}
            </button>

        </div>
    )
}

export default LeaderCard