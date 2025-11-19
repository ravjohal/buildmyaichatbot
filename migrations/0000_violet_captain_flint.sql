CREATE TABLE "agent_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handoff_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" varchar NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"author" varchar DEFAULT 'BuildMyChatbot.Ai Team' NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"meta_description" text,
	"meta_keywords" text,
	"read_time_minutes" text DEFAULT '5' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chatbot_suggested_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"question_text" text NOT NULL,
	"usage_count" text DEFAULT '0' NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"website_urls" text[] DEFAULT ARRAY[]::text[],
	"website_content" text,
	"documents" text[] DEFAULT ARRAY[]::text[],
	"document_content" text,
	"document_metadata" jsonb,
	"system_prompt" text NOT NULL,
	"custom_instructions" text,
	"primary_color" text DEFAULT '#0EA5E9' NOT NULL,
	"accent_color" text DEFAULT '#0284C7' NOT NULL,
	"logo_url" text,
	"welcome_message" text DEFAULT 'Hello! How can I help you today?' NOT NULL,
	"suggested_questions" text[] DEFAULT ARRAY[]::text[],
	"enable_suggested_questions" text DEFAULT 'false' NOT NULL,
	"support_phone_number" text,
	"escalation_message" text DEFAULT 'If you need more help, you can reach our team at {phone}.' NOT NULL,
	"question_count" text DEFAULT '0' NOT NULL,
	"lead_capture_enabled" text DEFAULT 'false' NOT NULL,
	"lead_capture_type" text DEFAULT 'form' NOT NULL,
	"lead_capture_external_url" text,
	"lead_capture_fields" text[] DEFAULT ARRAY['name', 'email']::text[],
	"lead_capture_title" text DEFAULT 'Get in Touch' NOT NULL,
	"lead_capture_message" text DEFAULT 'Leave your contact information and we''ll get back to you.' NOT NULL,
	"lead_capture_timing" text DEFAULT 'after_first_message' NOT NULL,
	"lead_capture_message_count" text DEFAULT '1' NOT NULL,
	"last_knowledge_update" timestamp,
	"proactive_chat_enabled" text DEFAULT 'false' NOT NULL,
	"proactive_chat_delay" text DEFAULT '5' NOT NULL,
	"proactive_chat_message" text DEFAULT 'Hi! Need any help?',
	"proactive_chat_trigger_urls" text[] DEFAULT ARRAY[]::text[],
	"live_agent_hours_enabled" text DEFAULT 'false' NOT NULL,
	"live_agent_start_time" text DEFAULT '09:00',
	"live_agent_end_time" text DEFAULT '17:00',
	"live_agent_timezone" text DEFAULT 'America/New_York',
	"live_agent_days_of_week" text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[],
	"indexing_status" varchar DEFAULT 'completed' NOT NULL,
	"last_indexing_job_id" varchar,
	"gemini_model" varchar DEFAULT 'gemini-2.5-flash' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_flows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" text DEFAULT 'false' NOT NULL,
	"flow_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"suggested_questions" text[] DEFAULT ARRAY[]::text[],
	"was_escalated" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"rating" text NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"session_id" varchar,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"message_count" text DEFAULT '0' NOT NULL,
	"was_escalated" text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"enabled" text DEFAULT 'false' NOT NULL,
	"integration_type" text DEFAULT 'generic' NOT NULL,
	"webhook_url" text,
	"webhook_method" text DEFAULT 'POST' NOT NULL,
	"auth_type" text DEFAULT 'none' NOT NULL,
	"auth_value" text,
	"custom_headers" jsonb,
	"field_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hyphen_endpoint" text,
	"hyphen_builder_id" text,
	"hyphen_username" text,
	"hyphen_api_key" text,
	"hyphen_community_id" text,
	"hyphen_source_id" text,
	"hyphen_grade_id" text,
	"hyphen_influence_id" text,
	"hyphen_contact_method_id" text,
	"hyphen_reference" text,
	"retry_enabled" text DEFAULT 'true' NOT NULL,
	"max_retries" text DEFAULT '3' NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"success_count" text DEFAULT '0' NOT NULL,
	"error_count" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_integrations_chatbot_id_unique" UNIQUE("chatbot_id")
);
--> statement-breakpoint
CREATE TABLE "email_notification_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enable_new_lead_notifications" text DEFAULT 'true' NOT NULL,
	"enable_unanswered_question_notifications" text DEFAULT 'true' NOT NULL,
	"unanswered_threshold_minutes" text DEFAULT '30' NOT NULL,
	"enable_weekly_reports" text DEFAULT 'true' NOT NULL,
	"last_weekly_report_sent" timestamp,
	"email_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "indexing_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"total_tasks" text DEFAULT '0' NOT NULL,
	"completed_tasks" text DEFAULT '0' NOT NULL,
	"failed_tasks" text DEFAULT '0' NOT NULL,
	"cancelled_tasks" text DEFAULT '0' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "indexing_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"source_type" varchar NOT NULL,
	"source_url" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"retry_count" text DEFAULT '0' NOT NULL,
	"chunks_created" text DEFAULT '0' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "keyword_alert_triggers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"conversation_id" varchar,
	"keyword" text NOT NULL,
	"message_content" text NOT NULL,
	"visitor_name" text,
	"visitor_email" text,
	"read" text DEFAULT 'false' NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"enabled" text DEFAULT 'false' NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[],
	"in_app_notifications" text DEFAULT 'true' NOT NULL,
	"email_notifications" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "keyword_alerts_chatbot_id_unique" UNIQUE("chatbot_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"source_type" varchar NOT NULL,
	"source_url" text NOT NULL,
	"source_title" text,
	"chunk_text" text NOT NULL,
	"chunk_index" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(384),
	"search_vector" "tsvector",
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"conversation_id" varchar,
	"name" text,
	"email" text,
	"phone" text,
	"company" text,
	"message" text,
	"custom_fields" jsonb,
	"source" text DEFAULT 'unknown' NOT NULL,
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_agent_handoffs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"agent_id" varchar,
	"visitor_name" text,
	"visitor_email" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"resolved_at" timestamp,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE "manual_qa_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"question" text NOT NULL,
	"question_hash" text NOT NULL,
	"embedding" vector(384),
	"manual_answer" text NOT NULL,
	"original_answer" text,
	"conversation_id" varchar,
	"created_by" varchar NOT NULL,
	"use_count" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "qa_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"question" text NOT NULL,
	"question_hash" text NOT NULL,
	"embedding" vector(384),
	"answer" text NOT NULL,
	"suggested_questions" text[] DEFAULT ARRAY[]::text[],
	"hit_count" text DEFAULT '0' NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraped_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"source_url" text NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"caption" text,
	"embedding" vector(384),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invited_by" varchar NOT NULL,
	"email" varchar NOT NULL,
	"role" varchar DEFAULT 'team_member' NOT NULL,
	"token" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_member_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"can_view_analytics" text DEFAULT 'true' NOT NULL,
	"can_manage_chatbots" text DEFAULT 'false' NOT NULL,
	"can_respond_to_chats" text DEFAULT 'true' NOT NULL,
	"can_view_leads" text DEFAULT 'true' NOT NULL,
	"can_manage_team" text DEFAULT 'false' NOT NULL,
	"can_access_settings" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_permissions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "url_crawl_metadata" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" varchar NOT NULL,
	"url" text NOT NULL,
	"content_hash" text NOT NULL,
	"last_crawled_at" timestamp DEFAULT now() NOT NULL,
	"last_modified" text,
	"etag" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar,
	"google_id" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"subscription_tier" varchar DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"stripe_price_id" varchar,
	"is_admin" text DEFAULT 'false' NOT NULL,
	"role" varchar DEFAULT 'owner' NOT NULL,
	"parent_user_id" varchar,
	"monthly_conversation_count" text DEFAULT '0' NOT NULL,
	"conversation_count_reset_date" timestamp DEFAULT now(),
	"total_knowledge_base_size_mb" text DEFAULT '0' NOT NULL,
	"terms_accepted_at" timestamp,
	"privacy_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_handoff_id_live_agent_handoffs_id_fk" FOREIGN KEY ("handoff_id") REFERENCES "public"."live_agent_handoffs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_suggested_questions" ADD CONSTRAINT "chatbot_suggested_questions_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_ratings" ADD CONSTRAINT "conversation_ratings_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification_settings" ADD CONSTRAINT "email_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexing_jobs" ADD CONSTRAINT "indexing_jobs_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexing_tasks" ADD CONSTRAINT "indexing_tasks_job_id_indexing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."indexing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexing_tasks" ADD CONSTRAINT "indexing_tasks_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_alert_triggers" ADD CONSTRAINT "keyword_alert_triggers_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_alert_triggers" ADD CONSTRAINT "keyword_alert_triggers_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_alerts" ADD CONSTRAINT "keyword_alerts_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_agent_handoffs" ADD CONSTRAINT "live_agent_handoffs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_agent_handoffs" ADD CONSTRAINT "live_agent_handoffs_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_agent_handoffs" ADD CONSTRAINT "live_agent_handoffs_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_qa_overrides" ADD CONSTRAINT "manual_qa_overrides_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_qa_overrides" ADD CONSTRAINT "manual_qa_overrides_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_qa_overrides" ADD CONSTRAINT "manual_qa_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_cache" ADD CONSTRAINT "qa_cache_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_images" ADD CONSTRAINT "scraped_images_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member_permissions" ADD CONSTRAINT "team_member_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_crawl_metadata" ADD CONSTRAINT "url_crawl_metadata_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");