import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { APIGatewayProxyEvent } from "aws-lambda";

interface IEventBody {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

const sesClient = new SESClient({region: 'us-east-1'});

export const handler = async (event: APIGatewayProxyEvent) => {
  // If no body, return an error
  console.log(event);
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: `Missing body ${event}` }),
    };
  }

  const VERIFIED_EMAIL = 'andrewcarlisle95@gmail.com';

  // Get data from the request sent from the frontend that triggered the lambda
  const body = JSON.parse(event.body) as IEventBody;
  const { firstName, lastName, email, message } = body;
  const requiredFields = ["firstName", "lastName", "email", "message"];

  // Check all of the required fields are present in the body
  for (const key of requiredFields) {
    if (!body[key as keyof IEventBody]) {
      return {
        statusCode: 400,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: `Missing field: ${key}` }),
      };
    }
  }

  // Config for SES to send the email
  const params = {
    // Email address the email is sent to
    Destination: {
      ToAddresses: [VERIFIED_EMAIL],
    },
    Message: {
      // Body of the email
      Body: {
        Text: {
          Data: `
New message:
---
Name:${firstName} ${lastName}
Email: ${email}
Message: ${message}
`,
        },
      },
      // Subject line of the email
      Subject: { Data: `Contact Form Message` },
    },
    // Email address the email is sent from
    Source: VERIFIED_EMAIL,
  };


  // Send the email
  try {
    const response = await sesClient.send(new SendEmailCommand(params));
    console.log(response);

    if (response.$metadata.httpStatusCode !== 200) {
      return {
        statusCode: 500,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Error sending email" }),
      };
    }

    return {
      statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
        },
      body: JSON.stringify({ message: "Email sent" }),
    };
  } catch (e) {
    return {
      statusCode: 500,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
        },
      body: JSON.stringify({ message: e }),
    };
  }
};