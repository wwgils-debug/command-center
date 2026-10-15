export const roles = [
    {id: "role-1", name: "Director", level:1},
    {id: "role-2", name: "Supervisor", level: 2},
    {id: "role-3", name: "Coach", level: 3},    
]

export const leaders = [
    {id: "leader-1", name: "Alex", roleId: "role-1"},
    {id: "leader-2", name: "Jordan", roleId: "role-2"},
    {id: "leader-3", name: "Taylor", roleId: "role-3"},
]

export const evaluationTemplate = {
    id: "leadership-default", 
    version: 1,
    name: "Leadership Evaluation",
    questions: [
        {
            id: 1, 
            text: "Communicates clearly with the team",
            required: true,
            type: "rating",
        },
        {
            id: 2, 
            text: "Provides effective leadership during shifts",
            required: true,
            type: "rating",
        },
        {
            id: 3, 
            text: "Treats team members with respect",
            required: true,
            type: "rating",
        },
    ],
}

export const activeWindowId = "2026-fall"

export const evaluationTickets = [
    {
        id: "ticket-1",
        leaderId: "leader-1",
        windowId: "2026-fall",
        used: false,
    },
    {
        id: "ticket-2",
        leaderId: "leader-2",
        windowId: "2026-fall",
        used: false,
    },
    {
        id: "ticket-3",
        leaderId: "leader-3",
        windowId: "2026-fall",
        used: false,
    },
]