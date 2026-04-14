import { getDeal, getDealTickets } from "@/lib/hubspot";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar, Clock, Tag } from "lucide-react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // 1. Get user and verify deal
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch Deal and Tickets
  const [deal, tickets] = await Promise.all([
    getDeal(id),
    getDealTickets(id)
  ]);

  if (!deal) notFound();

  // Temporary mapping logic for the type (ideally use a real HubSpot property if available)
  const dealName = (deal.properties.dealname || "").toLowerCase();
  const inferredType = dealName.includes("aerotermia") 
    ? "Sistema de Aerotermia" 
    : dealName.includes("cargador") || dealName.includes("carregador")
    ? "Cargador de coche Eléctrico"
    : "Sistema Fotovoltaico";

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Link href="/protected/projects" className="p-2 hover:bg-muted rounded-full">
            <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
             Proyecto Activo
          </Badge>
          <h1 className="text-3xl font-black mt-1 tracking-tight">{deal.properties.dealname}</h1>
        </div>
        <Link href={`/protected/tickets/new?dealId=${id}&type=${encodeURIComponent(inferredType)}`}>
            <Button className="font-bold flex gap-2">
                <Plus className="h-4 w-4" /> Nuevo Ticket
            </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
          {/* Main Info Card */}
          <Card className="md:col-span-1 border-2">
            <CardHeader>
                <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
                <CardDescription>Información general</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><Calendar className="h-3 w-3" /> Último cambio</span>
                    <span className="font-medium">{new Date(deal.properties.hs_lastmodifieddate).toLocaleDateString('es')}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><Tag className="h-3 w-3" /> Tipo</span>
                    <span className="font-medium">{inferredType}</span>
                </div>
            </CardContent>
          </Card>

          {/* Tickets List for this Deal */}
          <Card className="md:col-span-3 border-2">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
                <div>
                   <CardTitle className="text-xl font-bold">Tickets de este proyecto</CardTitle>
                   <CardDescription>Seguimiento de tareas y soporte</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">{tickets.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y">
                 {tickets.length > 0 ? (
                   tickets.map((ticket: any) => (
                     <Link key={ticket.id} href={`/protected/tickets/${ticket.id}`} className="block p-6 hover:bg-muted/50 transition-colors group">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-muted-foreground uppercase">{ticket.properties.portal_ticket_id || `SOL-${ticket.id}`}</span>
                                <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{ticket.properties.subject}</h4>
                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(ticket.properties.createdate), { addSuffix: true, locale: es })}</span>
                                    <Badge variant={ticket.properties.hs_ticket_priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {ticket.properties.hs_ticket_priority || 'NORMAL'}
                                    </Badge>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase font-black text-[10px]">
                                {ticket.properties.hs_pipeline_stage}
                            </Badge>
                        </div>
                     </Link>
                   ))
                 ) : (
                   <div className="p-12 text-center text-muted-foreground italic">
                      No hay tickets asociados a este proyecto.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
