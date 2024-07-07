import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { fetchSchedule, createResponse, getDatabase } from "@schedules/core/schedule";

const db = getDatabase();

export const handler: APIGatewayProxyHandlerV2 = async (evt) => {
  const userId: string = evt.pathParameters?.user_id || '';

  if (!userId) {
    return createResponse(400, { status: false, message: "User ID is required" });
  }

  try {
    const scheduleRecord = await fetchSchedule(userId, db);

    if (!scheduleRecord) {
      return createResponse(404, { status: false, message: "Schedule not found" });
    }

    return createResponse(200, { status: true, message: "Schedule fetched successfully", data: JSON.parse(scheduleRecord.schedule) });
  } catch (error: any) {
    return createResponse(500, { status: false, message: "Failed to fetch schedule", error: error.message });
  }
};
