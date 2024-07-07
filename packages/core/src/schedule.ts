import { Kysely, sql } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDSData } from "@aws-sdk/client-rds-data";
import { RDS } from "sst/node/rds";
import moment from "moment-timezone";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface Schedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface Database {
  schedules: {
    user_id: string;
    schedule: string; 
    timezone: string;
  };
}

const db = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: "postgres",
    driver: {
      database: RDS.Cluster.defaultDatabaseName,
      secretArn: RDS.Cluster.secretArn,
      resourceArn: RDS.Cluster.clusterArn,
      client: new RDSData({}),
    },
  }),
});

export const getDatabase = () => db;

const sqs = new SQSClient({ region: 'us-east-1' });

export const validateTimeSlot = (slot: TimeSlot): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
    return false;
  }
  return slot.start < slot.end;
};

export const validateSchedule = (schedule: Schedule): string | null => {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  for (const day of days) {
    const slots = schedule[day as keyof Schedule];
    if (!Array.isArray(slots)) return `Invalid format for ${day}`;
    
    for (const slot of slots) {
      if (!validateTimeSlot(slot)) return `Invalid time slot on ${day}: ${JSON.stringify(slot)}`;
    }

    // Check for overlapping time slots
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].end > slots[j].start && slots[i].start < slots[j].end) {
          return `Overlapping time slots on ${day}: ${JSON.stringify(slots[i])} and ${JSON.stringify(slots[j])}`;
        }
      }
    }
  }

  return null;
};

export const validateTimezone = (timezone: string): boolean => {
  return moment.tz.zone(timezone) !== null;
};

export const fetchSchedule = async (userId: string, db: Kysely<Database>) => {
  return await db
    .selectFrom('schedules')
    .select(['schedule', 'timezone'])
    .where('user_id', '=', userId)
    .executeTakeFirst();
};

export const insertSchedule = async (userId: string, schedule: Schedule, timezone: string, db: Kysely<Database>) => {
  const serializedSchedule = JSON.stringify(schedule);
  await db
    .insertInto('schedules')
    .values({
      user_id: userId,
      schedule: sql`${serializedSchedule}::jsonb`,
      timezone: timezone,
    })
    .execute();
};

export const updateSchedule = async (userId: string, schedule: Schedule, timezone: string, db: Kysely<Database>) => {
  const serializedSchedule = JSON.stringify(schedule);
  await db
    .updateTable('schedules')
    .set({
      schedule: sql`${serializedSchedule}::jsonb`,
      timezone: timezone,
    })
    .where('user_id', '=', userId)
    .execute();
};

export const sendSqsMessage = async (userId: string, body: any) => {
    const sqsMessage = {
      user_id: userId,
      schedule: body,
    };
  
    const params = {
      QueueUrl: Queue.Queue.queueUrl,
      MessageBody: JSON.stringify(sqsMessage),
    };
    await sqs.send(new SendMessageCommand(params));
};

export const createResponse = (statusCode: number, body: any) => {
    if (body && body.status === false) {
      console.error('Error:', body);
    }
  
    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
};
