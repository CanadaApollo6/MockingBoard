import type { TeamAbbreviation, Coach } from '../types.js';

export const coachingStaffs: Record<TeamAbbreviation, Coach[]> = {
  // ---- AFC East ----
  BUF: [
    { name: 'Joe Brady', role: 'Head Coach', since: 2026 },
    { name: 'Pete Carmichael Jr.', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Jim Leonhard', role: 'Defensive Coordinator', since: 2026 },
  ],
  MIA: [
    { name: 'Jeff Hafley', role: 'Head Coach', since: 2026 },
    { name: 'Bobby Slowick', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Sean Duggan', role: 'Defensive Coordinator', since: 2026 },
  ],
  NE: [
    { name: 'Mike Vrabel', role: 'Head Coach', since: 2025 },
    { name: 'Josh McDaniels', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Terrell Williams', role: 'Defensive Coordinator', since: 2025 },
  ],
  NYJ: [
    { name: 'Aaron Glenn', role: 'Head Coach', since: 2025 },
    { name: 'Brian Duker', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Chris Banjo', role: 'Defensive Coordinator', since: 2025 },
  ],

  // ---- AFC North ----
  BAL: [
    { name: 'Jesse Minter', role: 'Head Coach', since: 2026 },
    { name: 'Declan Doyle', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Anthony Weaver', role: 'Defensive Coordinator', since: 2026 },
  ],
  CIN: [
    { name: 'Zac Taylor', role: 'Head Coach', since: 2019 },
    { name: 'Dan Pitcher', role: 'Offensive Coordinator', since: 2024 },
    { name: 'Al Golden', role: 'Defensive Coordinator', since: 2024 },
  ],
  CLE: [
    { name: 'Todd Monken', role: 'Head Coach', since: 2026 },
    { name: 'Tommy Rees', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Jim Schwartz', role: 'Defensive Coordinator', since: 2024 },
  ],
  PIT: [
    { name: 'Mike McCarthy', role: 'Head Coach', since: 2026 },
    { name: 'Patrick Graham', role: 'Offensive Coordinator', since: 2026 },
  ],

  // ---- AFC South ----
  HOU: [
    { name: 'DeMeco Ryans', role: 'Head Coach', since: 2023 },
    { name: 'Nick Caley', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Matt Burke', role: 'Defensive Coordinator', since: 2025 },
  ],
  IND: [
    { name: 'Shane Steichen', role: 'Head Coach', since: 2023 },
    { name: 'Jim Bob Cooter', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Lou Anarumo', role: 'Defensive Coordinator', since: 2025 },
  ],
  JAX: [
    { name: 'Liam Coen', role: 'Head Coach', since: 2025 },
    { name: 'Grant Udinski', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Anthony Campanile', role: 'Defensive Coordinator', since: 2025 },
  ],
  TEN: [
    { name: 'Robert Saleh', role: 'Head Coach', since: 2026 },
    { name: 'Brian Daboll', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Gus Bradley', role: 'Defensive Coordinator', since: 2026 },
  ],

  // ---- AFC West ----
  DEN: [
    { name: 'Sean Payton', role: 'Head Coach', since: 2023 },
    { name: 'Davis Webb', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Vance Joseph', role: 'Defensive Coordinator', since: 2023 },
  ],
  KC: [
    { name: 'Andy Reid', role: 'Head Coach', since: 2013 },
    { name: 'Eric Bieniemy', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Steve Spagnuolo', role: 'Defensive Coordinator', since: 2019 },
  ],
  LAC: [
    { name: 'Jim Harbaugh', role: 'Head Coach', since: 2024 },
    { name: 'Mike McDaniel', role: 'Offensive Coordinator', since: 2026 },
    { name: "Chris O'Leary", role: 'Defensive Coordinator', since: 2026 },
  ],
  LV: [{ name: 'Greg Olson', role: 'Interim Head Coach', since: 2026 }],

  // ---- NFC East ----
  DAL: [
    { name: 'Brian Schottenheimer', role: 'Head Coach', since: 2025 },
    { name: 'Klayton Adams', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Christian Parker', role: 'Defensive Coordinator', since: 2025 },
  ],
  NYG: [
    { name: 'John Harbaugh', role: 'Head Coach', since: 2026 },
    { name: 'Dennard Wilson', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Chris Horton', role: 'Defensive Coordinator', since: 2026 },
  ],
  PHI: [
    { name: 'Nick Sirianni', role: 'Head Coach', since: 2021 },
    { name: 'Sean Mannion', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Vic Fangio', role: 'Defensive Coordinator', since: 2024 },
  ],
  WAS: [
    { name: 'Dan Quinn', role: 'Head Coach', since: 2024 },
    { name: 'David Blough', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Daronte Jones', role: 'Defensive Coordinator', since: 2026 },
  ],

  // ---- NFC North ----
  CHI: [
    { name: 'Ben Johnson', role: 'Head Coach', since: 2025 },
    { name: 'Eric Washington', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Richard Hightower', role: 'Defensive Coordinator', since: 2025 },
  ],
  DET: [
    { name: 'Dan Campbell', role: 'Head Coach', since: 2021 },
    { name: 'Drew Petzing', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Kelvin Sheppard', role: 'Defensive Coordinator', since: 2025 },
  ],
  GB: [
    { name: 'Matt LaFleur', role: 'Head Coach', since: 2019 },
    { name: 'Adam Stenavich', role: 'Offensive Coordinator', since: 2022 },
    { name: 'Jonathan Gannon', role: 'Defensive Coordinator', since: 2026 },
  ],
  MIN: [
    { name: "Kevin O'Connell", role: 'Head Coach', since: 2022 },
    { name: 'Wes Phillips', role: 'Offensive Coordinator', since: 2022 },
    { name: 'Brian Flores', role: 'Defensive Coordinator', since: 2023 },
  ],

  // ---- NFC South ----
  ATL: [
    { name: 'Kevin Stefanski', role: 'Head Coach', since: 2026 },
    { name: 'Tommy Rees', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Jeff Ulbrich', role: 'Defensive Coordinator', since: 2026 },
  ],
  CAR: [
    { name: 'Dave Canales', role: 'Head Coach', since: 2024 },
    { name: 'Brad Idzik', role: 'Offensive Coordinator', since: 2024 },
    { name: 'Ejiro Evero', role: 'Defensive Coordinator', since: 2024 },
  ],
  NO: [
    { name: 'Kellen Moore', role: 'Head Coach', since: 2025 },
    { name: 'Doug Nussmeier', role: 'Offensive Coordinator', since: 2025 },
    { name: 'Brandon Staley', role: 'Defensive Coordinator', since: 2025 },
  ],
  TB: [
    { name: 'Todd Bowles', role: 'Head Coach', since: 2022 },
    { name: 'Zac Robinson', role: 'Offensive Coordinator', since: 2026 },
    { name: 'Kacy Rodgers', role: 'Defensive Coordinator', since: 2022 },
  ],

  // ---- NFC West ----
  ARI: [
    { name: 'Mike LaFleur', role: 'Head Coach', since: 2026 },
    { name: 'Nick Rallis', role: 'Offensive Coordinator', since: 2026 },
  ],
  LAR: [
    { name: 'Sean McVay', role: 'Head Coach', since: 2017 },
    { name: 'Chris Shula', role: 'Offensive Coordinator', since: 2026 },
  ],
  SF: [
    { name: 'Kyle Shanahan', role: 'Head Coach', since: 2017 },
    { name: 'Klay Kubiak', role: 'Offensive Coordinator', since: 2024 },
    { name: 'Raheem Morris', role: 'Defensive Coordinator', since: 2026 },
  ],
  SEA: [
    { name: 'Mike Macdonald', role: 'Head Coach', since: 2024 },
    { name: 'Klint Kubiak', role: 'Offensive Coordinator', since: 2024 },
    { name: 'Aden Durde', role: 'Defensive Coordinator', since: 2024 },
  ],
};
