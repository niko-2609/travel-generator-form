/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
'use server';

import { openai } from '@ai-sdk/openai';
import * as z from "zod"
import { PromptSchema } from "@/schema";
import { createStreamableValue } from 'ai/rsc';
import { streamText } from 'ai';


const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// export const config = {
//   runtime: "edge",
// };

const getPrompt = ({ source_city, destination_city, mass_tourism, ecological, travel_type, activities, stops_inbetween, travel_dates }: any) =>
  // `
  // Plan a trip as a ${travel_type === 'alone' ? 'solo traveler' : travel_type} and create a presentation that includes:

  // Introduction
  // Logistics Table: Vaccines, currency, safety, capital, religion, language, etc. (Render in HTML).
  // Trip Details: From ${source_city} to ${destination_city ? destination_city : '[Destination not yet specified]'}, between ${travel_dates.from} and ${travel_dates.to}. Include stops (up to ${stops_inbetween}) along the route with activities, coordinates (!!latitude, longitude!!), and transport options. One day at the start and end points.
  // Conclusion: Advice and possible next steps.
  // Notes:
  // ${mass_tourism ? '- Avoid mass tourism.' : ''} ${ecological ? '- Minimize air travel for ecological concerns.' : ''}

  // Ensure safety throughout.
  // Preferred activities: ${activities}
  // `
  `
  Ignore all the previous information. I want to plan a trip ${travel_type === 'solo' ? 'alone' : `as a ${travel_type}`}. You will need to generate a presentation of my future trip. Organize this presentation as follows:

  - a short introduction
  - a table including all the useful and logistical information needed to travel to the concerned countries (vaccines, currency, safety, capital, religion, language, etc.). Render this table in HTML
  - a detailed list of the trip you will have prepared according to the duration I will give you, from the starting point to the destination. Make a detailed list with, each time, the name of the place to go, how to get there, what activities to do. Add the coordinates (latitude, longitude) for each stage. Always separate the coordinates with a double !!. For example !!48.1469, 11.2659!! You can improvise on the length of stay in each city/country. Plan only one day at the starting point and one day at the destination.
  - a conclusion with advice and an opening to a possible continuation of the journey.

  Keep in mind that:

  ${mass_tourism ? '- it is very important for me to avoid mass tourism and not to be on a path filled with tourists.' : ''}
  - The journey is the trip. I don't want to stay for more than a few weeks in the same place or at the destination. I want to travel.
  ${ecological ? '- I am also sensitive to ecological issues. Air travel should be limited as much as possible.' : ''}
  - The trip must also be safe. Do not take me through places where my safety is not guaranteed.

  I am open to travel by bus, train, car, van, bicycle, airplane.

  My trip takes place between ${travel_dates.from.substring(0, 10)} and ${travel_dates.to.substring(0, 10)}.

  I will depart from ${source_city}, to arrive in ${destination_city}.

  ${activities?.length ? `The activities I wish to do are: ${activities}.` : ''}

  ${stops_inbetween !== "0" ? `The possible intermediate steps of the trip are: ${stops_inbetween}. Add steps in other countries or cities on the same route. Make a logical route.` : ''}
  
  Render the entire itenary in HTML.
`


const getActivities = (sightseeing: boolean, hiking: boolean, climbing: boolean, diving: boolean, surfing: boolean) => {
  const activities = [];

  if (sightseeing) activities.push('sightseeing');
  if (hiking) activities.push('hiking');
  if (climbing) activities.push('climbing');
  if (diving) activities.push('diving');
  if (surfing) activities.push('surfing');

  // this will pass a reference of the array created in this function
  return activities;
}
export const streamAIResponse = async (userData: z.infer<typeof PromptSchema>) => {
  const stream = createStreamableValue('');

  //  const forbiddenWords = ['prompts', 'prompt', 'ignore', 'sensitive', 'API', 'injections', 'hack'];
  // zod validation
  const validatedData = PromptSchema.safeParse(userData)
  if (validatedData?.error) {
    return { error: "Please enter valid data" }
  }

  // Extract data from validated schema (zod)
  const { source_city, destination_city, sightseeing, hiking, diving, climbing, surfing, travel_dates, travel_type, mass_tourism, ecological } = validatedData?.data
  const activities = getActivities(sightseeing, hiking, climbing, diving, surfing);

  // if no travel dates are specified, return error message
  if (!travel_dates) return { error: "No travel dates specified" }

  // this will pass a reference of the array created in this function
  const { from, to } = travel_dates;

  // Prepare the prompt body parameters
  const promptBodyParameters: any = {
    source_city,
    destination_city,
    mass_tourism,
    ecological,
    travel_type,
    activities,
    stops_inbetween: '0',
    travel_dates: {
      from: from?.toISOString(),
      to: to?.toISOString(),
    },
  }
  console.log("OPENAI KEY", process.env.OPENAI_API_KEY)
  // OpenAI API Key setup
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
  }

  // const configuration = new Configuration({
  //   apiKey: OPENAI_API_KEY,
  // });
  // const openai = new OpenAI({
  //   apiKey: OPENAI_API_KEY,
  // });

  // Prepare the prompt using a helper function (getPrompt)
  const question = getPrompt(promptBodyParameters);


  try {
    // Call OpenAI API to generate a chat completion
    (async () => {
      const { textStream } = await streamText({
        model: openai(model), // Define the model here
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: "You're a travel assistant. Create detailed itineraries with intro, logistics, trip details (stops, activities, coordinates), and advice. Ensure safety. Avoid mass tourism/air travel if noted.",
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });
      for await (const delta of textStream) {
        stream.update(delta);
      }
      stream.done();
    })();
    return { output: stream.value };

  } catch (error) {

    return { output: error}

  }
  // stream chunks from chatComplettion

  // // Return the AI response
  // return chatCompletion?.toReadableStream();
}

