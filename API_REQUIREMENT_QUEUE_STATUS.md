# Backend API Requirement: Queue Status Endpoint

## New Endpoint Required

### GET `/pressing-queue/batch-status/:batchId`

This endpoint should check if a batch is in the `queuer_sessions` table and return its queue status.

#### Expected Response Format:

```json
{
  "inQueue": boolean,              // true if batch exists in queuer_sessions table
  "totalBoxes": number,            // total number of boxes for this batch
  "boxesQueued": number,           // number of boxes currently queued
  "clientName": string,            // name of the client (optional)
  "ticketNumber": string           // ticket number (optional)
}
```

#### Logic:

1. **If batch is NOT in queuer_sessions table:**
   ```json
   {
     "inQueue": false,
     "totalBoxes": 0,
     "boxesQueued": 0
   }
   ```

2. **If batch IS in queuer_sessions table:**
   ```json
   {
     "inQueue": true,
     "totalBoxes": [batch.number_of_boxes],
     "boxesQueued": [sum of number_of_boxes from all queuer_sessions for this batch],
     "clientName": "[client.firstname] [client.lastname]",
     "ticketNumber": "[batch.ticket_number or #batch.id]"
   }
   ```

#### Frontend Usage:

The frontend uses this endpoint to determine if a ticket can proceed to room selection:

- **Can proceed**: ticket is in queue AND all boxes are queued (totalBoxes === boxesQueued)
- **Cannot proceed**: ticket is NOT in queue OR ticket is in queue but not all boxes are queued

**New Logic:**
- Tickets MUST be in the queue first before they can proceed to room selection
- Only when all boxes of a ticket are queued can it proceed to room selection

#### Error Handling:

- Return 404 if batch not found
- Return 500 for database errors
- Frontend will default to allowing proceed if endpoint fails (graceful degradation)

## Implementation Notes:

The query should join the `batches`, `queuer_sessions`, and `clients` tables to get all necessary information in a single request.

Example SQL logic:
```sql
SELECT 
  b.id,
  b.number_of_boxes as total_boxes,
  b.ticket_number,
  c.firstname,
  c.lastname,
  COALESCE(SUM(qs.number_of_boxes), 0) as boxes_queued,
  CASE 
    WHEN COUNT(qs.id) > 0 THEN true 
    ELSE false 
  END as in_queue
FROM batches b
LEFT JOIN clients c ON b.clientId = c.id
LEFT JOIN queuer_sessions qs ON qs.batch_id = b.id
WHERE b.id = :batchId
GROUP BY b.id, b.number_of_boxes, b.ticket_number, c.firstname, c.lastname;
```
