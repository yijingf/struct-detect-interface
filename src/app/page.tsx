"use client";

import { useEffect, useRef, useState } from "react";

const fileNames = [
  "03.wav",
//   "04.wav",
//   "05.wav",
];

const randomizedFileNames = fileNames.sort(() => Math.random() - 0.5);

const shuffleExp = () =>
  Math.random() > 0.5 ? ["Baseline", "Proposed"] : ["Proposed", "Baseline"];

const phrases = randomizedFileNames.map((filename) => {
  const [first, second] = shuffleExp(); // Get a randomized order for 'MT' and 'MASS'
  return [
    // `excerpts/Anchor/${filename}`,
    `excerpts/${first}/${filename}`,
    // `excerpts/${second}/${filename}`,
  ];
});

export default function Home() {
  const [stage, setStage] = useState<"start" | "training" | "end">("start");
  const [isRecording, setIsRecording] = useState(false);
  const [keyPresses, setKeyPresses] = useState<Record<string, number[]>>({});

  const [startTime, setStartTime] = useState<number | null>(null);

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string>(phrases[0][0]);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentActionIndex, setCurrentActionIndex] = useState(-1);
  const [countdown, setCountdown] = useState(5);

  // Define the order of phases and phrases
  const actions = ["PromptCountdown", "Phrase"];
//   const phases = ["Anchor", "Baseline", "Proposed"];
  const phases = ["Anchor"];

  const audioRef = useRef<HTMLAudioElement>(null);

  // Function to advance to the next phase or phrase
  const advancePhase = () => {
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
  }, [currentActionIndex]);

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
      if (event.repeat || !isRecording || event.key !== " ") return;

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
    advancePhase();
  };

  const exportKeyPresses = async () => {
    const json = JSON.stringify(keyPresses);
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
              Welcome to the Finger Tapping Test
            </h1>
            <h2 className="text-xl text-gray-600 mb-4">
              This test contains 10 runs and will take approximately 15 minutes.
            </h2>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Instructions
            </h2>
            <ul className="list-disc list-inside text-gray-600 text-lg mb-4">
              <li>For each run, you will hear four music excerpts.</li>
              <li>
                Tap along to the beats by pressing the space bar on your
                keyboard.
              </li>
              <li>
                Please adjust the volume on your device using the sample music
                excerpt before the test.
              </li>
            </ul>

            <h2 className="text-center text-2xl font-semibold text-gray-700 mb-2">
              Sample Music Excerpt
            </h2>
            <audio
              src="phrases/Reference/03.wav"
              preload="auto"
              controls
              className="mb-2 mx-auto"
            />
            <div className="flex">
              <button
                onClick={startTraining}
                className="mx-auto bg-gray-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline hover:bg-gray-700"
              >
                Start Tapping
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
            <div className="text-xl font-bold text-gray-800">
              {phases[currentPhaseIndex] == "Reference"
                ? "Practice Phase"
                : "Test Phase"}
            </div>
          </div>
          <div className="flex justify-center items-center flex-grow">
            <div className="text-center">
              <audio ref={audioRef} src={audioSrc} preload="auto" />
              <div className="text-3xl font-bold text-gray-800 mb-6">
                Please tap to the beats in the way you perceive them.
              </div>
              <div className="text-2xl text-gray-800 mb-6">
                {actions[currentActionIndex] === "Phrase"
                  ? "Start tapping"
                  : `Countdown: ${countdown} seconds`}
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
