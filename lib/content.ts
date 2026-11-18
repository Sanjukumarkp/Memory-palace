// Built-in content used when AI generation is off or fails. Every fact here is checked and age-appropriate.
import type { AgeBand } from "./modules";

export type Mcq = { q: string; options: string[]; answer: number };
export type Passage = { title: string; text: string; questions: Mcq[] };
export type OrderedList = { topic: string; items: string[]; example: string; bands: AgeBand[] };
export type Card = { prompt: string; answer: string };

export const PASSAGES: Record<AgeBand, Passage[]> = {
  JUNIOR: [
    {
      title: "Ravi's Red Kite",
      text: "Ravi had a red kite with a long yellow tail. On Sunday morning he went to the park with his sister Meena. The wind was strong, and the kite flew high above the mango tree. Meena held the string while Ravi ran. When they got tired, they sat under the tree and ate two bananas.",
      questions: [
        { q: "What colour was Ravi's kite?", options: ["Blue", "Red", "Green", "Yellow"], answer: 1 },
        { q: "Who went to the park with Ravi?", options: ["His friend", "His dad", "His sister Meena", "His grandma"], answer: 2 },
        { q: "Which tree did the kite fly above?", options: ["Mango tree", "Coconut tree", "Banyan tree", "Apple tree"], answer: 0 },
        { q: "What day was it?", options: ["Monday", "Saturday", "Friday", "Sunday"], answer: 3 },
        { q: "What did they eat?", options: ["Two apples", "Two bananas", "Biscuits", "Mangoes"], answer: 1 },
      ],
    },
    {
      title: "The Busy Ant",
      text: "A small black ant lived under a big stone. Every day she carried tiny crumbs of food back home. One day it began to rain. The ant climbed onto a green leaf and floated like a boat until the rain stopped. Then she walked home and shared her food with her friends.",
      questions: [
        { q: "Where did the ant live?", options: ["In a tree", "Under a big stone", "In a house", "In the grass"], answer: 1 },
        { q: "What did she carry home?", options: ["Leaves", "Water", "Crumbs of food", "Sticks"], answer: 2 },
        { q: "What happened one day?", options: ["It snowed", "It began to rain", "A bird came", "The sun was hot"], answer: 1 },
        { q: "What did the ant use as a boat?", options: ["A green leaf", "A flower", "A stick", "A shell"], answer: 0 },
        { q: "What colour was the ant?", options: ["Red", "Brown", "Black", "Yellow"], answer: 2 },
      ],
    },
  ],
  MIDDLE: [
    {
      title: "How Bees Make Honey",
      text: "Honeybees collect a sweet liquid called nectar from flowers. They store it in a special stomach called the honey stomach and carry it back to the hive. There, worker bees pass the nectar to each other and place it in wax cells. They fan it with their wings so water evaporates and the nectar thickens into honey. Finally, they seal each cell with a wax cap. A single bee makes only about one-twelfth of a teaspoon of honey in its whole life.",
      questions: [
        { q: "What do bees collect from flowers?", options: ["Pollen only", "Nectar", "Water", "Wax"], answer: 1 },
        { q: "Where do bees carry nectar back to the hive?", options: ["In their legs", "In their mouths only", "In a honey stomach", "On their wings"], answer: 2 },
        { q: "Why do bees fan the nectar with their wings?", options: ["To cool the queen", "So water evaporates", "To add pollen", "To make wax"], answer: 1 },
        { q: "What do bees use to seal the cells?", options: ["A wax cap", "Mud", "Leaves", "Honey"], answer: 0 },
        { q: "About how much honey does one bee make in its life?", options: ["One cup", "One spoon", "One-twelfth of a teaspoon", "One jar"], answer: 2 },
        { q: "Which bees pass nectar to each other in the hive?", options: ["Drones", "The queen", "Worker bees", "Baby bees"], answer: 2 },
      ],
    },
    {
      title: "The Water Cycle",
      text: "The Sun heats water in oceans, rivers and lakes, turning it into water vapour. This is called evaporation. As the vapour rises, it cools and turns into tiny droplets that form clouds. This is condensation. When the droplets join and become heavy, they fall as rain, snow or hail. This is precipitation. The water then flows back into rivers and oceans, or soaks into the ground, and the cycle starts again.",
      questions: [
        { q: "What heats the water to start the cycle?", options: ["The wind", "The Sun", "The Moon", "Volcanoes"], answer: 1 },
        { q: "What is it called when water turns into vapour?", options: ["Condensation", "Precipitation", "Evaporation", "Collection"], answer: 2 },
        { q: "What forms when vapour cools?", options: ["Clouds", "Rivers", "Ice", "Wind"], answer: 0 },
        { q: "What is the name for rain, snow or hail falling?", options: ["Evaporation", "Precipitation", "Condensation", "Transpiration"], answer: 1 },
        { q: "Where can water go after it falls?", options: ["Only to the sky", "Into rivers, oceans or the ground", "Only into lakes", "It disappears"], answer: 1 },
        { q: "What is condensation?", options: ["Vapour cooling into droplets", "Water falling as rain", "Water heating up", "Water freezing"], answer: 0 },
      ],
    },
  ],
  SENIOR: [
    {
      title: "Photosynthesis",
      text: "Photosynthesis is the process by which green plants make their own food. It takes place mainly in the leaves, inside tiny structures called chloroplasts, which contain the green pigment chlorophyll. Chlorophyll absorbs sunlight. Using this energy, the plant combines carbon dioxide taken in through small pores called stomata with water absorbed by the roots. The products are glucose, which the plant uses for energy and growth, and oxygen, which is released into the air. Almost all life on Earth depends on this process, directly or indirectly.",
      questions: [
        { q: "Where in the cell does photosynthesis take place?", options: ["Nucleus", "Mitochondria", "Chloroplasts", "Cell wall"], answer: 2 },
        { q: "What does chlorophyll do?", options: ["Absorbs sunlight", "Stores water", "Releases carbon dioxide", "Makes roots grow"], answer: 0 },
        { q: "Through what does carbon dioxide enter the leaf?", options: ["Roots", "Stomata", "Xylem", "Petals"], answer: 1 },
        { q: "Which two raw materials does the plant combine?", options: ["Oxygen and glucose", "Carbon dioxide and water", "Nitrogen and water", "Sunlight and soil"], answer: 1 },
        { q: "Which gas is released as a product?", options: ["Nitrogen", "Carbon dioxide", "Hydrogen", "Oxygen"], answer: 3 },
        { q: "What does the plant use glucose for?", options: ["Energy and growth", "Making chlorophyll only", "Absorbing water", "Attracting insects"], answer: 0 },
        { q: "Where does the plant absorb water?", options: ["Leaves", "Stomata", "Roots", "Flowers"], answer: 2 },
      ],
    },
    {
      title: "The Indian Constitution",
      text: "The Constitution of India was adopted by the Constituent Assembly on 26 November 1949 and came into effect on 26 January 1950, a date now celebrated as Republic Day. Dr B. R. Ambedkar chaired the Drafting Committee. The Constitution describes India as a sovereign, socialist, secular, democratic republic. It guarantees Fundamental Rights to citizens, such as equality before the law and freedom of speech, and also lists Fundamental Duties. It is one of the longest written constitutions in the world.",
      questions: [
        { q: "When did the Constitution come into effect?", options: ["15 August 1947", "26 November 1949", "26 January 1950", "2 October 1950"], answer: 2 },
        { q: "Who chaired the Drafting Committee?", options: ["Jawaharlal Nehru", "Dr B. R. Ambedkar", "Sardar Patel", "Dr Rajendra Prasad"], answer: 1 },
        { q: "Which day is celebrated because of the Constitution coming into effect?", options: ["Independence Day", "Republic Day", "Constitution Week", "Gandhi Jayanti"], answer: 1 },
        { q: "On what date was the Constitution adopted?", options: ["26 November 1949", "26 January 1950", "15 August 1947", "1 January 1950"], answer: 0 },
        { q: "Which of these is a Fundamental Right mentioned?", options: ["Right to vote at 16", "Freedom of speech", "Right to free travel abroad", "Right to a car"], answer: 1 },
        { q: "Besides rights, what else does the Constitution list?", options: ["Fundamental Duties", "National holidays", "School subjects", "State capitals"], answer: 0 },
        { q: "The Constitution is known as one of the world's...", options: ["Shortest", "Oldest", "Longest written", "Unwritten"], answer: 2 },
      ],
    },
  ],
};

export const ORDERED_LISTS: OrderedList[] = [
  { topic: "Colours of the rainbow", items: ["Violet", "Indigo", "Blue", "Green", "Yellow", "Orange", "Red"], example: "VIBGYOR", bands: ["JUNIOR", "MIDDLE"] },
  { topic: "Days of the week (from Monday)", items: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], example: "Make a clapping rhyme: Mon-Tue-Wed, then Thu-Fri, Sat-Sun!", bands: ["JUNIOR"] },
  { topic: "Planets from the Sun", items: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"], example: "My Very Educated Mother Just Served Us Nachos", bands: ["JUNIOR", "MIDDLE", "SENIOR"] },
  { topic: "Continents (largest to smallest)", items: ["Asia", "Africa", "North America", "South America", "Antarctica", "Europe", "Australia"], example: "All Animals Need Space And Eat Apples", bands: ["MIDDLE", "SENIOR"] },
  { topic: "Oceans (largest to smallest)", items: ["Pacific", "Atlantic", "Indian", "Southern", "Arctic"], example: "Penguins Always Inspect Snowy Arctic", bands: ["JUNIOR", "MIDDLE", "SENIOR"] },
  { topic: "Primary colours of light", items: ["Red", "Green", "Blue"], example: "RGB, like a TV screen", bands: ["JUNIOR"] },
  { topic: "Seasons starting with spring", items: ["Spring", "Summer", "Autumn", "Winter"], example: "Some Sunny Afternoons Wait", bands: ["JUNIOR"] },
  { topic: "First 10 elements of the periodic table", items: ["Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon"], example: "Happy Henry Likes Bananas But Could Not Obtain Food Now", bands: ["SENIOR"] },
  { topic: "Great Mughal emperors in order", items: ["Babur", "Humayun", "Akbar", "Jahangir", "Shah Jahan", "Aurangzeb"], example: "Bade Hathi Aaye Jaldi Se Aage", bands: ["MIDDLE", "SENIOR"] },
  { topic: "Layers of the Earth (outside in)", items: ["Crust", "Mantle", "Outer core", "Inner core"], example: "Cats Make Odd Inventions", bands: ["MIDDLE", "SENIOR"] },
  { topic: "Months of the year", items: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], example: "Group them in threes: Jan-Feb-Mar, Apr-May-Jun...", bands: ["JUNIOR", "MIDDLE"] },
  { topic: "Levels of classification in biology", items: ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"], example: "King Philip Came Over For Good Soup", bands: ["SENIOR"] },
  { topic: "Order of operations in maths", items: ["Brackets", "Orders (powers)", "Division", "Multiplication", "Addition", "Subtraction"], example: "BODMAS", bands: ["MIDDLE", "SENIOR"] },
  { topic: "Noble gases (top to bottom)", items: ["Helium", "Neon", "Argon", "Krypton", "Xenon", "Radon"], example: "He Never Arrived; Krypton Xenon Radiated", bands: ["SENIOR"] },
];

// Concrete, easy-to-picture nouns for story, palace and challenge rounds.
export const WORDS = [
  "elephant", "umbrella", "mango", "bicycle", "clock", "rocket", "shoe", "cake", "tiger", "book",
  "kite", "drum", "pizza", "rainbow", "castle", "dragon", "banana", "camera", "guitar", "ladder",
  "monkey", "pillow", "robot", "ship", "snowman", "spoon", "train", "volcano", "whale", "balloon",
  "bucket", "candle", "carrot", "crown", "dolphin", "feather", "frog", "giraffe", "hammer", "helicopter",
  "ice cream", "jellyfish", "key", "lemon", "lion", "magnet", "mirror", "moon", "necklace", "octopus",
  "owl", "parrot", "peacock", "penguin", "pencil", "pineapple", "pirate", "rabbit", "ring", "sandwich",
  "scissors", "shark", "sock", "spider", "star", "sunflower", "teapot", "telescope", "tent", "tomato",
  "toothbrush", "tractor", "trumpet", "turtle", "watermelon", "wheel", "zebra", "anchor", "apple", "basket",
  "bell", "bottle", "butterfly", "cactus", "chair", "cheese", "coconut", "cow", "cupcake", "diamond",
  "duck", "egg", "fire engine", "flag", "football", "ghost", "glove", "horse", "jacket", "lamp",
  "laptop", "lollipop", "map", "mushroom", "noodles", "onion", "paintbrush", "panda", "parachute", "potato",
  "puppy", "queen", "rose", "samosa", "saxophone", "skateboard", "snail", "submarine", "sword", "tortoise",
];

export const PALACE_SPOT_SUGGESTIONS = [
  "Front door", "Shoe rack", "Sofa", "TV", "Dining table", "Kitchen sink", "Fridge", "Stove",
  "Bathroom mirror", "Bed", "Pillow", "Wardrobe", "Study desk", "Window", "Ceiling fan",
  "Balcony", "Staircase", "Bookshelf", "Pooja corner", "Terrace",
];

export const FLASHCARDS: Record<AgeBand, Card[]> = {
  JUNIOR: [
    { prompt: "A baby dog is called a...", answer: "Puppy" },
    { prompt: "A baby cat is called a...", answer: "Kitten" },
    { prompt: "A baby cow is called a...", answer: "Calf" },
    { prompt: "How many legs does a spider have?", answer: "8" },
    { prompt: "How many days are in a week?", answer: "7" },
    { prompt: "What is the capital of India?", answer: "New Delhi" },
    { prompt: "What is 5 + 7?", answer: "12" },
    { prompt: "What is 3 × 4?", answer: "12" },
    { prompt: "What is the national bird of India?", answer: "Peacock" },
    { prompt: "What is the national animal of India?", answer: "Tiger" },
    { prompt: "Opposite of 'hot'?", answer: "Cold" },
    { prompt: "Opposite of 'big'?", answer: "Small" },
    { prompt: "Which planet do we live on?", answer: "Earth" },
    { prompt: "What do bees make?", answer: "Honey" },
    { prompt: "How many months are in a year?", answer: "12" },
    { prompt: "What is 10 − 4?", answer: "6" },
    { prompt: "What colour do you get by mixing blue and yellow?", answer: "Green" },
    { prompt: "Which animal is called the 'ship of the desert'?", answer: "Camel" },
  ],
  MIDDLE: [
    { prompt: "Capital of Japan", answer: "Tokyo" },
    { prompt: "Capital of France", answer: "Paris" },
    { prompt: "Capital of Australia", answer: "Canberra" },
    { prompt: "Largest planet in our solar system", answer: "Jupiter" },
    { prompt: "Gas that plants take in from the air", answer: "Carbon dioxide" },
    { prompt: "Boiling point of water in °C", answer: "100" },
    { prompt: "Longest river in India", answer: "Ganga" },
    { prompt: "7 × 8", answer: "56" },
    { prompt: "9 × 6", answer: "54" },
    { prompt: "12 × 12", answer: "144" },
    { prompt: "Who wrote India's national anthem?", answer: "Rabindranath Tagore" },
    { prompt: "Synonym of 'happy'", answer: "Joyful" },
    { prompt: "Antonym of 'ancient'", answer: "Modern" },
    { prompt: "Hardest natural substance", answer: "Diamond" },
    { prompt: "Number of sides of a hexagon", answer: "6" },
    { prompt: "Organ that pumps blood", answer: "Heart" },
    { prompt: "Smallest prime number", answer: "2" },
    { prompt: "Freezing point of water in °C", answer: "0" },
    { prompt: "Highest mountain in the world", answer: "Mount Everest" },
    { prompt: "Number of states in India", answer: "28" },
  ],
  SENIOR: [
    { prompt: "Chemical symbol for sodium", answer: "Na" },
    { prompt: "Chemical symbol for iron", answer: "Fe" },
    { prompt: "Chemical formula of water", answer: "H2O" },
    { prompt: "Powerhouse of the cell", answer: "Mitochondria" },
    { prompt: "SI unit of force", answer: "Newton" },
    { prompt: "SI unit of electric current", answer: "Ampere" },
    { prompt: "Newton's second law (formula)", answer: "F = ma" },
    { prompt: "Value of π to 2 decimal places", answer: "3.14" },
    { prompt: "Area of a circle (formula)", answer: "πr²" },
    { prompt: "Pythagoras theorem", answer: "a² + b² = c²" },
    { prompt: "Year India became independent", answer: "1947" },
    { prompt: "Year of the First War of Independence (Revolt)", answer: "1857" },
    { prompt: "First Prime Minister of India", answer: "Jawaharlal Nehru" },
    { prompt: "Speed of light (approx.) in km/s", answer: "300,000" },
    { prompt: "pH of pure water", answer: "7" },
    { prompt: "Gas most of the atmosphere is made of", answer: "Nitrogen" },
    { prompt: "Process by which cells divide into two identical cells", answer: "Mitosis" },
    { prompt: "Part of the plant cell that contains chlorophyll", answer: "Chloroplast" },
    { prompt: "Author of 'Discovery of India'", answer: "Jawaharlal Nehru" },
    { prompt: "Largest gland in the human body", answer: "Liver" },
  ],
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
