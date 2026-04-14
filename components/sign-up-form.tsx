"use client";

import { signUpAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signUpAction(formData);
    console.log("DEBUG Client: signUpAction result ->", result);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full flex-1 flex flex-col min-w-64 max-w-sm gap-4 text-center p-10 bg-card rounded-3xl border shadow-2xl shadow-primary/5">
        <h1 className="text-3xl font-black text-primary tracking-tighter">¡Enlace enviado!</h1>
        <p className="text-muted-foreground leading-relaxed font-medium">
          Hemos enviado un enlace de acceso a tu correo electrónico. 
          Haz clic en él para entrar y gestionar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-w-64 max-w-sm mx-auto p-10 bg-card rounded-3xl border shadow-2xl shadow-primary/5">
      <h1 className="text-3xl font-black tracking-tighter text-foreground">Registro<span className="text-primary">.</span></h1>
      <p className="text-sm text-muted-foreground mt-1 font-medium italic">
        Ingresa tu email para recibir el acceso instantáneo.
      </p>
      <div className="flex flex-col gap-4 mt-8">
        <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input 
                id="email"
                name="email" 
                type="email"
                placeholder="tu@ejemplo.com" 
                required 
            />
        </div>
        
        <SubmitButton pendingText="Enviando..." disabled={isLoading}>
          Recibir enlace de acceso
        </SubmitButton>
        
        {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-center">
                <p className="text-xs text-destructive font-bold">
                    {typeof error === "string" ? error : "Ha ocurrido un error inesperado al intentar registrarte."}
                </p>
            </div>
        )}
        
        <p className="text-xs text-center text-muted-foreground mt-2">
            ¿Ya tienes una cuenta?{" "}
            <Link className="text-primary font-medium underline" href="/auth/login">
            Inicia sesión
            </Link>
        </p>
      </div>
    </form>
  );
}
