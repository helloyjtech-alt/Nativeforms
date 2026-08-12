import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "@remix-run/react";

export default function FormBuilderModal() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use global shopify config if search params are missing (App Bridge strips them)
  const shop = searchParams.get("shop") || (typeof shopify !== 'undefined' && shopify.config ? shopify.config.shop : "");
  const host = searchParams.get("host") || (typeof shopify !== 'undefined' && shopify.config ? shopify.config.host : "");
  
  const query = searchParams.toString();
  const append = query ? `&shop=${shop}&host=${host}` : `?shop=${shop}&host=${host}`;
  const srcUrl = `/app/builder/${id}${query ? '?' + query : ''}${append}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof shopify !== "undefined" && shopify.modal) {
        shopify.modal.show("form-builder-iframe-modal");
      }
    }, 100);
    
    const modal = document.getElementById("form-builder-iframe-modal");
    const handleHide = () => nav("/app/forms");
    
    if (modal) {
      modal.addEventListener("hide", handleHide);
    }
    
    return () => {
      clearTimeout(timer);
      if (modal) modal.removeEventListener("hide", handleHide);
    };
  }, [nav]);

  return (
    <ui-modal id="form-builder-iframe-modal" variant="max" src={srcUrl}></ui-modal>
  );
}
