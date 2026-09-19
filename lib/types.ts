export type DriverResult = {
  driverId: string;
  position: string;
  grid?: string;
  name: string;
  nationality?: string;
  team: string;
  time: string;
  fastestLap?: string;
  points: string;
  image?: string;
};

export type RaceResult = {
  round: string;
  name: string;
  circuitId: string;
  circuit: string;
  locality: string;
  country: string;
  date: string;
  time?: string;
  results: DriverResult[];
};

export type Standing = {
  driverId: string;
  position: string;
  name: string;
  nationality?: string;
  team: string;
  points: string;
  wins?: string;
  image?: string;
};

export type Session = {
  key: string;
  label: string;
  date: string;
  time: string;
};

export type ScheduledRace = {
  round: string;
  season: string;
  name: string;
  circuitId: string;
  circuit: string;
  locality: string;
  country: string;
  latitude?: number;
  longitude?: number;
  date: string;
  time: string;
  url?: string;
  circuitUrl?: string;
  sessions: Session[];
  state: "finished" | "next" | "upcoming";
};

export type CircuitFacts = {
  opened: string;
  length: string;
  laps: string;
  character: string;
  description: string;
  timezone: string;
};

export type CircuitProfile = CircuitFacts & {
  id: string;
  name: string;
  locality: string;
  country: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  wikipediaUrl?: string;
  history?: string;
  historySourceLanguage?: "es" | "en";
  lapRecord?: {
    time: string;
    driver: string;
    car?: string;
    year?: string;
    averageSpeedKph?: number;
  };
};

export type LapTiming = {
  lap: string;
  position: string;
  time: string;
};

export type DriverLaps = {
  driverId: string;
  name: string;
  image?: string;
  laps: LapTiming[];
};

export type RaceDetail = RaceResult & {
  laps: DriverLaps[];
};

export type TelemetryProfile = {
  id: string;
  name: string;
  biography?: {
    nationalityCountryId?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
  };
  championships?: number;
  wins?: number;
  podiums?: number;
  poles?: number;
  races?: number;
  debut?: number;
  lastSeason?: number;
  bestFinish?: number;
  officialPoints?: number;
  constructors?: string[];
  peak?: { rating?: number; season?: number; event?: string };
  model?: {
    rank?: number;
    careerRating?: number;
    currentRating?: number;
    sustainedPrime?: number;
    expectedWins?: number;
    winsAboveExpected?: number;
  };
};

export type DriverProfile = {
  standing?: Standing;
  identity: {
    driverId: string;
    name: string;
    nationality?: string;
    dateOfBirth?: string;
    permanentNumber?: string;
    code?: string;
    image?: string;
  };
  seasonResults: RaceResult[];
  telemetry?: TelemetryProfile;
};

export type F1HomeData = {
  races: RaceResult[];
  standings: Standing[];
  schedule: ScheduledRace[];
  nextRace: ScheduledRace;
  nextCircuit: CircuitProfile;
  updatedAt: string;
  live: boolean;
};
