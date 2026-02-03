import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actionItems } = await req.json();

    if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No action items provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user's Jira integration
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("service", "jira")
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ 
          error: "Jira integration not found",
          message: "Please connect your Jira account in Settings first." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse stored credentials
    let credentials;
    try {
      credentials = JSON.parse(integration.access_token || "{}");
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Invalid Jira configuration",
          message: "Please reconnect your Jira account in Settings." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain, email, apiToken, projectKey } = credentials;

    if (!domain || !email || !apiToken || !projectKey) {
      return new Response(
        JSON.stringify({ 
          error: "Incomplete Jira configuration",
          message: "Please update your Jira settings with all required fields." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${email}:${apiToken}`);
    const jiraBaseUrl = `https://${domain}.atlassian.net`;

    // Create issues in Jira
    const createdIssues: Array<{ id: string; key: string; summary: string }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of actionItems) {
      try {
        // Map priority to Jira priority names
        const priorityMap: Record<string, string> = {
          High: "High",
          Medium: "Medium",
          Low: "Low",
        };

        const issueData = {
          fields: {
            project: { key: projectKey },
            summary: item.summary,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: item.description || "Created from MeetAct" },
                  ],
                },
              ],
            },
            issuetype: { name: "Task" },
            ...(item.dueDate && { duedate: item.dueDate.split("T")[0] }),
          },
        };

        const response = await fetch(
          `${jiraBaseUrl}/rest/api/3/issue`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(issueData),
          }
        );

        if (response.ok) {
          const result = await response.json();
          createdIssues.push({
            id: result.id,
            key: result.key,
            summary: item.summary,
          });

          // Update action item with Jira key
          await supabase
            .from("action_items")
            .update({ jira_issue_key: result.key })
            .eq("id", item.id);
        } else {
          const errorText = await response.text();
          console.error("Jira API error:", response.status, errorText);
          errors.push({ id: item.id, error: `Jira API error: ${response.status}` });
        }
      } catch (itemError) {
        console.error("Error creating Jira issue:", itemError);
        errors.push({ 
          id: item.id, 
          error: itemError instanceof Error ? itemError.message : "Unknown error" 
        });
      }
    }

    console.log(`Created ${createdIssues.length} Jira issues, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        created: createdIssues,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push to Jira error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
