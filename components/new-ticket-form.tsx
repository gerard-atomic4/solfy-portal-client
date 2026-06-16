"use client";

import { useState, useMemo } from "react";
import { createTicketAction } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, X, AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionItem = {
  label: string;
  value: string;
};

// Mapping of types to their respective subcategories from user's HTML
const INCIDENT_CATEGORIES = {
  "Sistema Fotovoltaico": [
    { label: "Conexión sistema de monitorización", value: "Conexión sistema de monitorización" },
    { label: "Datos o lectura errónea del sistema", value: "Datos o lectura errónea del sistema" },
    { label: "Fallas técnicas en el sistema fotovoltaico", value: "Fallas técnicas en el sistema fotovoltaico" },
    { label: "Fallas técnicas en la batería", value: "Fallas técnicas en la batería" },
    { label: "Incidencias estructurales/estéticos post-obra", value: "Incidencias estructurales/estéticos post-obra" },
    { label: "Quejas de producción / Incoherencia factura de luz", value: "Quejas de producción / Incoherencia factura de luz" },
    { label: "Permisos de accesos", value: "Permisos de accesos" },
    { label: "Otros", value: "Otros" },
    { label: "Retraso instalación", value: "Retraso instalación" },
  ],
  "Sistema de Aerotermia": [
    { label: "Fugas / Fallos eléctricos", value: "Fugas / Fallos eléctricos" },
    { label: "ACS", value: "ACS" },
    { label: "Error en equipos", value: "Error en equipos" },
    { label: "Retraso instalación", value: "Retraso instalación" },
    { label: "Problemas con enfriamiento/calefacción", value: "Sensación Confort" },
    { label: "Estética", value: "Estética" },
    { label: "Quejas de producción / Incoherencia factura de luz", value: "Quejas de producción / Incoherencia factura de luz" },
    { label: "Permisos de accesos", value: "Permisos de accesos" },
    { label: "Otros", value: "Otros" },
  ],
  "Cargador de coche Eléctrico": [
    { label: "Mal funcionamiento de cargador", value: "Mal funcionamiento de cargador" },
    { label: "Retraso instalación", value: "Retraso instalación" },
    { label: "Otros", value: "Otros" },
  ]
} as const;

const DOCUMENTATION_CATEGORIES: OptionItem[] = [
  { label: "IBI/Requerimientos", value: "IBI/Req" },
  { label: "Legalizaciones", value: "Legalizaciones" },
  { label: "Permisos municipales/requerimientos/pagos", value: "Permisos/req/pagos" },
  { label: "Certificados energéticos", value: "Certificados energéticos" },
  { label: "Gestión subvenciones", value: "Gestión subvenciones" },
  { label: "Otros", value: "Otros" },
];

type InstallationType = keyof typeof INCIDENT_CATEGORIES;

interface NewTicketFormProps {
  defaultName?: string;
  defaultEmail?: string;
  defaultExpediente?: string;
  formCategory?: "asistencia" | "documentacion";
  availableProjects?: { id: string; properties: { dealname: string } }[];
}

export function NewTicketForm({ 
  defaultName = "", 
  defaultEmail = "", 
  defaultExpediente = "",
  formCategory = "asistencia",
  availableProjects = []
}: NewTicketFormProps) {
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams.get("dealId");
  const urlType = searchParams.get("type");
  
  const [selectedDealId, setSelectedDealId] = useState<string>(dealIdFromUrl || "");
  
  // Asistencia state
  const [installationType, setInstallationType] = useState<InstallationType | "">(
    (urlType && Object.keys(INCIDENT_CATEGORIES).includes(urlType)) 
      ? urlType as InstallationType 
      : ""
  );
  const [subCategory, setSubCategory] = useState<string>("");
  
  // Documentacion state
  const [docCategory, setDocCategory] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const currentSubCategories = useMemo(() => {
    if (!installationType) return [];
    return INCIDENT_CATEGORIES[installationType as InstallationType] || [];
  }, [installationType]);

  const selectedSubCategoryOption = currentSubCategories.find((option) => option.value === subCategory);
  const selectedDocCategoryOption = DOCUMENTATION_CATEGORIES.find((option) => option.value === docCategory);

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

    if (!selectedDealId) {
      setError("Debes seleccionar un proyecto.");
      setIsLoading(false);
      return;
    }

    if (formCategory === "asistencia" && (!installationType || !subCategory)) {
      setError("Completa tipo de instalación y tipología de incidencia.");
      setIsLoading(false);
      return;
    }

    if (formCategory === "documentacion" && !docCategory) {
      setError("Debes seleccionar la tipología de consulta.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("formCategory", formCategory);

    // Hidden technical fields
    formData.append("full_name", defaultName);
    formData.append("email", defaultEmail);
    formData.append("installation_code", defaultExpediente);
    if (selectedDealId) {
      formData.append("dealId", selectedDealId);
    }

    // Explicitly add attachments
    files.forEach(file => {
      formData.append("attachments", file);
    });

    // Subject calculation
    let subject = "";
    if (formCategory === "asistencia") {
      subject = `${installationType}: ${selectedSubCategoryOption?.label || subCategory}`;
    } else {
      subject = `${selectedDocCategoryOption?.label || docCategory}`;
      // Also pass the doc category to the form data so the server action can process it if needed
      formData.append("TICKET.tipologia_tramites", docCategory);
    }
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
    <div className="w-full max-w-3xl mx-auto">
      <Card className="border-0 shadow-none rounded-none bg-transparent overflow-visible">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project Selection (only if not pre-selected) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70">Asociar a un Proyecto *</Label>
              <Select 
                value={selectedDealId}
                onValueChange={setSelectedDealId}
                required
              >
                <SelectTrigger className="rounded-xl border-2 h-11 focus:ring-primary w-full min-w-0">
                  <SelectValue placeholder="Selecciona el proyecto" className="truncate" />
                </SelectTrigger>
                <SelectContent className="rounded-xl w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                  {availableProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.properties.dealname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categorization Section */}
            {formCategory === "asistencia" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Tipologia incidencia *</Label>
                  <Select 
                    name="TICKET.tipologia_incidencia" 
                    value={installationType}
                    onValueChange={(val) => {
                      setInstallationType(val as InstallationType);
                      setSubCategory(""); // Reset sub when type changes
                    }}
                    required
                  >
                    <SelectTrigger className="rounded-xl border-2 h-11 focus:ring-primary w-full min-w-0">
                      <SelectValue placeholder="Selecciona el sistema" className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                      {Object.keys(INCIDENT_CATEGORIES).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Sub categoría *</Label>
                  <Select 
                    name={installationType === "Sistema Fotovoltaico" ? "TICKET.sub_categorias_incidencias" : 
                          installationType === "Sistema de Aerotermia" ? "TICKET.sub_categorias_incidencias___aerotermia" : 
                          "TICKET.sub_categoria_incidencia___cargador_coche_electrico"} 
                    value={subCategory}
                    onValueChange={setSubCategory}
                    disabled={!installationType}
                    required
                  >
                    <SelectTrigger className={cn("rounded-xl border-2 h-11 focus:ring-primary w-full min-w-0", !installationType && "opacity-50")}>
                      <SelectValue placeholder={installationType ? "Selecciona..." : "Primero elige sistema"} className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[300px] w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                      {currentSubCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest opacity-70">Tipologia tramites *</Label>
                <Select 
                  value={docCategory}
                  onValueChange={setDocCategory}
                  required
                >
                  <SelectTrigger className="rounded-xl border-2 h-11 focus:ring-primary w-full min-w-0">
                    <SelectValue placeholder="Indícanos la tipología de consulta" className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                    {DOCUMENTATION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest opacity-70">
                {formCategory === "asistencia" ? "Explícanos tu incidencia *" : "Descripción *"}
              </Label>
              <Textarea
                id="content"
                name="content"
                placeholder={formCategory === "asistencia" 
                  ? "Describe qué sucede con el mayor detalle posible..."
                  : "Explícanos los detalles de tu consulta"}
                className="min-h-[120px] rounded-xl border-2 focus-visible:ring-primary p-3"
                required
              />
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70">Documentación / Imágenes (opcional)</Label>
              <div 
                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  multiple 
                  onChange={handleFileChange}
                />
                <UploadCloud className="mx-auto size-7 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
                <p className="text-sm font-bold">Haz clic o arrastra archivos para subirlos</p>
                <p className="text-xs text-muted-foreground">Imágenes o PDF (máx. 10MB por archivo)</p>
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-xl border group">
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
              <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-bold">
                <AlertCircle className="size-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}



            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-11 rounded-xl font-black text-muted-foreground"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-11 rounded-xl font-black text-base shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                    Enviando solicitud...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Enviar solicitud
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
