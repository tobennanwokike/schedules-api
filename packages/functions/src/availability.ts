import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { fetchSchedule, createResponse, validateTimezone, Schedule, TimeSlot, getDatabase } from "@schedules/core/schedule";
import moment from "moment-timezone";

const db = getDatabase();

export const handler: APIGatewayProxyHandlerV2 = async (evt) => {
  const userId: string = evt.pathParameters?.user_id as string;
  const { timestamp, timezone } = JSON.parse(evt.body || '{}') as { timestamp: string, timezone: string };

  if (!userId) {
    return createResponse(400, { status: false, message: "User ID is required" });
  }

  if (!timestamp || !moment(timestamp, 'YYYY-MM-DDTHH:mm:ss', true).isValid()) {
    return createResponse(400, { status: false, message: "Valid timestamp is required" });
  }

  if (!timezone || !validateTimezone(timezone)) {
    return createResponse(400, { status: false, message: "Valid timezone is required" });
  }

  try {
    const userRecord = await fetchSchedule(userId, db);

    if (!userRecord) {
      return createResponse(404, { status: false, message: "User not found" });
    }

    const userTimezone = userRecord.timezone;
    const userSchedule = JSON.parse(userRecord.schedule);

    const callerTime = moment.tz(timestamp, 'YYYY-MM-DDTHH:mm:ss', timezone);
    const userTime = callerTime.clone().tz(userTimezone);

    const dayOfWeek = userTime.format('dddd').toLowerCase();
    const timeOfDay = userTime.format('HH:mm');

    const slots = userSchedule[dayOfWeek as keyof Schedule] as TimeSlot[];

    const isOnline = slots.some(slot => slot.start <= timeOfDay && timeOfDay < slot.end);

    return createResponse(200, {
      status: true,
      message: "User availability checked successfully",
      data: { userId, availability: isOnline ? 'online' : 'offline' },
    });
  } catch (error: any) {
    return createResponse(500, {
      status: false,
      message: "Failed to check availability",
      error: error.message,
    });
  }
};
