import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function LoginPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex font-body">

      {/* ─── Left panel – branding ─────────────────────────── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-brand-dark">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center">
            <span className="text-black font-display font-black text-lg">C</span>
          </div>
          <div>
            <p className="text-white font-display font-bold text-base">Le Consortium</p>
            <p className="text-white/40 text-xs">de coopération des entreprises collectives</p>
          </div>
        </div>

        {/* Quote */}
        <div>
          <blockquote className="text-white/70 text-xl font-display font-medium leading-relaxed mb-6">
            "Les experts du Consortium font la différence pour les entreprises collectives."
          </blockquote>
          <div className="flex gap-2">
            <span className="w-8 h-1 rounded-full bg-brand-gold"></span>
            <span className="w-2 h-1 rounded-full bg-white/20"></span>
            <span className="w-2 h-1 rounded-full bg-white/20"></span>
          </div>
        </div>

        {/* Bottom decoration */}
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} Le Consortium de coopération des entreprises collectives
        </p>
      </div>

      {/* ─── Right panel – login form ──────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-brand-light">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-gold flex items-center justify-center">
              <span className="text-black font-display font-black text-base">C</span>
            </div>
            <p className="text-brand-dark font-display font-bold">Le Consortium</p>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-black text-brand-dark mb-2">
              Bienvenue
            </h1>
            <p className="text-brand-gray50 text-sm">
              Connectez-vous avec votre compte Microsoft pour accéder au CRM.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-brand-dark hover:bg-brand-gray80
                       text-white font-semibold text-sm py-3.5 px-6 rounded-xl
                       transition-all duration-200 shadow-md hover:shadow-lg mb-4"
          >
            {/* Microsoft icon SVG */}
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
              <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Se connecter avec Microsoft
          </button>

          <p className="text-center text-brand-gray50 text-xs mt-6">
            Accès réservé aux membres du Consortium
          </p>
        </div>
      </div>
    </div>
  );
}
