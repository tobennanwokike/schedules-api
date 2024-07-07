import { StackContext, Api, RDS, Queue, Bucket, Duration } from "sst/constructs";

export function ScheduleStack({ stack }: StackContext) {

  const bucket = new Bucket(stack, "Bucket");

  const dlq = new Queue(stack, "DeadLetterQueue", {
    consumer: {
      function: {
        handler: "packages/functions/src/dlq.handler",
        timeout: 10,
      },
      cdk: {
        eventSource: {
          batchSize: 1,
        },
      },
    },
  });

  const queue = new Queue(stack, "Queue", {
    consumer: {
      function: {
        handler: "packages/functions/src/consumer.handler",
        timeout: 10,
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
        permissions: [bucket],
      },
      cdk: {
        eventSource: {
          batchSize: 1,
        },
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: {
          maxReceiveCount: 1,
          queue: dlq.cdk.queue,
        }
      },
    }
  });

  const DATABASE = "SchedulesDB";

  // Create the Aurora DB cluster
  const cluster = new RDS(stack, "Cluster", {
    engine: "postgresql13.9",
    defaultDatabaseName: DATABASE,
    migrations: "services/migrations",
  });

  const api = new Api(stack, "Api", {
    routes: {
      "GET /schedule/{user_id}": {
        function: {
          handler: "packages/functions/src/get.handler",
          timeout: 20,
          bind: [cluster],
        }
      },
      "POST /schedule": {
        function: {
          handler: "packages/functions/src/post.handler",
          timeout: 20,
          bind: [cluster, queue],
        }
      },
      "PUT /schedule": {
        function: {
          handler: "packages/functions/src/put.handler",
          timeout: 20,
          bind: [cluster, queue],
        }
      },
      "POST /schedule/availability/{user_id}": {
        function: {
          handler: "packages/functions/src/availability.handler",
          timeout: 20,
          bind: [cluster],
        }
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
