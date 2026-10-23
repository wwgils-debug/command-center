import { supabase } from "./supabase"

export async function getEvaluationTicket(leaderId, windowId) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error("Please log in first.")

        //Keep each user's tickets separate in this browser.

        const storageKey =
            `evaluationTicket:${user.id}:${windowId}:${leaderId}`
        
        const savedTicket = localStorage.getItem(storageKey)
    
        if (savedTicket) {
            const ticket = JSON.parse(savedTicket)

            if (ticket.used) {
                throw new Error("You have already submitted this evaluation.")
            }

            if (new Date(ticket.expiresAt).getTime() <= Date.now()) {
                throw new Error("This evaluation ticket has expired.")
            }

            return ticket
        }

        //Check browser storage before requesting a one-use ticket.
        localStorage.setItem(`${storageKey}:check`, "ok")
        localStorage.removeItem(`${storageKey}:check`)

        const { data, error } = await supabase.rpc(
            "issue_evaluation_ticket",
            {
                p_leader_id: leaderId,
                p_window_id: windowId,
            }
        )
    if (error) {
        if (error.code === "23505") {
            throw new Error(
                "A ticket was already issued. Use the browser where you requested it."
            )
        }
        throw error
    }

    const ticket = {
        ...data,
        storageKey,
        used: false,
    }

    localStorage.setItem(storageKey, JSON.stringify(ticket))

    return ticket
}