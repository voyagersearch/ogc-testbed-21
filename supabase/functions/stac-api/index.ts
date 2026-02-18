import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface STACCatalog {
  type: "Catalog";
  stac_version: string;
  id: string;
  title: string;
  description: string;
  links: Array<{
    rel: string;
    href: string;
    type?: string;
    title?: string;
  }>;
  conformsTo: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/stac-api", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (path === "/" || path === "") {
      const catalog: STACCatalog = {
        type: "Catalog",
        stac_version: "1.0.0",
        id: "voyager-stac-catalog",
        title: "Voyager STAC Catalog",
        description: "STAC catalog for Voyager geospatial data",
        links: [
          {
            rel: "self",
            href: `${url.origin}${url.pathname}`,
            type: "application/json",
          },
          {
            rel: "root",
            href: `${url.origin}${url.pathname}`,
            type: "application/json",
          },
          {
            rel: "collections",
            href: `${url.origin}/stac-api/collections`,
            type: "application/json",
          },
          {
            rel: "search",
            href: `${url.origin}/stac-api/search`,
            type: "application/geo+json",
          },
        ],
        conformsTo: [
          "https://api.stacspec.org/v1.0.0/core",
          "https://api.stacspec.org/v1.0.0/item-search",
          "https://api.stacspec.org/v1.0.0/collections",
        ],
      };

      return new Response(JSON.stringify(catalog, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path === "/collections" || path === "/collections/") {
      const { data: collections, error } = await supabase
        .from("stac_collections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const collectionsResponse = {
        collections: collections?.map((col) => col.stac_json) || [],
        links: [
          {
            rel: "self",
            href: `${url.origin}/stac-api/collections`,
            type: "application/json",
          },
          {
            rel: "root",
            href: `${url.origin}/stac-api`,
            type: "application/json",
          },
        ],
      };

      return new Response(JSON.stringify(collectionsResponse, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (path.startsWith("/collections/")) {
      const parts = path.split("/").filter((p) => p);
      const collectionId = parts[1];

      if (parts.length === 2) {
        const { data: collection, error } = await supabase
          .from("stac_collections")
          .select("stac_json")
          .eq("id", collectionId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!collection) {
          return new Response(
            JSON.stringify({ error: "Collection not found" }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        return new Response(JSON.stringify(collection.stac_json, null, 2), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      if (parts[2] === "items") {
        if (parts.length === 3) {
          const { data: items, error } = await supabase
            .from("stac_items")
            .select("stac_json")
            .eq("collection_id", collectionId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (error) {
            throw error;
          }

          const itemCollection = {
            type: "FeatureCollection",
            features: items?.map((item) => item.stac_json) || [],
            links: [
              {
                rel: "self",
                href: `${url.origin}/stac-api/collections/${collectionId}/items`,
                type: "application/geo+json",
              },
              {
                rel: "collection",
                href: `${url.origin}/stac-api/collections/${collectionId}`,
                type: "application/json",
              },
            ],
          };

          return new Response(JSON.stringify(itemCollection, null, 2), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/geo+json",
            },
          });
        }

        if (parts.length === 4) {
          const itemId = parts[3];
          const { data: item, error } = await supabase
            .from("stac_items")
            .select("stac_json")
            .eq("id", itemId)
            .eq("collection_id", collectionId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!item) {
            return new Response(JSON.stringify({ error: "Item not found" }), {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            });
          }

          return new Response(JSON.stringify(item.stac_json, null, 2), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/geo+json",
            },
          });
        }
      }
    }

    if (path === "/search" && req.method === "GET") {
      const searchParams = url.searchParams;
      const limit = parseInt(searchParams.get("limit") || "10");
      const bbox = searchParams.get("bbox");

      let query = supabase
        .from("stac_items")
        .select("stac_json")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (bbox) {
        const bboxArray = bbox.split(",").map(Number);
        if (bboxArray.length === 4) {
          query = query.contains("bbox", bboxArray);
        }
      }

      const { data: items, error } = await query;

      if (error) {
        throw error;
      }

      const searchResults = {
        type: "FeatureCollection",
        features: items?.map((item) => item.stac_json) || [],
        links: [
          {
            rel: "self",
            href: `${url.origin}/stac-api/search?${searchParams.toString()}`,
            type: "application/geo+json",
          },
        ],
      };

      return new Response(JSON.stringify(searchResults, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/geo+json",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("STAC API Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
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
