import type { Movie } from '../types/movie.types';

export const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Neon Frontier',
    year: 2001,
    runtime: 124,
    rating: 'PG-13',
    posterUrl:
      'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80',
    synopsis:
      'A lone drifter crosses the neon-lit badlands of a dying civilization, searching for the last data relay before the grid shuts down forever.',
    director: 'Marcus Veil',
    starring: ['Leon Castillo', 'Anya Morse'],
    genres: ['Sci-Fi', 'Action'],
    chapters: [
      { number: 1, title: 'The Drift', thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=70' },
      { number: 2, title: 'Grid Zero', thumbnailUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&q=70' },
      { number: 3, title: 'Neon Rain', thumbnailUrl: 'https://images.unsplash.com/photo-1604066867965-2b8b6e8b5a22?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Behind the Scenes' },
      { icon: 'image', label: 'Concept Art Gallery' },
      { icon: 'music_note', label: 'Isolated Score' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'NF-2001-01',
  },
  {
    id: '2',
    title: 'Asphalt Heat',
    year: 1999,
    runtime: 108,
    rating: 'R',
    posterUrl:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80',
    synopsis:
      'Street racer Dex Calloway uncovers a conspiracy buried beneath the asphalt of New Angeles — and the only way out is through.',
    director: 'Rhea Torrance',
    starring: ['Dex Calloway', 'Jin Park'],
    genres: ['Action', 'Thriller'],
    chapters: [
      { number: 1, title: 'First Gear', thumbnailUrl: 'https://images.unsplash.com/photo-1551730458-1e4e87813c7b?w=300&q=70' },
      { number: 2, title: 'The Chase', thumbnailUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&q=70' },
      { number: 3, title: 'Burnout', thumbnailUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Stunt Reel' },
      { icon: 'music_note', label: 'Soundtrack Preview' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'AH-1999-02',
  },
  {
    id: '3',
    title: 'Fog of Doubt',
    year: 2003,
    runtime: 142,
    rating: 'PG-13',
    posterUrl:
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=80',
    synopsis:
      'A detective with a fractured memory must solve a case he may have committed himself, navigating a fog of lies in a rain-soaked city.',
    director: 'Elise Vann',
    starring: ['Cole Harmon', 'Suki Tanaka'],
    genres: ['Mystery', 'Noir'],
    chapters: [
      { number: 1, title: 'The Case', thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=70' },
      { number: 2, title: 'Missing Hours', thumbnailUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&q=70' },
      { number: 3, title: 'The Reveal', thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'image', label: 'Storyboards' },
      { icon: 'videocam', label: 'Deleted Scenes' },
    ],
    technicalSpecs: { audio: 'DTS Surround', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'FD-2003-03',
  },
  {
    id: '4',
    title: 'Orbital Zero',
    year: 2004,
    runtime: 115,
    rating: 'G',
    posterUrl:
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80',
    synopsis:
      'After a solar flare wipes out all satellites, a young engineer must manually reboot the orbital grid before civilization loses contact forever.',
    director: 'Petra Noles',
    starring: ['Sam Vega', 'Lia Cross'],
    genres: ['Sci-Fi', 'Adventure'],
    chapters: [
      { number: 1, title: 'Launch Day', thumbnailUrl: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=300&q=70' },
      { number: 2, title: 'The Flare', thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=70' },
      { number: 3, title: 'Zero Hour', thumbnailUrl: 'https://images.unsplash.com/photo-1537420327992-d6e192287183?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Space Consultation Featurette' },
      { icon: 'music_note', label: 'Score: Ambient Sessions' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'OZ-2004-04',
  },
  {
    id: '5',
    title: 'Whispers in the Wall',
    year: 1998,
    runtime: 96,
    rating: 'R',
    posterUrl:
      'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80',
    synopsis:
      'A family moves into a Victorian house only to discover the walls hold the echoes of a century-old crime that refuses to stay buried.',
    director: 'J.R. Hollis',
    starring: ['Mara Quinn', 'Robert Finch'],
    genres: ['Horror', 'Mystery'],
    chapters: [
      { number: 1, title: 'Moving In', thumbnailUrl: 'https://images.unsplash.com/photo-1520013817300-1f4c3cb2c4d5?w=300&q=70' },
      { number: 2, title: 'The Sound', thumbnailUrl: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300&q=70' },
      { number: 3, title: 'Behind the Wall', thumbnailUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Making the Haunting' },
      { icon: 'image', label: 'Production Design Book' },
      { icon: 'music_note', label: 'Isolated Score' },
    ],
    technicalSpecs: { audio: 'Dolby Surround', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'WW-1998-05',
  },
  {
    id: '6',
    title: 'Neon Velocity',
    year: 2004,
    runtime: 128,
    rating: 'R',
    posterUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    synopsis:
      'In a future where memories are a currency, a rogue data-courier is forced to outrun a shadowy organization after accidentally downloading the blueprint of a forgotten city.',
    director: 'Julian Vane',
    starring: ['Kaelen Vance', 'Sarah J. Moon'],
    genres: ['Sci-Fi', 'Thriller'],
    chapters: [
      { number: 1, title: 'Opening', thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=70' },
      { number: 2, title: 'The Chase', thumbnailUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&q=70' },
      { number: 3, title: 'The Hack', thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Behind the Scenes: The Car Flip' },
      { icon: 'image', label: 'Storyboards & Concepts' },
      { icon: 'music_note', label: 'Isolated Score Track' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'NV-7780-X',
  },
  {
    id: '7',
    title: 'Crimson Tide Rising',
    year: 2002,
    runtime: 118,
    rating: 'PG-13',
    posterUrl:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    synopsis:
      'A geologist discovers that a deep ocean current is shifting, threatening to flood every coastal city on earth within 72 hours.',
    director: 'Omar Reyes',
    starring: ['Clara Mertz', 'Tom Brightwell'],
    genres: ['Thriller', 'Drama'],
    chapters: [
      { number: 1, title: 'Discovery', thumbnailUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=300&q=70' },
      { number: 2, title: '72 Hours', thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&q=70' },
      { number: 3, title: 'The Wave', thumbnailUrl: 'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'VFX Breakdown' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'CTR-2002-07',
  },
  {
    id: '8',
    title: 'Last Signal',
    year: 2000,
    runtime: 99,
    rating: 'PG',
    posterUrl:
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80',
    synopsis:
      'A radio operator at a remote Arctic station picks up a faint transmission that may be the last known signal from a missing deep-space probe.',
    director: 'Nina Adler',
    starring: ['Finn O\'Hare', 'Yuki Sato'],
    genres: ['Sci-Fi', 'Drama'],
    chapters: [
      { number: 1, title: 'Static', thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=70' },
      { number: 2, title: 'The Signal', thumbnailUrl: 'https://images.unsplash.com/photo-1537420327992-d6e192287183?w=300&q=70' },
      { number: 3, title: 'Contact', thumbnailUrl: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'image', label: 'NASA Consultation Notes' },
      { icon: 'music_note', label: 'Ambient Soundscape' },
    ],
    technicalSpecs: { audio: 'Dolby Stereo', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'LS-2000-08',
  },
  {
    id: '9',
    title: 'The Iron Clause',
    year: 2001,
    runtime: 133,
    rating: 'R',
    posterUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    synopsis:
      'A defense attorney discovers a buried clause in a century-old treaty that could either free her client or implicate an entire government.',
    director: 'David Farrow',
    starring: ['Lena Cross', 'Hiro Yamada'],
    genres: ['Thriller', 'Legal Drama'],
    chapters: [
      { number: 1, title: 'The Clause', thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300&q=70' },
      { number: 2, title: 'Evidence', thumbnailUrl: 'https://images.unsplash.com/photo-1453945619913-79ec89a82c51?w=300&q=70' },
      { number: 3, title: 'Verdict', thumbnailUrl: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Deleted Courtroom Scenes' },
      { icon: 'music_note', label: 'Score Session' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'TIC-2001-09',
  },
  {
    id: '10',
    title: 'Desert Protocol',
    year: 2003,
    runtime: 110,
    rating: 'PG-13',
    posterUrl:
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80',
    synopsis:
      'A UN envoy and a local guide must cross 400 miles of hostile desert to deliver a peace treaty before dawn — or war begins.',
    director: 'Amir Holst',
    starring: ['Zara Osei', 'Paul Britten'],
    genres: ['Action', 'Adventure'],
    chapters: [
      { number: 1, title: 'Departure', thumbnailUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=300&q=70' },
      { number: 2, title: 'The Crossing', thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=70' },
      { number: 3, title: 'Dawn', thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=70' },
    ],
    bonusMaterials: [
      { icon: 'play_arrow', label: "Director's Commentary", active: true },
      { icon: 'videocam', label: 'Location Featurette' },
      { icon: 'image', label: 'Production Stills' },
    ],
    technicalSpecs: { audio: 'Dolby 5.1', resolution: '1080i Archive', region: 'Region 1' },
    stockNumber: 'DP-2003-10',
  },
];
