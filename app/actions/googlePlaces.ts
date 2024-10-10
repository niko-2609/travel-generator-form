"use server"
import {Client} from "@googlemaps/google-maps-services-js";

const client  = new Client();

export const googlePlacesAutoComplete = async(input: string) => {
 try {
    console.log(process.env.GOOGLE_API_KEY)
    const response = await client.placeAutocomplete({
        params: {
            input,
            key: process.env.GOOGLE_API_KEY!,
        }
 })
 console.log(response.data.predictions)
    return response.data.predictions
 } catch (error) {
    console.log("AUTOCOMPLETE ERROR:", error)
 }
}