import { SQSEvent } from "aws-lambda";
export const handler = async (evt: SQSEvent) => {
  console.log('DLQ Event:', JSON.stringify(evt));
};