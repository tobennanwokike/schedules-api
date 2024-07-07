import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { insertSchedule, validateSchedule, validateTimezone, fetchSchedule, sendSqsMessage, createResponse, Schedule, getDatabase } from "@schedules/core/schedule";

const db = getDatabase();

export const handler: APIGatewayProxyHandlerV2 = async (evt) => {
  const userId: string = evt.headers['user_id'] || '';
  const body = JSON.parse(evt.body || '{}') as { schedule: Schedule; timezone: string };

  if (!userId) {
    return createResponse(400, { status: false, message: "User ID is required" });
  }

  if (!body.schedule) {
    return createResponse(400, { status: false, message: "Schedule is required" });
  }

  if (!body.timezone) {
    return createResponse(400, { status: false, message: "Timezone is required" });
  }

  if (!validateTimezone(body.timezone)) {
    return createResponse(400, { status: false, message: "Invalid timezone" });
  }

  const validationError = validateSchedule(body.schedule);
  if (validationError) {
    return createResponse(400, { status: false, message: validationError });
  }

  try {
    const existingRecord = await fetchSchedule(userId, db);

    if (existingRecord) {
      return createResponse(409, { status: false, message: "Schedule already exists" });
    }

    await insertSchedule(userId, body.schedule, body.timezone, db);
    await sendSqsMessage(userId, body);

    return createResponse(201, { status: true, message: "Schedule created successfully", data: body.schedule });
  } catch (error: any) {
    return createResponse(500, { status: false, message: "Failed to create schedule", error: error.message });
  }
};
