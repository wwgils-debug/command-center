import { supabase } from "./supabase"

export async function loadEvaluationWindow(storeId) {
    const now = new Date().toISOString()

    const { data: windows, error } = await supabase
        .from("evaluation_windows")
        .select(`
            id,
            name,
            template:evaluation_templates (
                id, 
                name,
                version,
                questions:evaluation_questions (
                    id,
                    question_text,
                    display_order,
                    required,
                    question_type
                )
            )
        `)
        .eq("store_id", storeId)
        .eq("enabled", true)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .limit(2)

    if (error) throw error

    if (windows.length === 0) {
        throw new Error("No evaluation window is currnelty open.")
    }

    if (windows.length > 1) {
        throw new Error("Multiple evaluation windowsd are open. Window selectin is required.")
    }
    const window = windows[0]

    if (!window.template) {
        throw new Error("This eindow has no accesbile questionnaire")
    }
            
    const questions = [...window.template.questions]
        .sort((a, b) => a.display_order - b.display_order)
        .map((question) => ({
            id: question.id,
            text: question.question_text,
            required: question.required,
            type: question.question_type
        }))

    if (questions.length === 0) {
        throw new Error("This questionnaire has no accessible questions")
    }
        
    return {
        window: {
            id: window.id,
            name: window.name,
        },
        template: {
            id: window.template.id,
            name: window.template.name,
            version: window.template.version,
            questions,
        },
    }
}