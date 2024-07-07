import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { updateSchedule, validateSchedule, validateTimezone, sendSqsMessage, createResponse, Schedule, getDatabase } from "@schedules/core/schedule";

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
    await updateSchedule(userId, body.schedule, body.timezone, db);
    await sendSqsMessage(userId, body);

    return createResponse(200, { status: true, message: "Schedule updated successfully", data: body.schedule });
  } catch (error: any) {
    return createResponse(500, { status: false, message: "Failed to update schedule", error: error.message });
  }
};