import { getTicketsByContactId, getContactDeals, getDealTickets } from "@/lib/hubspot";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { TicketList } from "@/components/ticket-list";
import { ProjectFilter } from "@/components/project-filter";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { dealId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('hubspot_contact_id')
    .eq('id', user.id)
    .single();
  
  const contactId = profile?.hubspot_contact_id;

  // 1. Fetch data based on filter
  const [projects, tickets] = await Promise.all([
    contactId ? getContactDeals(contactId) : [],
    contactId 
      ? (dealId ? getDealTickets(dealId) : getTicketsByContactId(contactId))
      : []
  ]);

  // KPI Calculations (these now reflect the filtered list)
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t: any) => 
    !["Cerrado", "Resuelto", "CERRADO", "RESOLVIDO"].includes(t.properties.hs_pipeline_stage)
  ).length;
  const highPriority = tickets.filter((t: any) => t.properties.hs_ticket_priority === "HIGH").length;
  const lastUpdate = tickets.length > 0 
    ? new Date(tickets[0].properties.createdate).toLocaleDateString('es', { day: '2-digit', month: 'short' }) 
    : "N/A";

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Panel de Soporte</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
               <span>Tickets</span>
               <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
               <span>Histórico de consultas</span>
            </div>
          </div>
          
          <ProjectFilter projects={projects} currentDealId={dealId} />
        </div>
        <Button asChild className="rounded-full shadow-lg h-10 px-6 font-black uppercase text-[11px] tracking-tight transition-transform active:scale-95">
          <Link href={dealId ? `/protected/tickets/new?dealId=${dealId}` : "/protected/tickets/new"}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Ticket
          </Link>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-none rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              Total Tickets
              <div className="p-1 rounded bg-muted h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-none rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              Tickets Abiertos
              <div className="p-1 rounded bg-secondary flex items-center justify-center h-5 w-5">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{openTickets}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-none rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              Alta Prioridad
              <div className="p-1 rounded bg-destructive/10 flex items-center justify-center h-5 w-5">
                 <AlertCircle className="h-3 w-3 text-destructive" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{highPriority}</div>
            <p className="text-[9px] font-bold text-destructive mt-1 uppercase">Atención requerida</p>
          </CardContent>
        </Card>

        <Card className="border shadow-none rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              Última Actividad
              <div className="p-1 rounded bg-muted flex items-center justify-center h-5 w-5">
                 <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{lastUpdate}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Sincronizado</p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
          <TicketList initialTickets={tickets} />
      </div>
    </div>
  );
}
