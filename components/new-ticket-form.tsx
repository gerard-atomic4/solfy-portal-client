"use client";

import { useState, useMemo } from "react";
import { createTicketAction } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, X, AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

// Mapping of types to their respective subcategories from user's HTML
const INCIDENT_CATEGORIES = {
  "Sistema Fotovoltaico": [
    "Conexión sistema de monitorización",
    "Datos o lectura errónea del sistema",
    "Fallas técnicas en el sistema fotovoltaico",
    "Fallas técnicas en la batería",
    "Incidencias estructurales/estéticos post-obra",
    "Quejas de producción / Incoherencia factura de luz",
    "Permisos de accesos",
    "Otros",
    "Retraso instalación"
  ],
  "Sistema de Aerotermia": [
    "Fugas / Fallos eléctricos",
    "ACS",
    "Error en equipos",
    "Retraso instalación",
    "Problemas con enfriamiento/calefacción",
    "Estética",
    "Quejas de producción / Incoherencia factura de luz",
    "Permisos de accesos",
    "Otros"
  ],
  "Cargador de coche Eléctrico": [
    "Mal funcionamiento de cargador",
    "Retraso instalación",
    "Otros"
  ]
} as const;

type InstallationType = keyof typeof INCIDENT_CATEGORIES;

export function NewTicketForm() {
  const searchParams = useSearchParams();
  const dealId = searchParams.get("dealId");
  const urlType = searchParams.get("type");
  
  // Logic to determine initial type from URL
  const [installationType, setInstallationType] = useState<InstallationType | "">(
    (urlType && Object.keys(INCIDENT_CATEGORIES).includes(urlType)) 
      ? urlType as InstallationType 
      : ""
  );
  const [subCategory, setSubCategory] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const currentSubCategories = useMemo(() => {
    if (!installationType) return [];
    return INCIDENT_CATEGORIES[installationType as InstallationType] || [];
  }, [installationType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    // Explicitly add attachments
    files.forEach(file => {
      formData.append("attachments", file);
    });

    // Subject is required in HubSpot API but we might want it calculated to match screenshot's simple vibe
    const subject = `Incidencia ${installationType}: ${subCategory}`;
    formData.append("subject", subject);

    const result = await createTicketAction(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result.success) {
      router.push(`/protected/tickets/${result.hubspotId || result.portalId}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-2 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="mb-10">
            <h1 className="text-3xl font-black tracking-tighter">Apertura de incidencia<span className="text-primary">.</span></h1>
            <p className="text-muted-foreground mt-2 font-medium">Relata tu problema y adjunta la información necesaria.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Person Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-black uppercase tracking-widest opacity-70">Nombre del titular</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Juan Pérez"
                  className="rounded-xl border-2 h-12 focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation_code" className="text-xs font-black uppercase tracking-widest opacity-70">Código de instalación</Label>
                <div className="relative">
                  <Input
                    id="installation_code"
                    name="installation_code"
                    placeholder="25ABC00000"
                    className="rounded-xl border-2 h-12 focus-visible:ring-primary pr-10"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <AlertCircle className="size-4" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Lo encontrarás en tu factura o app de monitorización.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest opacity-70">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="juan@ejemplo.com"
                className="rounded-xl border-2 h-12 focus-visible:ring-primary"
                required
              />
            </div>

            {/* Categorization Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-70">Tipo de instalación</Label>
                <Select 
                  name="TICKET.tipologia_incidencia" 
                  value={installationType}
                  onValueChange={(val) => {
                    setInstallationType(val as InstallationType);
                    setSubCategory(""); // Reset sub when type changes
                  }}
                  required
                >
                  <SelectTrigger className="rounded-xl border-2 h-12 focus:ring-primary">
                    <SelectValue placeholder="Selecciona el sistema" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.keys(INCIDENT_CATEGORIES).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-70">Tipología de la incidencia</Label>
                <Select 
                  name={installationType === "Sistema Fotovoltaico" ? "TICKET.sub_categorias_incidencias" : 
                        installationType === "Sistema de Aerotermia" ? "TICKET.sub_categorias_incidencias___aerotermia" : 
                        "TICKET.sub_categoria_incidencia___cargador_coche_electrico"} 
                  value={subCategory}
                  onValueChange={setSubCategory}
                  disabled={!installationType}
                  required
                >
                  <SelectTrigger className={cn("rounded-xl border-2 h-12 focus:ring-primary", !installationType && "opacity-50")}>
                    <SelectValue placeholder={installationType ? "Selecciona..." : "Primero elige sistema"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[300px]">
                    {currentSubCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest opacity-70">Explícanos tu incidencia</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Describe qué sucede con el mayor detalle posible..."
                className="min-h-[150px] rounded-2xl border-2 focus-visible:ring-primary p-4"
                required
              />
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70">Documentación / Imágenes</Label>
              <div 
                className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  multiple 
                  onChange={handleFileChange}
                />
                <UploadCloud className="mx-auto size-10 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                <p className="text-sm font-bold">Haz clic o arrastra archivos para subirlos</p>
                <p className="text-xs text-muted-foreground mt-1">Imágenes o PDF (máx. 10MB por archivo)</p>
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Paperclip className="size-4 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm font-bold">
                <AlertCircle className="size-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Hidden input for dealId */}
            {dealId && <input type="hidden" name="dealId" value={dealId} />}

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-14 rounded-2xl font-black text-muted-foreground"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                    Enviando incidencia...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Enviar reporte
                    <CheckCircle2 className="size-5" />
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
