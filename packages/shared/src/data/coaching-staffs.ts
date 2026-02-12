import type { TeamAbbreviation, Coach } from '../types.js';

export const coachingStaffs: Record<TeamAbbreviation, Coach[]> = {
  // ---- AFC East ----
  BUF: [
    { name: 'Joe Brady', role: 'Head Coach' },
    { name: 'Pete Carmichael Jr.', role: 'Offensive Coordinator' },
    { name: 'Jim Leonhard', role: 'Defensive Coordinator' },
  ],
  MIA: [
    { name: 'Jeff Hafley', role: 'Head Coach' },
    { name: 'Bobby Slowick', role: 'Offensive Coordinator' },
    { name: 'Sean Duggan', role: 'Defensive Coordinator' },
  ],
  NE: [
    { name: 'Mike Vrabel', role: 'Head Coach' },
    { name: 'Josh McDaniels', role: 'Offensive Coordinator' },
    { name: 'Terrell Williams', role: 'Defensive Coordinator' },
  ],
  NYJ: [
    { name: 'Aaron Glenn', role: 'Head Coach' },
    { name: 'Brian Duker', role: 'Offensive Coordinator' },
    { name: 'Chris Banjo', role: 'Defensive Coordinator' },
  ],

  // ---- AFC North ----
  BAL: [
    { name: 'Jesse Minter', role: 'Head Coach' },
    { name: 'Declan Doyle', role: 'Offensive Coordinator' },
    { name: 'Anthony Weaver', role: 'Defensive Coordinator' },
  ],
  CIN: [
    { name: 'Zac Taylor', role: 'Head Coach' },
    { name: 'Dan Pitcher', role: 'Offensive Coordinator' },
    { name: 'Al Golden', role: 'Defensive Coordinator' },
  ],
  CLE: [
    { name: 'Todd Monken', role: 'Head Coach' },
    { name: 'Tommy Rees', role: 'Offensive Coordinator' },
    { name: 'Jim Schwartz', role: 'Defensive Coordinator' },
  ],
  PIT: [
    { name: 'Mike McCarthy', role: 'Head Coach' },
    { name: 'Patrick Graham', role: 'Offensive Coordinator' },
  ],

  // ---- AFC South ----
  HOU: [
    { name: 'DeMeco Ryans', role: 'Head Coach' },
    { name: 'Nick Caley', role: 'Offensive Coordinator' },
    { name: 'Matt Burke', role: 'Defensive Coordinator' },
  ],
  IND: [
    { name: 'Shane Steichen', role: 'Head Coach' },
    { name: 'Jim Bob Cooter', role: 'Offensive Coordinator' },
    { name: 'Lou Anarumo', role: 'Defensive Coordinator' },
  ],
  JAX: [
    { name: 'Liam Coen', role: 'Head Coach' },
    { name: 'Grant Udinski', role: 'Offensive Coordinator' },
    { name: 'Anthony Campanile', role: 'Defensive Coordinator' },
  ],
  TEN: [
    { name: 'Robert Saleh', role: 'Head Coach' },
    { name: 'Brian Daboll', role: 'Offensive Coordinator' },
    { name: 'Gus Bradley', role: 'Defensive Coordinator' },
  ],

  // ---- AFC West ----
  DEN: [
    { name: 'Sean Payton', role: 'Head Coach' },
    { name: 'Davis Webb', role: 'Offensive Coordinator' },
    { name: 'Vance Joseph', role: 'Defensive Coordinator' },
  ],
  KC: [
    { name: 'Andy Reid', role: 'Head Coach' },
    { name: 'Eric Bieniemy', role: 'Offensive Coordinator' },
    { name: 'Steve Spagnuolo', role: 'Defensive Coordinator' },
  ],
  LAC: [
    { name: 'Jim Harbaugh', role: 'Head Coach' },
    { name: 'Mike McDaniel', role: 'Offensive Coordinator' },
    { name: "Chris O'Leary", role: 'Defensive Coordinator' },
  ],
  LV: [{ name: 'Greg Olson', role: 'Interim Head Coach' }],

  // ---- NFC East ----
  DAL: [
    { name: 'Brian Schottenheimer', role: 'Head Coach' },
    { name: 'Klayton Adams', role: 'Offensive Coordinator' },
    { name: 'Christian Parker', role: 'Defensive Coordinator' },
  ],
  NYG: [
    { name: 'John Harbaugh', role: 'Head Coach' },
    { name: 'Dennard Wilson', role: 'Offensive Coordinator' },
    { name: 'Chris Horton', role: 'Defensive Coordinator' },
  ],
  PHI: [
    { name: 'Nick Sirianni', role: 'Head Coach' },
    { name: 'Sean Mannion', role: 'Offensive Coordinator' },
    { name: 'Vic Fangio', role: 'Defensive Coordinator' },
  ],
  WAS: [
    { name: 'Dan Quinn', role: 'Head Coach' },
    { name: 'David Blough', role: 'Offensive Coordinator' },
    { name: 'Daronte Jones', role: 'Defensive Coordinator' },
  ],

  // ---- NFC North ----
  CHI: [
    { name: 'Ben Johnson', role: 'Head Coach' },
    { name: 'Eric Washington', role: 'Offensive Coordinator' },
    { name: 'Richard Hightower', role: 'Defensive Coordinator' },
  ],
  DET: [
    { name: 'Dan Campbell', role: 'Head Coach' },
    { name: 'Drew Petzing', role: 'Offensive Coordinator' },
    { name: 'Kelvin Sheppard', role: 'Defensive Coordinator' },
  ],
  GB: [
    { name: 'Matt LaFleur', role: 'Head Coach' },
    { name: 'Adam Stenavich', role: 'Offensive Coordinator' },
    { name: 'Jonathan Gannon', role: 'Defensive Coordinator' },
  ],
  MIN: [
    { name: "Kevin O'Connell", role: 'Head Coach' },
    { name: 'Wes Phillips', role: 'Offensive Coordinator' },
    { name: 'Brian Flores', role: 'Defensive Coordinator' },
  ],

  // ---- NFC South ----
  ATL: [
    { name: 'Kevin Stefanski', role: 'Head Coach' },
    { name: 'Tommy Rees', role: 'Offensive Coordinator' },
    { name: 'Jeff Ulbrich', role: 'Defensive Coordinator' },
  ],
  CAR: [
    { name: 'Dave Canales', role: 'Head Coach' },
    { name: 'Brad Idzik', role: 'Offensive Coordinator' },
    { name: 'Ejiro Evero', role: 'Defensive Coordinator' },
  ],
  NO: [
    { name: 'Kellen Moore', role: 'Head Coach' },
    { name: 'Doug Nussmeier', role: 'Offensive Coordinator' },
    { name: 'Brandon Staley', role: 'Defensive Coordinator' },
  ],
  TB: [
    { name: 'Todd Bowles', role: 'Head Coach' },
    { name: 'Zac Robinson', role: 'Offensive Coordinator' },
    { name: 'Kacy Rodgers', role: 'Defensive Coordinator' },
  ],

  // ---- NFC West ----
  ARI: [
    { name: 'Mike LaFleur', role: 'Head Coach' },
    { name: 'Nick Rallis', role: 'Offensive Coordinator' },
  ],
  LAR: [
    { name: 'Sean McVay', role: 'Head Coach' },
    { name: 'Chris Shula', role: 'Offensive Coordinator' },
  ],
  SF: [
    { name: 'Kyle Shanahan', role: 'Head Coach' },
    { name: 'Klay Kubiak', role: 'Offensive Coordinator' },
    { name: 'Raheem Morris', role: 'Defensive Coordinator' },
  ],
  SEA: [
    { name: 'Mike Macdonald', role: 'Head Coach' },
    { name: 'Klint Kubiak', role: 'Offensive Coordinator' },
    { name: 'Aden Durde', role: 'Defensive Coordinator' },
  ],
};
