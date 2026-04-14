"use server";

import { createTicket as hubspotCreateTicket, uploadFile as hubspotUploadFile } from "@/lib/hubspot";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTicketAction(formData: FormData) {
  const subject = formData.get("subject") as string;
  const content = formData.get("content") as string;
  const dealId = formData.get("dealId") as string | undefined;
  
  // Collect HubSpot specific properties from user fields
  const tipologia = formData.get("TICKET.tipologia_incidencia") as string;
  const subcatSolar = formData.get("TICKET.sub_categorias_incidencias") as string;
  const subcatAero = formData.get("TICKET.sub_categorias_incidencias___aerotermia") as string;
  const subcatCargador = formData.get("TICKET.sub_categoria_incidencia___cargador_coche_electrico") as string;

  // Collect files
  const files = formData.getAll("attachments") as File[];
  
  const supabase = await createClient();

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Usuario no autenticado" };
  }

  // 2. Get HubSpot Contact ID from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('hubspot_contact_id')
    .eq('id', user.id)
    .single();

  if (!profile?.hubspot_contact_id) {
    return { error: "Contacto de HubSpot no encontrado" };
  }

  try {
    // 3. Upload files to HubSpot if any
    const attachmentIds: string[] = [];
    for (const file of files) {
      if (file.size > 0) {
        try {
          const fileId = await hubspotUploadFile(file);
          attachmentIds.push(fileId);
        } catch (uploadErr) {
          console.error(`DEBUG: Failed to upload file ${file.name}:`, uploadErr);
        }
      }
    }

    // 4. Create ticket in Supabase first to get our portal_id
    const { data: dbTicket, error: dbError } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
      })
      .select('portal_id')
      .single();

    if (dbError) throw dbError;

    // 5. Prepare extra properties for HubSpot
    const extraProperties: Record<string, string> = {};
    if (tipologia) extraProperties["TICKET.tipologia_incidencia"] = tipologia;
    if (subcatSolar) extraProperties["TICKET.sub_categorias_incidencias"] = subcatSolar;
    if (subcatAero) extraProperties["TICKET.sub_categorias_incidencias___aerotermia"] = subcatAero;
    if (subcatCargador) extraProperties["TICKET.sub_categoria_incidencia___cargador_coche_electrico"] = subcatCargador;

    // 6. Create ticket in HubSpot
    const hsTicket = await hubspotCreateTicket(profile.hubspot_contact_id, {
      subject,
      content,
      portalId: dbTicket.portal_id,
      dealId: dealId || undefined,
      properties: extraProperties,
      attachmentIds
    });

    // 7. Update Supabase with HubSpot ID
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ hubspot_id: hsTicket.id })
      .eq('portal_id', dbTicket.portal_id);

    if (updateError) throw updateError;

    revalidatePath(`/protected/tickets`);
    return { success: true, portalId: dbTicket.portal_id, hubspotId: hsTicket.id };
  } catch (error) {
    console.error("Create ticket error:", error);
    return { error: "No se ha podido crear el ticket. Por favor, inténtalo de nuevo." };
  }
}
