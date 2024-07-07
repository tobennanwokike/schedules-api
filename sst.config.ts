import { SSTConfig } from "sst";
import { ScheduleStack } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "schedules",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ScheduleStack);
  }
} satisfies SSTConfig;
