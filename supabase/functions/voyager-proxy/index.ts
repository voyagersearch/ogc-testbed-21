import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const targetPath = url.searchParams.get("path") || "/solr/v0/select";
    const customBaseUrl = url.searchParams.get("baseUrl");
    
    let voyagerBaseUrl = "https://ogc-sdi.voyagersearch.com";
    
    if (customBaseUrl) {
      voyagerBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl;
    } else if (targetPath.startsWith("/voyager/api/rest/content")) {
      voyagerBaseUrl = "https://voyager.fas.usda.gov";
    }
    
    url.searchParams.delete("path");
    url.searchParams.delete("baseUrl");
    const queryString = url.searchParams.toString();
    const targetUrl = `${voyagerBaseUrl}${targetPath}${queryString ? `?${queryString}` : ""}`;

    console.log("Proxying request to:", targetUrl);

    const headers: Record<string, string> = {};
    const isImageRequest = targetPath.includes("/thumb");

    if (!isImageRequest) {
      headers["Content-Type"] = "application/json";
      headers["Accept"] = "application/json";
    }

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method === "POST" && req.body) {
      options.body = await req.text();
    }

    const response = await fetch(targetUrl, options);
    
    if (isImageRequest) {
      const imageData = await response.arrayBuffer();
      return new Response(imageData, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }
    
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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