import { useState } from "react"
import { supabase } from "../lib/supabase"

function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [isSignUp, setIsSignup] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")

    async function handleLogin(event) {
        event.preventDefault()
        setLoading(true)
        setErrorMessage("")
        setSuccessMessage("")

        try {
            const credentials = {
                email: email.trim(),
                password,
            }

            const { data, error } = isSignUp
            ?await supabase.auth.signUp(credentials)
            :await supabase.auth.signInWithPassword(credentials)

            if (error) {
                setErrorMessage(error.message)
            } else if (isSignUp && !data.session) {
                setSuccessMessage(
                    "Check your email for a confirmation link before logging in."
                )
            }

        } catch (error) {
            setErrorMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section>
            <h2>{isSignUp ? "Create an account" : "Log in to Command Center"}</h2>

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
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                </p>

                {errorMessage && <p role="alert">{errorMessage}</p>}
                {successMessage && <p role="status">{successMessage}</p>}

                <button type="submit" disabled={loading}>
                    {loading
                        ? "Please wait..."
                        : isSignUp
                            ? "Create account"
                            : "Log in"}
                </button>

                <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                        setIsSignup(!isSignUp)
                        setErrorMessage("")
                        setSuccessMessage("")
                    }}
                >
                    {isSignUp
                        ? "Already have an account? Log in"
                        : "Need an account? Sign up"}
                </button>

            </form>
        </section>
    )
}

export default Login