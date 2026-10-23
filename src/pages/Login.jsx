import { useState } from "react"
import { supabase } from "../lib/supabase"

function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    async function handleLogin(event) {
        event.preventDefault()
        setLoading(true)
        setErrorMessage("")

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,                
            })

            if (error) {
                setErrorMessage(error.message)
            }
        } catch {
            setErrorMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section>
            <h2>Log in to Command Center</h2>

            <form onSubmit={handleLogin}>
                <p>
                    <label>
                        Email
                        <br />
                        <input
                            type="email"
                            autoComplete="username"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </label>
                </p>

                <p>
                    <label>
                        Password
                        <br />
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                </p>

                {errorMessage && <p role="alert">{errorMessage}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>
            </form>
        </section>
    )
}

export default Login