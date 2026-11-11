import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function respond(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed."})
  }

  const authorization = request.headers.get("Authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return respond(401, { error: "Please log in first."})
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const token = authorization.slice(7)

    const { data, error: userError } =
      await admin.auth.getUser(token)

    if (userError || !data.user) {
      return respond(401, { error: "Please log in again."})
    }

    const { error: deleteError } =
      await admin.auth.admin.deleteUser(data.user.id)

    if (deleteError) {
      console.error("Account deletion failed:", deleteError)
      return respond(500, {
        error: "Unable to delete account. Please try again.",
      })
    }

    return respond(200, {success: true})
  } catch {
    return respond(500, {
      error: "An unexpected error occurred.",
    })
  }
})
