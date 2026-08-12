import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: any) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    #graphql
    query {
      files(first: 50, query: "media_type:IMAGE") {
        edges {
          node {
            ... on MediaImage {
              id
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  `);
  
  const data = await response.json();
  const images = data.data?.files?.edges?.map((e: any) => e.node?.image?.url).filter(Boolean) || [];
  
  return json({ images });
};
