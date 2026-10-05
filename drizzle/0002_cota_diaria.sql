ALTER TABLE "ordens_servico" ADD COLUMN "cota_diaria" text;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cota_diaria_unique" UNIQUE("cota_diaria");