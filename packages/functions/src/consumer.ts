import { SQSEvent } from "aws-lambda";
import { S3 } from "@aws-sdk/client-s3";

const s3Client = new S3({ region: 'us-east-1' });

export const handler = async (evt: SQSEvent) => {
    const messageBody = JSON.parse(evt.Records[0].body);
    if(messageBody.user_id === 'user3'){
        throw new Error('User3 is exempted from saving their schedule');
    }
    const params = {
        Bucket: process.env.BUCKET_NAME as string,
        Key: messageBody.user_id+"/"+Date.now()+".json",
        Body: JSON.stringify(messageBody.schedule),
    };
    await s3Client.putObject(params);
    return true;
};
