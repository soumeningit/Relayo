-- CreateIndex
CREATE INDEX "deliveries_event_id_destination_id_status_idx" ON "deliveries"("event_id", "destination_id", "status");

-- CreateIndex
CREATE INDEX "deliveries_organization_id_status_next_retry_at_idx" ON "deliveries"("organization_id", "status", "next_retry_at");

-- CreateIndex
CREATE INDEX "deliveries_organization_id_created_at_idx" ON "deliveries"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_organization_id_created_at_idx" ON "events"("organization_id", "created_at" DESC);
