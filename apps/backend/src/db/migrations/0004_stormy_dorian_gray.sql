ALTER TABLE "university_creation_request" RENAME COLUMN "created_organization_id" TO "approved_organization_id";--> statement-breakpoint
ALTER TABLE "university_creation_request" DROP CONSTRAINT "university_creation_request_created_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "university_creation_request" ADD COLUMN "approval_mode" text;--> statement-breakpoint
UPDATE "university_creation_request"
SET "approval_mode" = 'create'
WHERE "status" = 'approved' AND "approved_organization_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "university_creation_request" ADD CONSTRAINT "university_creation_request_approved_organization_id_organization_id_fk" FOREIGN KEY ("approved_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;
