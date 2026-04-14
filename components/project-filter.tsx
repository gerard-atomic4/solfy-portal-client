"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface ProjectFilterProps {
  projects: any[];
  currentDealId?: string;
}

export function ProjectFilter({ projects, currentDealId }: ProjectFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("dealId");
    } else {
      params.set("dealId", value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[300px]">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        <Building2 className="h-3 w-3" />
        Filtrar por Proyecto
      </div>
      <Select value={currentDealId || "all"} onValueChange={handleValueChange}>
        <SelectTrigger className="rounded-xl border-2 h-11 focus:ring-primary bg-card w-full">
          <SelectValue placeholder="Todos los proyectos" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-2 shadow-xl">
          <SelectItem value="all" className="font-bold py-3">Todos los proyectos</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id} className="font-medium">
              {project.properties.dealname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
