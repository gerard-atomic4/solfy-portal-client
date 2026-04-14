const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API_URL = 'https://api.hubapi.com';

// I'll define common stage IDs here
export const WON_STAGES = ["71411668", "453484781"];

export async function hubspotRequest(endpoint: string, options: RequestInit = {}) {
  if (!HUBSPOT_ACCESS_TOKEN) {
    console.error('DEBUG: HUBSPOT_ACCESS_TOKEN is missing!');
    throw new Error('HUBSPOT_ACCESS_TOKEN is not defined');
  }

  console.log(`DEBUG: HubSpot Request -> ${endpoint}`);

  const response = await fetch(`${HUBSPOT_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`DEBUG: HubSpot Error ${response.status} ->`, JSON.stringify(errorData, null, 2));
    throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`DEBUG: HubSpot Success ${endpoint} -> Data received`);
  return data;
}

export async function getContactByEmail(email: string) {
  try {
    const data = await hubspotRequest(`/crm/v3/objects/contacts/${email}?idProperty=email&properties=firstname,lastname,email`);
    return data;
  } catch (error) {
    if ((error as Error).message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function getContactTickets(contactId: string) {
  try {
    const associations = await hubspotRequest(`/crm/v4/objects/contact/${contactId}/associations/ticket`);
    const ticketIds = associations.results.map((res: any) => res.toObjectId);
    if (ticketIds.length === 0) return [];

    const tickets = await hubspotRequest(`/crm/v3/objects/tickets/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        inputs: ticketIds.map((id: string) => ({ id })),
        properties: ["subject", "hs_pipeline_stage", "createdate", "portal_ticket_id"],
      }),
    });

    return tickets.results;
  } catch (error) {
    console.error(`Error fetching tickets for contact ${contactId}:`, error);
    return [];
  }
}

export async function getTicketsByContactId(contactId: string) {
  // 1. Get associations
  const associations = await hubspotRequest(`/crm/v4/objects/contact/${contactId}/associations/ticket`);
  const ticketIds = associations.results.map((a: any) => a.toObjectId);

  if (ticketIds.length === 0) return [];

  // 2. Fetch ticket details in batch
  const tickets = await hubspotRequest(`/crm/v3/objects/tickets/batch/read`, {
    method: 'POST',
    body: JSON.stringify({
      inputs: ticketIds.map((id: string) => ({ id })),
      properties: ['subject', 'content', 'hs_ticket_priority', 'hs_ticket_category', 'hs_pipeline_stage', 'createdate', 'portal_ticket_id']
    })
  });

  return tickets.results;
}

export async function createTicket(
  contactId: string, 
  { 
    subject, 
    content, 
    portalId, 
    dealId, 
    properties = {},
    attachmentIds = [] 
  }: { 
    subject: string, 
    content: string, 
    portalId: string, 
    dealId?: string,
    properties?: Record<string, any>,
    attachmentIds?: string[]
  }
) {
  // 1. Create ticket with dynamic properties
  const ticket = await hubspotRequest(`/crm/v3/objects/tickets`, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        subject,
        content,
        hs_pipeline: '0', // Default pipeline
        hs_pipeline_stage: '3', // Default "New" stage for tickets
        portal_ticket_id: portalId, // Map our internal ID
        hs_attachment_ids: attachmentIds.length > 0 ? attachmentIds.join(';') : undefined,
        ...properties
      }
    })
  });

  // 2. Associate with contact
  await hubspotRequest(`/crm/v4/objects/ticket/${ticket.id}/associations/default/contact/${contactId}`, {
    method: 'PUT'
  });

  // 3. Associate with deal if provided
  if (dealId) {
    console.log(`DEBUG: Associating new ticket ${ticket.id} with deal ${dealId}`);
    await hubspotRequest(`/crm/v4/objects/ticket/${ticket.id}/associations/default/deal/${dealId}`, {
      method: 'PUT'
    });
  }

  // 4. Create an initial INCOMING_EMAIL so it shows up in the chat like a reply
  try {
    const email = await hubspotRequest(`/crm/v3/objects/emails`, {
      method: "POST",
      body: JSON.stringify({
        properties: {
          hs_email_direction: "INCOMING_EMAIL",
          hs_email_subject: subject,
          hs_email_text: content,
          hs_timestamp: new Date().toISOString(),
        }
      })
    });

    await hubspotRequest(`/crm/v4/objects/ticket/${ticket.id}/associations/default/email/${email.id}`, {
      method: "PUT"
    });
  } catch (emailError) {
    console.error("DEBUG: Failed to create initial email message, but ticket was created:", emailError);
  }

  return ticket;
}

/**
 * Uploads a file to HubSpot Files API v3
 * @param file The file object from a form
 * @returns The Hubspot File ID
 */
export async function uploadFile(file: File) {
  if (!HUBSPOT_ACCESS_TOKEN) {
    throw new Error('HUBSPOT_ACCESS_TOKEN is not defined');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('options', JSON.stringify({
    access: 'PRIVATE', // Tickets usually need private/protected access
    overwrite: false
  }));

  const response = await fetch(`${HUBSPOT_API_URL}/files/v3/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      // Note: 'Content-Type' should NOT be set manually when using FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`DEBUG: HubSpot File Upload Error ${response.status} ->`, JSON.stringify(errorData, null, 2));
    throw new Error(`HubSpot File upload error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`DEBUG: HubSpot File Upload Success -> ID: ${data.id}`);
  return data.id as string;
}

export async function getTicketMessages(ticketId: string) {
  try {
    console.log(`DEBUG: Fetching messages for Ticket ID: ${ticketId}`);

    // 0. Fetch the ticket itself to get the initial content/description
    const ticket = await getTicket(ticketId);
    const initialContent = ticket.properties.content;
    const initialDate = ticket.properties.createdate;

    // 1. Get associations for all message types
    const [noteAssoc, emailAssoc, commAssoc] = await Promise.all([
      hubspotRequest(`/crm/v4/objects/ticket/${ticketId}/associations/note`).catch((e) => { console.error("DEBUG: Note assoc error:", e.message); return { results: [] }; }),
      hubspotRequest(`/crm/v4/objects/ticket/${ticketId}/associations/email`).catch((e) => { console.error("DEBUG: Email assoc error:", e.message); return { results: [] }; }),
      hubspotRequest(`/crm/v4/objects/ticket/${ticketId}/associations/communication`).catch((e) => { console.error("DEBUG: Comm assoc error:", e.message); return { results: [] }; })
    ]);

    const noteIds = noteAssoc.results.map((res: any) => res.toObjectId);
    const emailIds = emailAssoc.results.map((res: any) => res.toObjectId);
    const commIds = commAssoc.results.map((res: any) => res.toObjectId);

    console.log(`DEBUG: Found assoc IDs - Notes: ${noteIds.length}, Emails: ${emailIds.length}, Comms: ${commIds.length}`);

    // 2. Batch fetch details for each type
    const [notes, emails, comms] = await Promise.all([
      noteIds.length > 0 ? hubspotRequest(`/crm/v3/objects/notes/batch/read`, {
        method: "POST",
        body: JSON.stringify({
          inputs: noteIds.map((id: string) => ({ id })),
          properties: ["hs_note_body", "hubspot_owner_id", "createdate"],
        }),
      }).then(data => {
        console.log("DEBUG: Notes Batch ->", data.results.map((n: any) => ({ id: n.id, owner: n.properties.hubspot_owner_id })));
        return data;
      }) : { results: [] },
      emailIds.length > 0 ? hubspotRequest(`/crm/v3/objects/emails/batch/read`, {
        method: "POST",
        body: JSON.stringify({
          inputs: emailIds.map((id: string) => ({ id })),
          properties: ["hs_email_text", "hs_email_direction", "createdate", "hs_email_subject", "hs_email_html"],
        }),
      }).then(data => {
        console.log("DEBUG: Emails Batch ->", data.results.map((e: any) => ({ id: e.id, dir: e.properties.hs_email_direction, subj: e.properties.hs_email_subject })));
        return data;
      }) : { results: [] },
      commIds.length > 0 ? hubspotRequest(`/crm/v3/objects/communications/batch/read`, {
        method: "POST",
        body: JSON.stringify({
          inputs: commIds.map((id: string) => ({ id })),
          properties: ["hs_communication_body", "hs_communication_logged_from", "createdate"],
        }),
      }).then(data => {
        console.log("DEBUG: Comms Batch ->", data.results.map((c: any) => ({ id: c.id, from: c.properties.hs_communication_logged_from })));
        return data;
      }) : { results: [] },
    ]);

    // 3. Normalize messages
    const allMessages: any[] = [];

    // Prepend initial message if it exists AND it's not already in emails (to avoid duplication check)
    // We check if any email starts with the same text to be safe
    const hasEmailWithInitialContent = emails.results.some((e: any) => 
      (e.properties.hs_email_text || "").includes(initialContent?.substring(0, 50) || "____")
    );

    if (initialContent && !hasEmailWithInitialContent) {
      const cleanInitial = initialContent.replace(/<[^>]*>?/gm, '').toLowerCase();
      console.log(`DEBUG: Inspecting Initial Content -> "${cleanInitial.substring(0, 50)}..."`);
      
      // Check if it's an automated Solfy response
      const isAutoReply = cleanInitial.includes("hemos recibido") || 
                          cleanInitial.includes("ticket received") ||
                          cleanInitial.includes("su solicitud") ||
                          cleanInitial.includes("benvolgut client") ||
                          cleanInitial.includes("recibido su consulta");

      allMessages.push({
        id: `initial-${ticketId}`,
        text: initialContent.replace(/<[^>]*>?/gm, ''),
        sender: isAutoReply ? "agent" : "user",
        timestamp: initialDate || new Date().toISOString(),
        type: 'initial'
      });
    }

    allMessages.push(
      ...notes.results.map((n: any) => {
        const text = n.properties.hs_note_body?.replace(/<[^>]*>?/gm, '') || "";
        const isBot = text.toLowerCase().includes("hemos recibido") || text.toLowerCase().includes("ticket received");
        return {
          id: n.id,
          text,
          sender: (n.properties.hubspot_owner_id || isBot) ? "agent" : "user",
          timestamp: n.properties.createdate,
          type: 'note'
        };
      }),
      ...emails.results.map((e: any) => {
        const text = (e.properties.hs_email_text || e.properties.hs_email_html || "").replace(/<[^>]*>?/gm, '');
        const isBot = text.toLowerCase().includes("hemos recibido") || text.toLowerCase().includes("ticket received");
        return {
          id: e.id,
          text,
          sender: (e.properties.hs_email_direction === "OUTGOING" || isBot) ? "agent" : "user",
          timestamp: e.properties.createdate,
          type: 'email'
        };
      }),
      ...comms.results.map((c: any) => {
        const text = c.properties.hs_communication_body?.replace(/<[^>]*>?/gm, '') || "";
        const isBot = text.toLowerCase().includes("hemos recibido") || text.toLowerCase().includes("ticket received");
        return {
          id: c.id,
          text,
          sender: (c.properties.hs_communication_logged_from === "CRM" || isBot) ? "agent" : "user",
          timestamp: c.properties.createdate,
          type: 'comm'
        };
      })
    );

    console.log(`DEBUG: Normalized total messages: ${allMessages.length}`);
    return allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error(`Error in getTicketMessages for ${ticketId}:`, error);
    return [];
  }
}

export async function sendTicketMessage(ticketId: string, message: string) {
  try {
    // 1. Fetch current ticket to get the subject for the email
    const ticket = await getTicket(ticketId);
    const subject = ticket?.properties?.subject || "Consulta desde el Portal";

    // 2. Create an Email object (INCOMING_EMAIL)
    const email = await hubspotRequest(`/crm/v3/objects/emails`, {
      method: "POST",
      body: JSON.stringify({
        properties: {
          hs_email_direction: "INCOMING_EMAIL",
          hs_email_subject: `Re: ${subject}`,
          hs_email_text: message,
          hs_timestamp: new Date().toISOString(),
        }
      })
    });

    // 3. Associate Email with Ticket (using v4 default association)
    await hubspotRequest(`/crm/v4/objects/ticket/${ticketId}/associations/default/email/${email.id}`, {
      method: "PUT"
    });

    return email;
  } catch (error) {
    console.error(`Error sending email message for ticket ${ticketId}:`, error);
    throw error;
  }
}

export async function getContactDeals(contactId: string) {
  try {
    // 1. Get associated Deal IDs
    // Using v4 associations API
    const associations = await hubspotRequest(`/crm/v4/objects/contact/${contactId}/associations/deal`);
    const dealIds = associations.results.map((res: any) => res.toObjectId);

    if (dealIds.length === 0) return [];

    // 2. Fetch Deal details in batch
    const deals = await hubspotRequest(`/crm/v3/objects/deals/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        inputs: dealIds.map((id: string) => ({ id })),
        properties: ["dealname", "dealstage", "amount"],
      }),
    });

    return deals.results;
  } catch (error) {
    console.error("HubSpot getContactDeals error:", error);
    return [];
  }
}

export async function getDeal(dealId: string) {
  return hubspotRequest(`/crm/v3/objects/deal/${dealId}?properties=dealname,dealstage,amount,hs_lastmodifieddate,codigo_de_expediente`);
}

export async function getTicket(ticketId: string) {
  return hubspotRequest(`/crm/v3/objects/ticket/${ticketId}?properties=subject,content,hs_ticket_priority,hs_ticket_category,hs_pipeline_stage,createdate`);
}

export async function getDealTickets(dealId: string) {
  try {
    console.log(`DEBUG: Fetching tickets for Deal ID: ${dealId}`);
    const associations = await hubspotRequest(`/crm/v4/objects/deal/${dealId}/associations/ticket`);
    const ticketIds = associations.results.map((res: any) => res.toObjectId);

    console.log(`DEBUG: Found ${ticketIds.length} tickets for deal ${dealId}`);

    if (ticketIds.length === 0) return [];

    const tickets = await hubspotRequest(`/crm/v3/objects/tickets/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        inputs: ticketIds.map((id: string) => ({ id })),
        properties: ["subject", "content", "hs_ticket_priority", "hs_ticket_category", "hs_pipeline_stage", "createdate", "portal_ticket_id"],
      }),
    });

    return tickets.results;
  } catch (error) {
    console.error(`Error fetching tickets for deal ${dealId}:`, error);
    return [];
  }
}

export async function getTicketContact(ticketId: string) {
  try {
    const associations = await hubspotRequest(`/crm/v4/objects/ticket/${ticketId}/associations/contact`);
    const contactId = associations.results?.[0]?.toObjectId;
    if (!contactId) return null;

    const contact = await hubspotRequest(`/crm/v3/objects/contact/${contactId}?properties=firstname,lastname,email,phone,city,hubspot_owner_id`);
    return contact;
  } catch (error) {
    console.error(`Error fetching contact for ticket ${ticketId}:`, error);
    return null;
  }
}
