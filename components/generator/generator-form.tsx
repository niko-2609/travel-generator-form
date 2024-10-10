/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import * as z from 'zod'
import { PromptSchema } from '@/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { useChat } from 'ai/react';
import ReactDOMServer from "react-dom/server";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from '@/components/ui/input';
import { addDays, format } from "date-fns"
import { Checkbox } from '../ui/checkbox';
import React, { useEffect, useState, useRef, useTransition } from "react";
import { Libraries, useLoadScript } from "@react-google-maps/api";
import { CalendarIcon } from 'lucide-react';
import { googlePlacesAutoComplete } from '@/app/actions/googlePlaces';
import { PlaceAutocompleteResult } from '@googlemaps/google-maps-services-js';
import { readStreamableValue } from 'ai/rsc';
import rehypeRaw from 'rehype-raw';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { formatSuggestions } from '@/utils/string';
import { streamAIResponse } from '@/app/actions/openai';
import { ChatCompletionMessage } from 'openai/resources/index.mjs';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'


const libraries: Libraries = ["places"];



export default function GeneratorForm() {
    const messagesRef = useRef<HTMLDivElement>(null);
    const [sourceCity, setSourceCity] = useState("");
    const [destCity, setDestCity] = useState("");
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
    const [gptResponse, setGPTResponse] = useState<any>();
    const [error, setError] = useState<any>();
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [pending, startTransition] = useTransition();
    const [position, setPosition] = React.useState("");
    const [searchSourceCitystring, setSearchSourceCityString] = useState("")
    const [searchDestCitystring, setSearchDestCityString] = useState("")
    const [sourceCityPredictions, setSourceCityPredictions] = useState<PlaceAutocompleteResult[] | null>([])
    const [destCityPredictions, setDestCityPredictions] = useState<PlaceAutocompleteResult[] | null>([])
   const [generation, setGeneration] = useState<string>('');



    const { messages, input, handleInputChange, handleSubmit } = useChat({
        onResponse(response) {
            if (response) {
                setIsGenerating(false)
            }
        },
        onError(error) {
            if (error) {
                setIsGenerating(false)
            }
        }
    });

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries,
    });
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2024, 11, 20),
        to: addDays(new Date(2024, 0, 20), 20),
    });
    const onSubmit = async (values: z.infer<typeof PromptSchema>) => {
        setHtmlContent("")
        if (position !== null && position !== "") {
            values.travel_type = position
        }
        values.source_city = sourceCity
        values.destination_city = destCity
        console.log(JSON.stringify(values));

        // Call our custom ai route here 
        // try {
        //     await fetch(`http://localhost:3000/api/chat`, {
        //         body: JSON.stringify(values),
        //         method: "POST",
        //     }).then(async (response: any )=> {
        //         console.log(response)
        //     })
        // } catch (error) { 
        //     console.error(error);
        // }
        
        //CALL OPENAI API HERE
        startTransition(() => {
            try {
                // streamAIResponse(values).then((response: any) => {
                //     setComponent(response)
                // });
                (async () => {
                    const { output }  = await streamAIResponse(values);
                    for await (const delta of readStreamableValue(output)) { 
                        setGeneration(currentGeneration => `${currentGeneration}${delta}`);
                    }
                })()
            } catch (error: any) {
                console.error(error);
                setError(error)
            }
        })
    };
    const [htmlContent, setHtmlContent] = useState('');
    const [extraParagraph, setExtraParagraph] = useState('');
  
    useEffect(() => {
      // Step 1: Split the content by </html> to separate the valid HTML and extra text
      const htmlEndIndex = generation.indexOf('</html>');
      
      if (htmlEndIndex !== -1) {
        const htmlPart = generation.slice(0, htmlEndIndex + 7); // Get the HTML document
        const extraText = generation.slice(htmlEndIndex + 7).trim(); // Capture the text after </html>
  
        setHtmlContent(htmlPart);
        setExtraParagraph(extraText); // Store extra paragraph
      } else {
        setHtmlContent(generation); // If no </html> is found, treat the entire content as HTML
      }
    }, [generation]);
  
    useEffect(() => {
        const fetchPredictions = async () => {
            const predictions = await googlePlacesAutoComplete(searchSourceCitystring);
            setSourceCityPredictions(predictions || []);
        }
        fetchPredictions()
    }, [searchSourceCitystring])


    useEffect(() => {
        const fetchPredictions = async () => {
            const predictions = await googlePlacesAutoComplete(searchDestCitystring);
            setDestCityPredictions(predictions || []);
        }
        fetchPredictions()
    }, [searchDestCitystring])

    useEffect(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, [messages]);

    const [travel_type, setSelectedTravelType] = React.useState("")

    const form = useForm<z.infer<typeof PromptSchema>>({
        resolver: zodResolver(PromptSchema),
        defaultValues: {
            travel_dates: date,
            source_city: "",
            destination_city: "",
            travel_type: travel_type,
            ecological: false,
            mass_tourism: false,
            diving: false,
            surfing: false,
            hiking: false,
            climbing: false,
            sightseeing: false,
            stops_inbetween: "0"
        }
    })

    const handleSuggestionSelect = (value: any) => {
        console.log("SUGGESTION SELECTED", value)
    }

    return (
        <div className='flex flex-col items-center justify-center p-4'>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 p-4"
                >
                    <div style={{ display: "flex", flexDirection: 'column', width: "100%", justifyContent: "center", alignItems: 'center' }}>
                        <FormField
                            control={form.control}
                            name="source_city"
                            render={({ field }) => (
                                <>
                                    <FormItem>
                                        <FormLabel className='font-semibold text-lg text-slate-500'>From</FormLabel>
                                        <FormControl>
                                            <Input value={sourceCity || searchSourceCitystring} onChange={(e) => setSearchSourceCityString(e.target.value)} placeholder="Starting from..." onSelect={handleSuggestionSelect} className='w-[460px]' size={18} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    <div className='w-[60%] mt-2'>
                                        {sourceCityPredictions !== null && sourceCityPredictions?.length > 0 && sourceCityPredictions?.map((item) => {
                                            const suggestion = formatSuggestions(item.description)
                                            return (
                                                <p key={item.place_id} className='flex my-2 cursor-pointer' onClick={() => {
                                                    setSourceCityPredictions(null)
                                                    setSourceCity(suggestion)
                                                }}>{suggestion}</p>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destination_city"
                            render={({ field }) => (
                                <>
                                    <FormItem>
                                        <FormLabel className='font-semibold text-lg text-slate-500'>To</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={destCity || searchDestCitystring} onChange={(e) => setSearchDestCityString(e.target.value)} placeholder="Travelling to..." onSelect={handleSuggestionSelect} className='w-[460px]' size={18} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    <div className='w-[60%] mt-2'>
                                        {destCityPredictions !== null && destCityPredictions?.length > 0 && destCityPredictions?.map((item) => {
                                            const suggestion = formatSuggestions(item.description)
                                            return (
                                                <p key={item.place_id} className='flex my-2 cursor-pointer' onClick={() => {
                                                    setDestCityPredictions(null)
                                                    setDestCity(suggestion)
                                                }}>{suggestion}</p>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="travel_dates"
                            render={({ field }) => (
                                <FormItem className='flex flex-col mt-4'>
                                    <FormLabel className='font-semibold text-lg text-slate-500'>Pick your travel dates</FormLabel>
                                    <FormControl>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        id="date"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-[460px] justify-start text-left font-normal",
                                                            !date && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {date?.from ? (
                                                            date?.to ? (
                                                                <>
                                                                    {format(date?.from, "LLL dd, y")} -{" "}
                                                                    {format(date?.to, "LLL dd, y")}
                                                                </>
                                                            ) : (
                                                                format(date.from, "LLL dd, y")
                                                            )
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={date?.from}
                                                    selected={date}
                                                    onSelect={setDate}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className='flex flex-col gap-y-8 pt-4'>
                        <FormField
                            control={form.control}
                            name="travel_type"
                            render={({ field }) => (
                                <FormItem className='flex items-center gap-x-4'>
                                    <FormLabel className='text-lg font-semibold text-slate-500'>You are travelling</FormLabel>
                                    <FormControl>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild className="w-fit">
                                                <Button variant="outline" size="default">{position || "Select travel type"}</Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56">
                                                <DropdownMenuLabel>Travel type</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
                                                    <DropdownMenuRadioItem value="Solo">Solo</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="Group">Group</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stops_inbetween"
                            render={({ field }) => (
                                <FormItem className='flex items-center gap-x-4'>
                                    <FormLabel className='text-lg font-semibold text-slate-500'>Stops in between</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            className='max-w-[150px]'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className='flex py-4'>
                        <FormField
                            control={form.control}
                            name="mass_tourism"
                            render={({ field }) => (
                                <FormItem className=' flex items-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Avoid mass tourism</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ecological"
                            render={({ field }) => (
                                <FormItem className=' flex items-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Sensitivity to ecological issues</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className='flex flex-wrap-reverse items-center py-4'>
                        <FormField
                            control={form.control}
                            name="hiking"
                            render={({ field }) => (
                                <FormItem className='flex items-center justify-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Hiking</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="diving"
                            render={({ field }) => (
                                <FormItem className='flex items-center justify-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Diving</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="climbing"
                            render={({ field }) => (
                                <FormItem className='flex items-center justify-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Climbing</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sightseeing"
                            render={({ field }) => (
                                <FormItem className='flex items-center justify-center px-4 gap-x-2'>
                                    <FormLabel className='mt-2 font-semibold text-slate-500'>Sightseeing</FormLabel>
                                    <FormControl className='flex self-center'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='mt-0'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* <FormError message={error} /> */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={pending}
                    >
                        Generate itenary
                    </Button>

                </form>
            </Form>
            <div>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                {/* <Markdown rehypePlugins={[rehypeRaw]}> 
                   {htmlContent}
                </Markdown> */}
            </div>
            {error && <p className='text-destructive'>Unexpected error occured, please try again</p>}
        </div>
    )
}