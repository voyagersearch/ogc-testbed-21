import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_TRANSFORM_API_URL = "https://5d1fdadf-2421-4bad-b325-331537848150.spock.prod.repl.run/api/transform";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    console.log("Transform proxy - Request body keys:", Object.keys(body));

    const transformApiUrl = body.transformApiUrl || DEFAULT_TRANSFORM_API_URL;
    const { transformApiUrl: _, ...requestBody } = body;

    console.log("Transform API URL:", transformApiUrl);

    const response = await fetch(transformApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Transform API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transform API error response:", errorText);
      throw new Error(`Transform API failed with status ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      console.error("Non-JSON response from Transform API:", responseText.substring(0, 500));
      throw new Error(`Transform API returned non-JSON response: ${contentType}`);
    }

    const data = await response.json();
    console.log("Transform API success - Response keys:", Object.keys(data));

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Transform proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Transform failed";
    console.error("Error details:", errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: "Check the edge function logs for more information"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});