"use client";

import { useEffect, useRef, useState } from "react";

const nRun = 3;
const fileNames = [
    "02.wav",
    "03.wav",
    "07.wav",
    "08.wav",
    "09.wav",
    "10.wav",
];

const randomizedFileNames = fileNames.sort(() => Math.random() - 0.5).slice(0, nRun);

// const shuffleExp = () =>
//   Math.random() > 0.5 ? ["Baseline", "Proposed"] : ["Proposed", "Baseline"];

// const phrases = randomizedFileNames.map((filename) => {
//   const [first, second] = shuffleExp(); // Get a randomized order for 'MT' and 'MASS'
//   return [
//     `excerpts/Anchor/${filename}`,
//     `excerpts/${first}/${filename}`,
//     `excerpts/${second}/${filename}`,
//   ];
// });

// console.log(phrases)

const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  
  // Create randomized phrases
  const phrases: string[][] = randomizedFileNames.map((filename) => {
    const sources: string[] = [
      `excerpts/Anchor/${filename}`,
      `excerpts/Baseline/${filename}`,
      `excerpts/Proposed/${filename}`,
    ];
    return shuffleArray(sources);
  });

// console.log(phrases)

export default function Home() {
  const [stage, setStage] = useState<"start" | "training" | "end">("start");
  const [isRecording, setIsRecording] = useState(false);
  const [keyPresses, setKeyPresses] = useState<Record<string, number[]>>({});

  const [keypressMessage, setKeypressMessage] = useState<string | null>(null);

  const [ratings, setRatings] = useState<
      Record<string, { rating1: number; rating2: number }>
    >({});

  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [rating1, setRating1] = useState<number | null>(null);
  const [rating2, setRating2] = useState<number | null>(null);

  const [startTime, setStartTime] = useState<number | null>(null);

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string>(phrases[0][0]);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentActionIndex, setCurrentActionIndex] = useState(-1);
  const [countdown, setCountdown] = useState(5);

  // Define the order of phases and phrases
//   const actions = ["PromptCountdown", "Phrase", "Rate"];
  const actions = [ "PromptCountdown", "Phrase", "Rate",];
  const phases = ["Anchor", "Baseline", "Proposed"];


  const audioRef = useRef<HTMLAudioElement>(null);

  // Function to advance to the next phase or phrase
  const advancePhase = () => {

    if (actions[currentActionIndex] === "Rate" && !hasSubmittedRating) {
        return; // Wait until submit is clicked
      }
    // setHasSubmittedRating(false); // Reset for next time

    const nextActionIndex = currentActionIndex + 1;

    const nextPhaseIndex =
      nextActionIndex >= actions.length
        ? currentPhaseIndex + 1
        : currentPhaseIndex;
    const nextPhraseIndex =
      nextPhaseIndex >= phases.length
        ? currentPhraseIndex + 1
        : currentPhraseIndex;


    if (nextActionIndex >= actions.length) {
      setCurrentActionIndex(0);
    } else {
      setCurrentActionIndex(nextActionIndex);
    }

    if (nextPhaseIndex >= phases.length) {
      setCurrentPhaseIndex(0);
    } else {
      setCurrentPhaseIndex(nextPhaseIndex);
    }

    if (nextPhraseIndex >= phrases.length) {
      setStage("end");
      exportKeyPresses();
    } else {
      setCurrentPhraseIndex(nextPhraseIndex);
    }

    // Set the audio source for the new phase
    setAudioSrc(phrases[currentPhraseIndex][currentPhaseIndex]);
  };


  useEffect(() => {
    // This effect will play/pause the audio based on the audioPlaying state
    if (audioPlaying && audioRef.current) {
      audioRef.current.play();
    } else if (!audioPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioPlaying]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;

    if (!actions[currentActionIndex]) {
      return;
    }

    if (actions[currentActionIndex] === "Phrase") {
      setIsRecording(true);
      setStartTime(performance.now());
      setAudioPlaying(true);
      setHasSubmittedRating(false); // Reset for next time
      return;
    }

    if (actions[currentActionIndex] === "Rate") {
        advancePhase();
        return;
    }


    setIsRecording(false);

    const timeToWait = 5;

    countdownInterval = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          advancePhase();
          return timeToWait;
        } else {
          return prevCountdown - 1;
        }
      });
    }, 1000);

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [currentActionIndex, hasSubmittedRating]);

  useEffect(() => {
    // When the audio ends, move to the silence phase
    const handleAudioEnd = () => {
      setStartTime(null);
      setAudioPlaying(false); // Stop audio playback

      advancePhase();
    };

    if (audioRef.current) {
      audioRef.current.addEventListener("ended", handleAudioEnd);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleAudioEnd);
      }
    };
  }, [audioRef, currentActionIndex]);

  useEffect(() => {
    const recordKeyPress = (event: KeyboardEvent) => {
      if (event.repeat || !isRecording || event.key < 'A' || event.key > 'z') return;

      const currentTime = performance.now();

      const relativeTime = startTime ? currentTime - startTime : 0;

      setKeyPresses((prevDict) => {
        const key = phrases[currentPhraseIndex][currentPhaseIndex];
        const existingKeyPresses = prevDict[key] || [];
        return {
          ...prevDict,
          [key]: [...existingKeyPresses, relativeTime],
        };
      });
      setKeypressMessage("New musical idea detected");

      // Clear the message after .5 sec
      setTimeout(() => {
        setKeypressMessage(null);
        }, 500);
    };


    if (isRecording) {
      window.addEventListener("keydown", recordKeyPress);
    } else {
      window.removeEventListener("keydown", recordKeyPress);
    }

    return () => {
      window.removeEventListener("keydown", recordKeyPress);
    };
  }, [isRecording, startTime]);

  

  const startTraining = () => {
    setStage("training");
    setIsRecording(true);
    advancePhase();
  };


  const exportKeyPresses = async () => {
    const flatRatings = Object.fromEntries(
        Object.entries(ratings).map(([key, value]) => [
          key,
          Object.values(value)
        ])
      );
    
    const payload = {
        keyPresses,
        flatRatings,
      };

    const flattened: Record<string, string> = {};

    for (const [key, value] of Object.entries(payload.keyPresses)) {
        const shortKey = key.replace("excerpts/", "");
        flattened[`keyPresses-${shortKey}`] = value.join(", ");
      }

    // Flatten flatRatings
    for (const [key, value] of Object.entries(payload.flatRatings)) {
        const shortKey = key.replace("excerpts/", "");
        flattened[`ratings-${shortKey}`] = value.join(", ");
    }

    // const json = JSON.stringify(keyPresses);
    const json = JSON.stringify(flattened);
    console.log(json);
    const response = await fetch("/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: json,
    });

    if (response.ok) {
      console.log("JSON data uploaded successfully");
    } else {
      console.error("Failed to upload JSON data");
    }
  };

  switch (stage) {
    case "start":
      return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div>
            <h1 className="text-center text-3xl font-bold text-gray-800 mb-6">
              Welcome to the nextGEN Muic Evaluation Test
            </h1>
            <h2 className="text-l text-gray-600 mb-4">
                Thank you for your interest. This listening test takes approximately 15 minutes.
            </h2>

            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Instructions
            </h2>

            <ul className="list-disc list-inside text-gray-600 text-l mb-4" style={{ width: '750px' }}>
                <li>Please complete this test on a computer with a headset.</li>
                <li>You will hear 9 music excerpts, with 5 secs of silence between excerpts.</li>
                <li> For each exerpt, you will perform two tasks:
                <ul className="list-disc list-inside ml-4">
                    <li>During listening, press one of the keys from a to z when the music starts and when you hear a new musical idea.</li>
                    <li>After listening, rate the entire excerpt based on its musicality and coherence.</li>
                    <li>Note: It might take a few seconds for each excerpt to start playing - this is normal.</li>
                </ul>
                </li>
                <li>Watch the video below before the test to familiarize yourself with what a new music idea sounds like.</li>
            </ul>

            {/* <h2 className="text-center text-2xl font-semibold text-gray-700 mb-2">
              Sample Music Excerpt
            </h2> */}

            {/* <div className="w-full max-w-screen-lg mx-auto overflow-x-auto" style={{ height:    '200px' }}>
            <MidiVisualizer midiUrl="mozart-sonata11-3_new.mid" />
            </div> */}

            <video
                src="example_melody.mp4" preload="auto"
                controls
                className="w-full max-w-lg mx-auto mb-2 block"
                // className="w-full max-w-xl mb-2 mx-auto block"
            />

            {/* <audio
              src="example.wav"
              preload="auto"
              controls
              className="mb-2 mx-auto"
            /> */}

            <div className="flex">
              <button
                onClick={startTraining}
                className="mx-auto bg-gray-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline hover:bg-gray-700"
              >
                Start Test!
              </button>
            </div>
          </div>
        </div>
      );
    
    case "training":
      return (
        <div className="h-screen bg-gray-100 flex flex-col justify-between">
          <div className="flex justify-between px-4 pt-4">
            <div className="text-xl font-bold text-gray-800">
              Run {currentPhraseIndex + 1}
            </div>

            {/* <div className="text-xl font-bold text-gray-800">
              {phases[currentPhaseIndex] == "Reference"
                ? "Practice Phase"
                : "Test Phase"}
            </div> */}

          </div>
          <div className="flex justify-center items-center flex-grow">
            <div className="text-center">
              <audio ref={audioRef} src={audioSrc} preload="auto" />

              <div className="text-2xl text-gray-800 mb-6">

              {actions[currentActionIndex] === "Rate" ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800 mb-6">
                        Please rate the entire excerpt you just heard.
                    </div>
                    
                    <div className="mb-6">
                        <div className="text-lg text-gray-700 mb-2">
                            1. Musicality
                        </div>
                        <div className="flex justify-center space-x-4">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                key={num}
                                onClick={() => setRating1(num)}
                                className={`w-10 h-10 rounded-full ${
                                    rating1 === num
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                                >
                                    {num}
                                </button>))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="text-lg text-gray-700 mb-2">
                            2. Coherence
                        </div>
                        <div className="flex justify-center space-x-4">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setRating2(num)}
                                    className={`w-10 h-10 rounded-full ${
                                    rating2 === num
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                >
                                    {num}
                                </button>
                                ))}
                        </div>
                    </div>

                    {/* <div className="mb-6">
                    <div className="text-lg text-gray-700 mb-2">
                            3. Resemble a classical sonata?
                    </div>
                    <div className="flex justify-center space-x-4">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setRating3(num)}
                                    className={`w-10 h-10 rounded-full ${
                                    rating3 === num
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                >
                                    {num}
                                </button>
                                ))}
                        </div>
                    </div> */}

                    <button
                        onClick={() => {
                            // Save ratings
                            const key = phrases[currentPhraseIndex][currentPhaseIndex];
                            setRatings((prevRatings) => ({
                                ...prevRatings,
                                [key]: { rating1: rating1!, rating2: rating2! },
                            }));
                        
                            setHasSubmittedRating(true);
                            setRating1(null); // Reset for next round
                            setRating2(null);
                            // advancePhase();
                        }}
                        disabled={rating1 === null || rating2 === null}
                        className={`mt-4 px-6 py-2 font-bold rounded ${
                            rating1 !== null && rating2 !== null
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        >
                        Submit Rating
                        </button>
                    </div>
              ): actions[currentActionIndex] === "Phrase" ? (
                    <div className="text-center">
                        <audio ref={audioRef} src={audioSrc} preload="auto" />

                        <div className="flex flex-col items-center justify-center fixed inset-0 text-2xl font-bold text-gray-800 space-y-4">
                            <div>
                            Press one of the keys from a to z when
                            <li>
                                the music starts
                            </li>
                            <li>
                                you hear a new musical idea
                            </li>
                            </div>            
                        </div>


                        {/* Key press msg */}
                        {/* <div className="message-conainer"> */}
                        <div className="text-xl text-gray-800 mt-28">
                            {keypressMessage && <p>{keypressMessage}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-800 mb-6">
                            Get ready for the next excerpt. < br/>
                            Press a key when the music starts.
                        </div>
                        <div className="text-2xl text-gray-800 mb-6">
                            The next excerpt starts in {countdown} seconds
                            </div>
                        </div>
                )}


              </div>
            </div>
          </div>
        </div>
      );
    case "end":
      return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Thank you for participating!
            </h1>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline hover:bg-gray-700 ml-4"
            >
              Start New Session
            </button>
          </div>
        </div>
      );
  }
}
