/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').SessaoUsuario | null;
    session: typeof import('./lib/auth').auth.$Infer.Session.session | null;
  }
}

interface Window {
  Alpine: import('alpinejs').Alpine;
}
