


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_evaluation_report"("p_window_it" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_window public.evaluation_windows%rowtype;
  v_minimum integer;
  v_report jsonb;
begin
  select *
  into v_window
  from public.evaluation_windows
  where id = p_window_id;

  if not found then 
    raise exception 'Evaluation window not found.';
  end if;

  --Check this user's report permission for the store.
  if not exists (
    select 1
    from public.store_memberships
    where store_id = v_window.store_id
      and user_id = auth.uid()
      and active = true
      and can_view_reports = true
  ) then
      raise exception 'You do not have permission to view these reports.';
    end if;

    select minimum_responses
    into v_minimum
    from public.stores
    where id = v_window.store_id;

    with responses as (
      select *
      from private.evaluations
      where window_id = p_window_id
        and template_id = v_window.template_id
    ),

    leader_reports as (
      select
        leaders.id,
        leaders.name,
        positions.name as position_name,
        (
          select count(*)
          from responses
          where leader_id = leaders.id
        ) as response_count
      from public.leaders as leaders
      join public.positions as positions
        on positions.id = leaders.positions_id
      where positions.store_id = v_window.store_id   
    )
    select jsonb_build_object(
      'windowId', v_window.id,
      'windowName', v_window.name,
      'minimumResponses', v_minimum,
      'leaders', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', report.id,
            'name', report.name,
            'positionName', report.position_name,
            'responseCount', report.response_count,
            'ready', report.response_count >= v_minimum,
            'overallAverage',
            case when report.response_count >= v_minimum then (
              select avg((
                select avg(score.value::numeric)
                from jsonb_each_text(evaluation.answers) as score
              ))
              from responses as evaluation
              where evaluation.leader_id = report.id
            ) else null end,
            'questionAverages',
            case when report.response_count >= v_minimum then (
              select jsonb_agg(
                jsonb_build_object(
                  'id', questions.id,
                  'text', questions.question_text,
                  'average', (
                    select avg(
                      (evaluation.answers ->> questions.id::text)::numeric
                    )
                    from responses as evaluation
                    where evaluation.leader_id = report.id
                  )
                )
                order by questions.display_order
              )
              from public.evaluation_questions as questions
              where questions.template_id = v_window.template_id
            ) else null end,
            'comments',
            case when report.response_count >= v_minimum then (
              select coalesce(
                jsonb_agg(evaluation.comments order by evaluation.id),
                '[]'::jsonb
              )
              from responses as evaluation
              where evaluation.leader_id = report.id
                and length(trim(evaluation.comments)) > 0
            ) else null end
          )
          order by report.name, report.id
        )
        from leader_reports as report
      ), '[]'::jsonb)
    )
    into v_report;

    return v_report;
  end;
$$;


ALTER FUNCTION "public"."get_evaluation_report"("p_window_it" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."issue_evaluation_ticket"("p_leader_id" "uuid", "p_window_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_window public.evaluation_windows%rowtype;
  v_token text;

begin
  if v_user_id is null then
    raise exception 'Please log in first.';
  end if;

  -- Lock the window against changes during issuance.
  select *
  into v_window
  from public.evaluation_windows
  where id = p_window_id
  for share;

  if not found then
    raise exception 'Evaluation window not found.';
  end if;

  if not v_window.enabled
    or now() < v_window.starts_at
    or now() >= v_window.ends_at then
    raise exception 'This evaluation window is closed.';
  end if;

  if v_window.template_id is null then
    raise exception 'This window has no questionnaire.';
  end if;

  --Check membership and ensure the leader belongs to this store.

  if not exists (
    select 1
    from public.leaders as leaders
    join public.positions as positions
      on positions.id = leaders.position_id
    join public.store_memberships as memberships
      on memberships.store_id = positions.store_id
    where leaders.id = p_leader_id
      and leaders.active = true
      and positions.store_id = v_window.store_id
      and memberships.user_id = v_user_id
      and memberships.active = true
      and memberships.can_evaluate = true
  ) then
      raise exception 'You are not eligible to evaluate this leader.';
    end if;

    -- The primary key prevents duplidcate issuance.
    insert into private.ticket_issuance (
      user_id, leader_id, window_id
    )
    values (v_user_id, p_leader_id, p_window_id);

    -- Generatre a secret token; store only its SHA-256 hash.
    v_token := gen_random_uuid()::text || gen_random_uuid()::text;

    insert into private.evaluation_tickets (
      token_hash, leader_id, window_id, expires_at
    )
    values (
      encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      p_leader_id,
      p_window_id,
      v_window.ends_at
    );

    return jsonb_build_object(
      'token', v_token,
      'leaderId', p_leader_id,
      'windowId', p_window_id,
      'expiresAt', v_window.ends_at
    );
  end;
  $$;


ALTER FUNCTION "public"."issue_evaluation_ticket"("p_leader_id" "uuid", "p_window_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_evaluation"("p_token" "text", "p_answers" "jsonb", "p_comments" "text" DEFAULT ''::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ticket private.evaluation_tickets%rowtype;
  v_window public.evaluation_windows%rowtype;
  v_answer record;
  v_score numeric;
begin
  if p_token is null or length(p_token) <> 72 then
    raise exception 'Invalid evaluation ticket.';
  end if;

delete from private.evaluation_tickets
where token_hash = 
  encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
returning * into v_ticket;

if not found then
  raise exception 'This ticket is invalid or already used.';
end if;

select *
into v_window
from public.evaluation_windows
where id = v_ticket.window_id
for share;

if not found then
  raise exception 'Evaluation window not found.';
end if;

if not v_window.enabled
  or now() < v_window.starts_at
  or now() >= v_window.ends_at
  or now() >= v_ticket.expires_at then
  raise exception 'This evaluation window is closed.';
end if;

if not exists (
  select 1
  from public.leaders as leaders
  join public.positions as positions
    on positions.id = leaders.position_id
  where leaders.id = v_ticket.leader_id
    and leaders.active = true
    and positions.store_id = v_window.store_id
) then
    raise exception 'This leader is unavailable.';
  end if;

  if p_answers is null
    or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a question-score object.';
  end if;

  -- Every required question must have an answer
  if exists (
    select 1
    from public.evaluation_questions as questions
    where questions.template_id = v_window.template_id
      and questions.required = true
      and not (p_answers ? questions.id::text)      
  ) then
      raise exception 'Please answer every required question.';
    end if;

    -- Reject unknown questions an invalid scores.
    for v_answer in
      select key, value from jsonb_each(p_answers)
    loop
      if not exists (
        select 1
        from public.evaluation_questions as questions
        where questions.template_id = v_window.template_id
          and questions.id::text = v_answer.key
          and questions.question_type = 'rating'
      ) then
          raise exception 'An answer contains an invalid question.';
        end if;

        if jsonb_typeof(v_answer.value) <> 'number' then
          raise exception 'Scores must be numbers.';
        end if;

        v_score := v_answer.value::text::numeric;

        if v_score < 1 or v_score > 5
          or v_score <> trunc(v_score) then
          raise exception 'Scores must be whole numbers from 1 to 5.';
        end if;
      end loop;

      if length(coalesce(p_comments, '')) > 5000 then
        raise exception 'Comments cannot exceed 5000 characters.';
      end if;

      insert into private.evaluations (
        leader_id, window_id, template_id, answers, comments
      )
      values (
        v_ticket.leader_id,
        v_window.id,
        v_window.template_id,
        p_answers,
        trim(coalesce(p_comments, ''))
      );

      return true;
end;
$$;


ALTER FUNCTION "public"."submit_evaluation"("p_token" "text", "p_answers" "jsonb", "p_comments" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."evaluation_tickets" (
    "token_hash" "text" NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "window_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "private"."evaluation_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "window_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "answers" "jsonb" NOT NULL,
    "comments" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "evaluations_answers_check" CHECK (("jsonb_typeof"("answers") = 'object'::"text")),
    CONSTRAINT "evaluations_comments_check" CHECK (("length"("comments") <= 5000))
);


ALTER TABLE "private"."evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."ticket_issuance" (
    "user_id" "uuid" NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "window_id" "uuid" NOT NULL
);


ALTER TABLE "private"."ticket_issuance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    CONSTRAINT "companies_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "display_order" integer NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "question_type" "text" DEFAULT 'rating'::"text" NOT NULL,
    CONSTRAINT "evaluation_questions_display_order_check" CHECK (("display_order" > 0)),
    CONSTRAINT "evaluation_questions_question_text_check" CHECK (("length"(TRIM(BOTH FROM "question_text")) > 0)),
    CONSTRAINT "evaluation_questions_question_type_check" CHECK (("question_type" = 'rating'::"text"))
);


ALTER TABLE "public"."evaluation_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "evaluation_templates_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "evaluation_templates_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."evaluation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_windows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "template_id" "uuid",
    CONSTRAINT "evaluation_windows_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "evaluation_windows_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."evaluation_windows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "position_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "leaders_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."leaders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "hierarchy_level" integer NOT NULL,
    CONSTRAINT "positions_hierarchy_level_check" CHECK (("hierarchy_level" > 0)),
    CONSTRAINT "positions_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_memberships" (
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "can_evaluate" boolean DEFAULT true NOT NULL,
    "can_view_reports" boolean DEFAULT false NOT NULL,
    "can_manage_store" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."store_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "store_number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "minimum_responses" integer DEFAULT 5 NOT NULL,
    CONSTRAINT "stores_minimum_responses_check" CHECK (("minimum_responses" >= 5)),
    CONSTRAINT "stores_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "stores_store_number_check" CHECK (("length"(TRIM(BOTH FROM "store_number")) > 0))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


ALTER TABLE ONLY "private"."evaluation_tickets"
    ADD CONSTRAINT "evaluation_tickets_pkey" PRIMARY KEY ("token_hash");



ALTER TABLE ONLY "private"."evaluations"
    ADD CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."ticket_issuance"
    ADD CONSTRAINT "ticket_issuance_pkey" PRIMARY KEY ("user_id", "leader_id", "window_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_questions"
    ADD CONSTRAINT "evaluation_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_questions"
    ADD CONSTRAINT "evaluation_questions_template_id_display_order_key" UNIQUE ("template_id", "display_order");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_id_store_unique" UNIQUE ("id", "store_id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_store_id_name_version_key" UNIQUE ("store_id", "name", "version");



ALTER TABLE ONLY "public"."evaluation_windows"
    ADD CONSTRAINT "evaluation_windows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_windows"
    ADD CONSTRAINT "evaluation_windows_store_id_name_key" UNIQUE ("store_id", "name");



ALTER TABLE ONLY "public"."leaders"
    ADD CONSTRAINT "leaders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_store_id_name_key" UNIQUE ("store_id", "name");



ALTER TABLE ONLY "public"."store_memberships"
    ADD CONSTRAINT "store_memberships_pkey" PRIMARY KEY ("store_id", "user_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_company_id_store_number_key" UNIQUE ("company_id", "store_number");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



CREATE INDEX "evaluations_window_leader_idx" ON "private"."evaluations" USING "btree" ("window_id", "leader_id");



CREATE INDEX "leaders_positions_id_idx" ON "public"."leaders" USING "btree" ("position_id");



CREATE INDEX "store_memberships_user_id_idx" ON "public"."store_memberships" USING "btree" ("user_id");



ALTER TABLE ONLY "private"."evaluation_tickets"
    ADD CONSTRAINT "evaluation_tickets_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."leaders"("id");



ALTER TABLE ONLY "private"."evaluation_tickets"
    ADD CONSTRAINT "evaluation_tickets_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "public"."evaluation_windows"("id");



ALTER TABLE ONLY "private"."evaluations"
    ADD CONSTRAINT "evaluations_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."leaders"("id");



ALTER TABLE ONLY "private"."evaluations"
    ADD CONSTRAINT "evaluations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id");



ALTER TABLE ONLY "private"."evaluations"
    ADD CONSTRAINT "evaluations_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "public"."evaluation_windows"("id");



ALTER TABLE ONLY "private"."ticket_issuance"
    ADD CONSTRAINT "ticket_issuance_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."leaders"("id");



ALTER TABLE ONLY "private"."ticket_issuance"
    ADD CONSTRAINT "ticket_issuance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "private"."ticket_issuance"
    ADD CONSTRAINT "ticket_issuance_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "public"."evaluation_windows"("id");



ALTER TABLE ONLY "public"."evaluation_questions"
    ADD CONSTRAINT "evaluation_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."evaluation_windows"
    ADD CONSTRAINT "evaluation_windows_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."evaluation_windows"
    ADD CONSTRAINT "evaluation_windows_template_store_fk" FOREIGN KEY ("template_id", "store_id") REFERENCES "public"."evaluation_templates"("id", "store_id");



ALTER TABLE ONLY "public"."leaders"
    ADD CONSTRAINT "leaders_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."store_memberships"
    ADD CONSTRAINT "store_memberships_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."store_memberships"
    ADD CONSTRAINT "store_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE "private"."evaluation_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."ticket_issuance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can read leaders in their stores" ON "public"."leaders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."positions" "positions"
     JOIN "public"."store_memberships" "memberships" ON (("memberships"."store_id" = "positions"."store_id")))
  WHERE (("positions"."id" = "leaders"."position_id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



CREATE POLICY "Users can read positions in their stores" ON "public"."positions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."store_memberships" "memberships"
  WHERE (("memberships"."store_id" = "positions"."store_id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



CREATE POLICY "Users can read their own memberships" ON "public"."store_memberships" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read their store evaluation templates" ON "public"."evaluation_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."store_memberships" "memberships"
  WHERE (("memberships"."store_id" = "evaluation_templates"."store_id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



CREATE POLICY "Users can read their store evaluation windows" ON "public"."evaluation_windows" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."store_memberships" "memberships"
  WHERE (("memberships"."store_id" = "evaluation_windows"."store_id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



CREATE POLICY "Users can read their store evluation questions" ON "public"."evaluation_questions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."evaluation_templates" "templates"
     JOIN "public"."store_memberships" "memberships" ON (("memberships"."store_id" = "templates"."store_id")))
  WHERE (("templates"."id" = "evaluation_questions"."template_id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



CREATE POLICY "Users can read their stores" ON "public"."stores" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."store_memberships" "memberships"
  WHERE (("memberships"."store_id" = "stores"."id") AND ("memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("memberships"."active" = true)))));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_windows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leaders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."get_evaluation_report"("p_window_it" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_evaluation_report"("p_window_it" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."issue_evaluation_ticket"("p_leader_id" "uuid", "p_window_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."issue_evaluation_ticket"("p_leader_id" "uuid", "p_window_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_evaluation"("p_token" "text", "p_answers" "jsonb", "p_comments" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_evaluation"("p_token" "text", "p_answers" "jsonb", "p_comments" "text") TO "anon";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."companies" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluation_questions" TO "service_role";
GRANT SELECT ON TABLE "public"."evaluation_questions" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluation_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."evaluation_templates" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluation_windows" TO "service_role";
GRANT SELECT ON TABLE "public"."evaluation_windows" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."leaders" TO "service_role";
GRANT SELECT ON TABLE "public"."leaders" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."positions" TO "service_role";
GRANT SELECT ON TABLE "public"."positions" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."store_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."store_memberships" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."stores" TO "service_role";
GRANT SELECT ON TABLE "public"."stores" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































