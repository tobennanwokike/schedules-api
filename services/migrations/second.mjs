import { Kysely, sql } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("schedules")
    .addColumn("user_id", "varchar(255)", (col) => col.primaryKey())
    .addColumn("schedule", "jsonb", (col) => col.notNull())
    .addColumn("timezone", "varchar(255)", (col) => col.notNull())
    .execute();

  await db
    .insertInto("schedules")
    .values([
      {
        user_id: "user1",
        schedule: sql`CAST(${JSON.stringify({
          monday: [{ start: "09:00", end: "17:00" }],
          tuesday: [{ start: "13:00", end: "17:00" }],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        })} AS jsonb)`,
        timezone: "Europe/Helsinki",
      },
      {
        user_id: "user2",
        schedule: sql`CAST(${JSON.stringify({
          monday: [{ start: "08:00", end: "12:00" }],
          tuesday: [{ start: "14:00", end: "18:00" }],
          wednesday: [{ start: "10:00", end: "16:00" }],
          thursday: [],
          friday: [{ start: "09:00", end: "11:00" }],
          saturday: [],
          sunday: [],
        })} AS jsonb)`,
        timezone: "Africa/Lagos",
      },
      {
        user_id: "user3",
        schedule: sql`CAST(${JSON.stringify({
          monday: [{ start: "07:00", end: "15:00" }],
          tuesday: [],
          wednesday: [{ start: "09:00", end: "17:00" }],
          thursday: [{ start: "12:00", end: "20:00" }],
          friday: [],
          saturday: [{ start: "10:00", end: "14:00" }],
          sunday: [],
        })} AS jsonb)`,
        timezone: "America/New_York",
      },
    ])
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropTable("schedules").execute();
}
