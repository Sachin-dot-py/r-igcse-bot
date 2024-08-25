import type { IGuildPreferences } from "@/mongo";

export const ywAliases = [
	"you're welcome",
	"your welcome",
	"youre welcome",
	"ur welcome",
	"yw",
	"no problem",
	"np",
	"sama sama", // Malay
	"derien", // French
	"de rien", // French
	"pas de problem", // French
	"aucun probleme", // French
	"aucun problème", // French
	"aucune probleme", // French
	"aucune problème", // French
	"عفوا", //  Arabic
	"afwan", // Arabic
	"aafwan", // Arabic
	"شكر على واجب", //  Arabic
	"bitte", // German
	"kein problem", // German
	"gern geschehen", // German
	"不用客气", // Mandarin Chinese
	"不用谢", // Mandarin Chinese
	"不客气", // Mandarin Chinese
	"bu yong", // Mandarin Chinese
	"کوئی بات نہیں", //  Urdu
	"مسئلہ نہیں", //  Urdu
	"مَسْلَہ", //  Urdu
	"koi baat nahi", // Urdu/Hindi
	"masla nahi", // Urdu/Hindi
	"कोई बात नहीं", // Hindi
	"मसला नहीं", // Hindi
];

export const tyAliases = [
	"thanku",
	"tankyou",
	"tank you",
	"thankyou",
	"thank",
	"ty",
	"tyty",
	"tyy",
	"thanks",
	"thank you",
	"thx",
	"tysm",
	"thank u",
	"thnks",
	"thanku",
	"tyvm",
	"tq",
	"tanku",
	"terima", // Malay
	"شكرا", //  Arabic
	"shukran", // Arabic
	"shokran", // Arabic
	"shkran", // Arabic
	"merci", // French
	"remercie", // French
	"remerci", // French
	"谢", // Mandarin Chinese
	"谢谢", // Mandarin Chinese
	"感谢", // Mandarin Chinese
	"感恩", // Mandarin Chinese
	"谢啦", // Mandarin Chinese
	"谢了", // Mandarin Chinese
	"谢过", // Mandarin Chinese
	"没关系", // Mandarin Chinese
	"xiexie", // Mandarin Chinese
	"danke", // German
	"vielen dank", // German
	"شکریہ", //  Urdu
	"shukriya", // Urdu/Hindi
	"shukrya", // Urdu/Hindi
	"shukria", // Urdu/Hindi
	"dhanyewaad", // Hindi
	"dhanyevaad", // Hindi
	"धन्येवात", // Hindi
];

export const botYwResponses = [
	"don worry abou i **(in new york accent)**",
	"i didn even do nothin",
	"ey no problemo",
];

export const practiceSubjects: Record<string, string> = {
	"0455": "Economics",
	//'0606': "Additional Mathematics",
	//'0607': "International Mathematics",
	"0620": "Chemistry",
	//"0580": "Mathematics",
	"0625": "Physics",
	"0610": "Biology",
	//'0417': "Information & Communication Technology (ICT)"
};

export const subjectTopics: Record<string, string[]> = {
	"0455": [
		"CH 1 - Basic Economic Problem: Choice And The Allocation Of Resources",
		"CH 2 - The Allocation Of Resources: How The Market Works; Market Failure",
		"CH 3 - The Individual As Producer, Consumer And Borrower",
		"CH 4 - The Private Firm As Producer And Employer",
		"CH 5 - Role Of Government In Economy",
		"CH 6 - Economic Indicators",
		"CH 7 - Developed And Developing Economies: Trends In Production, Population And Living Standards",
		"CH 8 - International Aspects",
	],
	"0606": [
		"CH 1 - SETS",
		"CH 2 - INTERSECTION POINTS",
		"CH 3 - SURDS,INDICES,LOG",
		"CH 4 - FACTOR THEOREM",
		"CH 5 - MATRICES",
		"CH 6 - COORDINATE GEOMETRY",
		"CH 7 - LINEAR LAW",
		"CH 8 - FUNCTIONS, MODOLUS",
		"CH 9 - TRIGONOMETRY",
		"CH 10 - CIRCULAR MEASURE",
		"CH 11 - PERMUTATION AND COMBINATION",
		"CH 12 - BINOMIAL THEOREM",
		"CH 13 - DIFFERENTIATION",
		"CH 14 - INTEGRATION",
		"CH 15 - KINEMATICS",
		"CH 16 - VECTORS",
		"CH 17 - RELATIVE VELOCITY",
		"CH 18 - SEQUENCES AND SERIES",
	],
	"0607": [
		"CH 6 - Vectors And Transformations",
		"CH 4 - Coordinate Geometry",
		"CH 1 - Number",
		"CH 2 - Algebra",
		"CH 3 - Functions",
		"CH 5 - Geometry",
		"CH 7 - Mensuration",
		"CH 8 - Trigonometry",
		"CH 9 - Sets",
		"CH 10 - Probability",
		"CH 11 - Statistics",
	],
	"0620": [
		"CH 1 - STATES OF MATTER",
		"CH 2 - SEPARATING SUBSTANCES",
		"CH 3 - ATOMS AND ELEMENTS",
		"CH 4 - ATOMS COMBINING",
		"CH 5 - REACTING MASSES AND CHEMICAL EQUATIONS",
		"CH 6 - USING MOLES",
		"CH 7 - REDOX REACTIONS",
		"CH 8 - ELECTRICITY AND CHEMICAL CHANGES",
		"CH 9 - ENERGY CHANGES AND REVERSIBLE REACTIONS",
		"CH 10 - THE SPEED OF A REACTION",
		"CH 11 - ACIDS AND BASES",
		"CH 12 - THE PERIODIC TABLE",
		"CH 13 - THE BEHAVIOR OF METALS",
		"CH 14 - MAKING USE OF METALS",
		"CH 15 - AIR AND WATER",
		"CH 16 - SOME NON-METALS AND THEIR COMPOUNDS",
		"CH 17 - ORGANIC CHEMISTRY",
		"CH 18 - POLYMERS",
		"CH 19 - IN THE LAB (CHEMICAL TEST& SALT ANALYSIS)",
	],
	"0580": [
		"CH 1 - DECIMALS",
		"CH 2 - NUMBER FACTS",
		"CH 3 - RATIONAL AND IRRATIONAL NUMBERS",
		"CH 4 - APPROXIMATION AND ESTIMATION",
		"CH 5 - UPPER AND LOWER BOUND",
		"CH 6 - STANDARD FORM",
		"CH 7 - RATIO AND PROPORTION",
		"CH 8 - FOREIGN EXCHANGE",
		"CH 9 - MAP SCALES",
		"CH 10 - PERCENTAGES",
		"CH 11 - SIMPLE AND COMPOUND INTEREST",
		"CH 12 - SPEED,DISTANCE AND TIME",
		"CH 13 - FORMULAEE",
		"CH 14 - BRACKETS AND SYMPLIFYING",
		"CH 15 - LINEAR EQUAETION",
		"CH 16 - SIMULTANEOUS EQUATIONS",
		"CH 17 - FACTORISING",
		"CH 18 - QUADRATIC EQUATIONS",
		"CH 19 - CHANGING THE SUBJECT",
		"CH 20 - VARIATION",
		"CH 21 - INDICES",
		"CH 22 - SOLVING INEQUALITIES",
		"CH 23 - MENSURATION",
		"CH 24 - POLYGONS",
		"CH 25 - PARALLEL LINES",
		"CH 26 - PYTHAGORAS THEOREM",
		"CH 27 - SYMMETRY",
		"CH 28 - SIMILARITY",
		"CH 29 - CONGRUENCE",
		"CH 30 - AREAS & VOLUMES OF SIMILAR SHAPES",
		"CH 31 - CIRCLE THEOREM",
		"CH 32 - CONSTRUCTIONS AND LOCI",
		"CH 33 - TRIGONOMETRY",
		"CH 34 - LINES",
		"CH 35 - PLOTTING CURVES",
		"CH 36 - GRAPHICAL SOLUTION OF EQUATIONS",
		"CH 37 - DISTANCE-TIME GRAPHS",
		"CH 38 - SPEED-TIME GRAPHS",
		"CH 39 - SETS",
		"CH 40 - VECTORS",
		"CH 41 - MATRICES",
		"CH 42 - TRANSFORMATOIN",
		"CH 43 - STATISTICS",
		"CH 44 - PROBABILITY",
		"CH 45 - FUNCTIONS",
		"CH 47 - LINEAR PROGRAMMING",
		"CH 48 - SEQUENCES",
		"CH 49 - ANGLES",
		"CH 50 - NET",
		"CH 51 - DIFFERENIATION",
	],
	"0625": [
		"CH 1 - MEASUREMENTS AND UNITS",
		"CH 4 - FORCES AND ENERGY",
		"CH 3 - FORCES AND PRESSURE",
		"CH 5 - THERMAL EFFECTS",
		"CH 2 - FORCES AND MOTION",
		"CH 7 - RAYS AND WAVES",
		"CH 9 - MAGNETS AND CURRENTS",
		"CH 10 - ELECTRON AND ELECTRONICS",
		"CH 6 - WAVES AND SOUNDS",
		"CH 8 - ELECTRICITY",
		"CH 11 - ATOMS AND RADIOACTIVITY",
	],
	"0610": [
		"CH 1 - CHARACTERISTICS AND CLASSIFICATION OF LIVING ORGANISMS",
		"CH 2 - ORGANIZATION AND MAINTENANCE OF THE ORGANISM",
		"CH 3 - MOVEMENT IN AND OUT OF CELLS",
		"CH 4 - BIOLOGICAL MOLECULES",
		"CH 5 - ENZYMES",
		"CH 6 - PLANT NUTRITION",
		"CH 7 - HUMAN NUTRITION",
		"CH 8 - TRANSPORT IN PLANTS",
		"CH 9 - TRANSPORT IN ANIMALS",
		"CH 10 - DISEASES AND IMMUNITY",
		"CH 11 - GAS EXCHANGE IN HUMANS",
		"CH 12 - RESPIRATION",
		"CH 13 - EXCRETION IN HUMANS",
		"CH 14 - CO-ORDINATION AND RESPONSE",
		"CH 15 - DRUGS",
		"CH 16 - REPRODUCTION",
		"CH 17 - INHERITANCE",
		"CH 18 - VARIATION AND SELECTION",
		"CH 19 - ORGANISMS AND THEIR ENVIRONMENT",
		"CH 20 - BIOTECHNOLOGY AND GENETIC ENGINEERING",
		"CH 21 - HUMAN INFLUENCES ON ECOSYSTEMS",
	],
	"0417": [
		"CH 1 - Types And Components Of Computer Systems",
		"CH 2 - Input And Output Devices",
		"CH 3 - Storage Devices And Media",
		"CH 4 - Networks And The Effects Of Using Them",
		"CH 5 - The Effects Of Using IT",
		"CH 6 - ICT Applications",
		"CH 7 - The Systems Life Cycle",
		"CH 8 - Safety And Security",
		"CH 9 - Audience",
		"CH 10 - Communication",
		"CH 11 - File Management",
		"CH 12 - Images",
		"CH 13 - Layout",
		"CH 14 - Styles",
		"CH 15 - Proofing",
		"CH 16 - Graphs And Charts",
		"CH 17 - Document Production",
		"CH 18 - Data Manipulation",
		"CH 19 - Presentations",
		"CH 20 - Data Analysis",
		"CH 21 - Website Authoring",
	],
};

export const resourceRepositories: Record<
	"ig" | "al",
	Record<string, Record<string, string>>
> = {
	ig: {
		Languages: {
			"First Language English":
				"https://sites.google.com/view/igcseresources/languages/first-language-english",
			"Literature in English":
				"https://sites.google.com/view/igcseresources/languages/english-literature",
			"Hindi as a second language":
				"https://sites.google.com/view/igcseresources/languages/hindi",
			French: "https://sites.google.com/view/igcseresources/languages/french",
			"Other Languages":
				"https://sites.google.com/view/igcseresources/languages/other-languages",
		},
		"Humanities and Social Sciences": {
			Economics:
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/economics",
			History:
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/history",
			Geography:
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/geography",
			Islamiyat:
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/islamiyat",
			"Global Perspectives":
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/global-perspectives",
			Sociology:
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/sociology",
			"Pakistan Studies":
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/pakistan-studies",
		},
		Sciences: {
			Biology:
				"https://sites.google.com/view/igcseresources/sciences/biology",
			Chemistry:
				"https://sites.google.com/view/igcseresources/sciences/chemistry",
			Physics:
				"https://sites.google.com/view/igcseresources/sciences/physics",
			"Combined/Coordinated Sciences":
				"https://sites.google.com/view/igcseresources/sciences/combinedcoordinated-sciences",
			"Environmental Management":
				"https://sites.google.com/view/igcseresources/sciences/environmental-management",
			"Physical Education":
				"https://sites.google.com/view/igcseresources/sciences/physical-education",
			Psychology:
				"https://sites.google.com/view/igcseresources/sciences/psychology",
		},
		Mathematics: {
			Mathematics:
				"https://sites.google.com/view/igcseresources/mathematics/mathematics",
			"Additional Mathematics":
				"https://sites.google.com/view/igcseresources/mathematics/additional-mathematics",
			"International Mathematics":
				"https://sites.google.com/view/igcseresources/mathematics/international-mathematics",
		},
		"Creative and Professional": {
			ICT: "https://sites.google.com/view/igcseresources/professional-and-creative/ict",
			"Computer Science":
				"https://sites.google.com/view/igcseresources/professional-and-creative/computer-science",
			Accounting:
				"https://sites.google.com/view/igcseresources/professional-and-creative/accounting",
			"Business Studies":
				"https://sites.google.com/view/igcseresources/professional-and-creative/business-studies",
			"Art and Design":
				"https://sites.google.com/view/igcseresources/professional-and-creative/art-and-design",
			"Travel and Tourism":
				"https://sites.google.com/view/igcseresources/professional-and-creative/travel-and-tourism",
			"Food and Nutrition":
				"https://sites.google.com/view/igcseresources/professional-and-creative/food-and-nutrition",
		},
	},
	al: {
		Sciences: {
			Biology:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-biology",
			Chemistry:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-chemistry",
			Physics:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-physics",
			Psychology:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-psychology",
		},
		Mathematics: {
			Mathematics:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-mathematics",
		},
		"Professional and Creative": {
			"Computer Science":
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-computer-science",
		},
	},
};

interface Preference {
	name: string;
	type: "rep" | "channel" | "role" | "categoryChannel";
	key: keyof IGuildPreferences;
	maxValues?: number;
}

export const preferences: Preference[] = [
	{
		name: "Enable reputation? (reps)",
		type: "rep",
		key: "repEnabled",
	},
	{
		name: "Rep will not be counted in these channels",
		type: "channel",
		key: "repDisabledChannelIds",
		maxValues: 25,
	},
	{
		name: "Modlog Channel",
		type: "channel",
		key: "modlogChannelId",
	},
	{
		name: "General Log Channel",
		type: "channel",
		key: "generalLogsChannelId",
	},
	{
		name: "Action Required Channel (Logs users with 10+ interaction points)",
		type: "channel",
		key: "actionRequiredChannelId",
	},
	{
		name: "Welcome Channel",
		type: "channel",
		key: "welcomeChannelId",
	},
	{
		name: "Confessions Channel",
		type: "channel",
		key: "confessionsChannelId",
	},
	{
		name: "Confession Approval Channel",
		type: "channel",
		key: "confessionApprovalChannelId",
	},
	{
		name: "Hosted Study Session Approval Channel",
		type: "channel",
		key: "hostSessionApprovalChannelId",
	},
	{
		name: "Counting Channel",
		type: "channel",
		key: "countingChannelId",
	},
	{
		name: "HOTM Results Channel",
		type: "channel",
		key: "hotmResultsChannelId",
	},
	{
		name: "Group Study Announcement Channel",
		type: "channel",
		key: "groupStudyChannelId",
	},
	{
		name: "Hosted Study Session Announcement Channel",
		type: "channel",
		key: "hostSessionChannelId",
	},
	{
		name: "Modmail Create New DM Channel",
		type: "channel",
		key: "modmailCreateChannelId",
	},
	{
		name: "Modmail Threads Channel",
		type: "channel",
		key: "modmailThreadsChannelId",
	},
	{
		name: "Modmail Logs Channel (New message logs)",
		type: "channel",
		key: "modmailLogsChannelId",
	},
	{
		name: "Closed DM Channel",
		type: "channel",
		key: "closedDmChannelId",
	},
	{
		name: "Forced Mute Role",
		type: "role",
		key: "forcedMuteRoleId",
	},
	{
		name: "Archived Sessions Category",
		type: "categoryChannel",
		key: "archiveSessionCategoryId",
	},
	{
		name: "Keyword Approval Channel",
		type: "channel",
		key: "keywordRequestChannelId",
	},
	{
		name: "Tag Approval Channel",
		type: "channel",
		key: "tagResourceApprovalChannelId",
	}
];

interface Subject {
	code: string;
	name: string;
	insert: "in" | "sf" | false;
}

export const allSubjects: Subject[] = [
	{ code: "1123", name: "English-Language", insert: false },
	{ code: "2010", name: "Literature-in-English", insert: false },
	{ code: "2048", name: "Religious-Studies", insert: false },
	{ code: "2055", name: "Hinduism", insert: false },
	{ code: "2058", name: "Islamiyat", insert: false },
	{ code: "2059", name: "Pakistan-Studies", insert: false },
	{ code: "2068", name: "Islamic-Studies", insert: false },
	{ code: "2069", name: "Global-Perspectives", insert: false },
	{ code: "2147", name: "History", insert: false },
	{ code: "2210", name: "Computer-Science", insert: false },
	{ code: "2217", name: "Geography", insert: false },
	{ code: "2251", name: "Sociology", insert: false },
	{ code: "2281", name: "Economics", insert: false },
	{ code: "3015", name: "French", insert: false },
	{ code: "3158", name: "Setswana", insert: false },
	{ code: "3180", name: "Arabic", insert: false },
	{ code: "3204", name: "Bengali", insert: false },
	{ code: "3205", name: "Sinhala", insert: false },
	{ code: "3226", name: "Tamil", insert: false },
	{ code: "3247", name: "Urdu-First-Language", insert: false },
	{ code: "3248", name: "Urdu-Second-Language", insert: false },
	{ code: "4024", name: "Mathematics-D", insert: false },
	{ code: "4037", name: "Mathematics-Additional", insert: false },
	{ code: "4040", name: "Statistics", insert: false },
	{ code: "5014", name: "Environmental-Management", insert: false },
	{ code: "5038", name: "Agriculture", insert: false },
	{ code: "5054", name: "Physics", insert: false },
	{ code: "5070", name: "Chemistry", insert: false },
	{ code: "5090", name: "Biology", insert: false },
	{ code: "5129", name: "Science-Combined", insert: false },
	{ code: "5180", name: "Marine-Science", insert: false },
	{ code: "6043", name: "Design-and-Technology", insert: false },
	{ code: "6065", name: "Food-and-Nutrition", insert: false },
	{ code: "6090", name: "Art-and-Design", insert: false },
	{ code: "6130", name: "Fashion-and-Textiles", insert: false },
	{ code: "7094", name: "Bangladesh-Studies", insert: false },
	{ code: "7096", name: "Travel-and-Tourism", insert: false },
	{ code: "7100", name: "Commerce", insert: false },
	{ code: "7115", name: "Business-Studies", insert: false },
	{ code: "7156", name: "French-9-1", insert: false },
	{ code: "7159", name: "German-9-1", insert: false },
	{ code: "7160", name: "Spanish-9-1", insert: false },
	{ code: "7164", name: "Italian-9-1", insert: false },
	{ code: "7184", name: "Arabic-First-Language-9-1", insert: false },
	{ code: "7707", name: "Accounting", insert: false },
	{
		code: "8021",
		name: "English-General-Paper-AS-Level-only",
		insert: false,
	},
	{
		code: "8281",
		name: "Japanese-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8291",
		name: "Environmental-Management-AS-only",
		insert: false,
	},
	{
		code: "8665",
		name: "Spanish-First-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8673",
		name: "Spanish-Literature-AS-Level-only",
		insert: false,
	},
	{
		code: "8675",
		name: "Hindi-Literature-AS-Level-only",
		insert: false,
	},
	{
		code: "8679",
		name: "Afrikaans-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8680",
		name: "Arabic-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8681",
		name: "Chinese-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8682",
		name: "French-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8683",
		name: "German-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8684",
		name: "Portuguese-Language-AS-Level-only",
		insert: false,
	},
	{
		code: "8685",
		name: "Spanish-Language-AS-Level-only",
		insert: false,
	},
	{ code: "8686", name: "Urdu-Language-AS-Level-only", insert: false },
	{ code: "8687", name: "Hindi-Language-AS-Level-only", insert: false },
	{ code: "8689", name: "Tamil-Language-AS-Level-only", insert: false },
	{
		code: "8695",
		name: "English-Language-and-Literature-AS-Level-only",
		insert: false,
	},
	{ code: "9084", name: "Law", insert: false },
	{ code: "9093", name: "English-Language", insert: false },
	{ code: "9231", name: "Mathematics-Further", insert: false },
	{
		code: "9239",
		name: "Global-Perspectives-and-Research",
		insert: false,
	},
	{ code: "9274", name: "Classical-Studies", insert: false },
	{ code: "9395", name: "Travel-and-Tourism", insert: false },
	{ code: "9396", name: "Physical-Education", insert: false },
	{ code: "9479", name: "Art-and-Design", insert: false },
	{ code: "9481", name: "Digital-Media-and-Design", insert: false },
	{ code: "9482", name: "Drama", insert: false },
	{ code: "9483", name: "Music", insert: false },
	{ code: "9484", name: "Biblical-Studies", insert: false },
	{ code: "9487", name: "Hinduism", insert: false },
	{ code: "9488", name: "Islamic-Studies", insert: false },
	{ code: "9489", name: "History", insert: false },
	{ code: "9609", name: "Business", insert: "in" },
	{ code: "9618", name: "Computer-Science", insert: false },
	{ code: "9626", name: "Information-Technology", insert: false },
	{ code: "9631", name: "Design-and-Textiles", insert: false },
	{ code: "9676", name: "Urdu-A-Level-only", insert: false },
	{ code: "9680", name: "Arabic", insert: false },
	{
		code: "9686",
		name: "Urdu-Pakistan-only-A-Level-only",
		insert: false,
	},
	{ code: "9687", name: "Hindi-A-Level-only", insert: false },
	{ code: "9689", name: "Tamil", insert: false },
	{ code: "9693", name: "Marine-Science", insert: false },
	{ code: "9694", name: "Thinking-Skills", insert: false },
	{ code: "9695", name: "English-Literature", insert: false },
	{ code: "9696", name: "Geography", insert: false },
	{ code: "9699", name: "Sociology", insert: false },
	{ code: "9700", name: "Biology", insert: false },
	{ code: "9701", name: "Chemistry", insert: false },
	{ code: "9702", name: "Physics", insert: false },
	{ code: "9705", name: "Design-and-Technology", insert: false },
	{ code: "9706", name: "Accounting", insert: false },
	{ code: "9708", name: "Economics", insert: false },
	{ code: "9709", name: "Mathematics", insert: false },
	{ code: "9715", name: "Chinese-A-Level-only", insert: false },
	{ code: "9716", name: "French-A-Level-only", insert: false },
	{ code: "9717", name: "German-A-Level-only", insert: false },
	{ code: "9718", name: "Portuguese-A-Level-only", insert: false },
	{ code: "9719", name: "Spanish-A-Level-only", insert: false },
	{
		code: "9980",
		name: "Cambridge-International-Project-Qualification",
		insert: false,
	},
	{ code: "9990", name: "Psychology", insert: false },
	{ code: "0452", name: "Accounting", insert: false },
	{ code: "0985", name: "Accounting-9-1", insert: false },
	{ code: "0548", name: "Afrikaans-Second-Language", insert: false },
	{ code: "0600", name: "Agriculture", insert: false },
	{ code: "0508", name: "Arabic-First-Language", insert: "in" },
	{ code: "0544", name: "Arabic-Foreign-Language", insert: false },
	{ code: "0400", name: "Art-and-Design", insert: false },
	{ code: "0538", name: "Bahasa-Indonesia", insert: "in" },
	{ code: "0610", name: "Biology", insert: false },
	{ code: "0970", name: "Biology-9-1", insert: false },
	{ code: "0450", name: "Business-Studies", insert: "in" },
	{ code: "0986", name: "Business-Studies-9-1", insert: false },
	{ code: "0620", name: "Chemistry", insert: false },
	{ code: "0971", name: "Chemistry-9-1", insert: false },
	{ code: "0509", name: "Chinese-First-Language", insert: "in" },
	{
		code: "0547",
		name: "Chinese-Mandarin-Foreign-Language",
		insert: false,
	},
	{ code: "0523", name: "Chinese-Second-Language", insert: false },
	{ code: "0478", name: "Computer-Science", insert: false },
	{ code: "0984", name: "Computer-Science-9-1", insert: false },
	{ code: "0445", name: "Design-and-Technology", insert: "in" },
	{ code: "0979", name: "Design-and-Technology-9-1", insert: false },
	{ code: "0411", name: "Drama", insert: false },
	{ code: "0994", name: "Drama-9-1", insert: false },
	{ code: "0455", name: "Economics", insert: false },
	{ code: "0987", name: "Economics-9-1", insert: false },
	{
		code: "0511",
		name: "English-as-a-Second-Language-Count-in-Speaking",
		insert: false,
	},
	{
		code: "0991",
		name: "English-as-a-Second-Language-Count-in-Speaking-9-1",
		insert: false,
	},
	{
		code: "0510",
		name: "English-as-a-Second-Language-Speaking-Endorsement",
		insert: false,
	},
	{
		code: "0993",
		name: "English-as-a-Second-Language-Speaking-Endorsement-9-1",
		insert: false,
	},
	{
		code: "0472",
		name: "English-as-an-Additional-Language",
		insert: false,
	},
	{ code: "0500", name: "English-First-Language", insert: "in" },
	{ code: "0990", name: "English-First-Language-9-1", insert: false },
	{ code: "0524", name: "English-First-Language-US", insert: false },
	{
		code: "0475",
		name: "English-Literature-in-English",
		insert: false,
	},
	{
		code: "0992",
		name: "English-Literature-in-English-9-1",
		insert: false,
	},
	{ code: "0427", name: "English-Literature-US", insert: false },
	{ code: "0454", name: "Enterprise", insert: "in" },
	{ code: "0680", name: "Environmental-Management", insert: false },
	{ code: "0648", name: "Food-and-Nutrition", insert: false },
	{ code: "0501", name: "French-First-Language", insert: "in" },
	{ code: "0520", name: "French-Foreign-Language", insert: false },
	{ code: "0460", name: "Geography", insert: "in" },
	{ code: "0976", name: "Geography-9-1", insert: false },
	{ code: "0505", name: "German-First-Language", insert: "in" },
	{ code: "0525", name: "German-Foreign-Language", insert: false },
	{ code: "0457", name: "Global-Perspectives", insert: "in" },
	{ code: "0549", name: "Hindi-as-a-Second-Language", insert: false },
	{ code: "0470", name: "History", insert: false },
	{ code: "0977", name: "History-9-1", insert: false },
	{ code: "0409", name: "History-American-US", insert: false },
	{
		code: "0417",
		name: "Information-and-Communication-Technology",
		insert: "sf",
	},
	{
		code: "0983",
		name: "Information-and-Communication-Technology-9-1",
		insert: false,
	},
	{ code: "0531", name: "IsiZulu-as-a-Second-Language", insert: false },
	{ code: "0493", name: "Islamiyat", insert: false },
	{ code: "0535", name: "Italian-Foreign-Language", insert: false },
	{ code: "0480", name: "Latin", insert: false },
	{ code: "0696", name: "Malay-First-Language", insert: false },
	{ code: "0546", name: "Malay-Foreign-Language", insert: false },
	{ code: "0697", name: "Marine-Science", insert: false },
	{ code: "0580", name: "Mathematics", insert: false },
	{ code: "0980", name: "Mathematics-9-1", insert: false },
	{ code: "0606", name: "Mathematics-Additional", insert: false },
	{ code: "0607", name: "Mathematics-International", insert: false },
	{ code: "0444", name: "Mathematics-US", insert: false },
	{ code: "0410", name: "Music", insert: "in" },
	{ code: "0978", name: "Music-9-1", insert: false },
	{ code: "0448", name: "Pakistan-Studies", insert: "in" },
	{ code: "0413", name: "Physical-Education", insert: false },
	{ code: "0995", name: "Physical-Education-9-1", insert: false },
	{ code: "0652", name: "Physical-Science", insert: false },
	{ code: "0625", name: "Physics", insert: false },
	{ code: "0972", name: "Physics-9-1", insert: false },
	{ code: "0504", name: "Portuguese-First-Language", insert: "in" },
	{ code: "0490", name: "Religious-Studies", insert: false },
	{ code: "0499", name: "Sanskrit", insert: false },
	{ code: "0653", name: "Science-Combined", insert: false },
	{ code: "0973", name: "Sciences-Coordinated-9-1", insert: false },
	{ code: "0654", name: "Sciences-Coordinated-Double", insert: false },
	{ code: "0495", name: "Sociology", insert: false },
	{ code: "0502", name: "Spanish-First-Language", insert: "in" },
	{ code: "0530", name: "Spanish-Foreign-Language", insert: false },
	{ code: "0488", name: "Spanish-Literature", insert: false },
	{ code: "0262", name: "Swahili", insert: false },
	{ code: "0518", name: "Thai-First-Language", insert: "in" },
	{ code: "0471", name: "Travel-and-Tourism", insert: "in" },
	{ code: "0513", name: "Turkish-First-Language", insert: "in" },
	{ code: "0539", name: "Urdu-as-a-Second-Language", insert: false },
	{ code: "0408", name: "World-Literature", insert: false },
];

export const subreddits = ["memes", "dankmemes", "wholesomememes"];

export const metals: string[] = [
	"Li",
	"Be",
	"Na",
	"Mg",
	"K",
	"Ca",
	"Rb",
	"Sr",
	"Cs",
	"Ba",
	"Fr",
	"Ra",
	"Sc",
	"Y",
	"Ti",
	"Zr",
	"Hf",
	"V",
	"Nb",
	"Ta",
	"Cr",
	"Mo",
	"W",
	"Mn",
	"Tc",
	"Re",
	"Fe",
	"Ru",
	"Os",
	"Co",
	"Rh",
	"Ir",
	"Ni",
	"Pd",
	"Pt",
	"Cu",
	"Ag",
	"Au",
	"Zn",
	"Cd",
	"Hg",
	"Al",
	"Ga",
	"In",
	"Sn",
	"Tl",
	"Pb",
	"Bi",
];

export const atomicNumberToSymbol: { [key: number]: string } = {
	3: "Li",
	4: "Be",
	11: "Na",
	12: "Mg",
	19: "K",
	20: "Ca",
	37: "Rb",
	38: "Sr",
	55: "Cs",
	56: "Ba",
	87: "Fr",
	88: "Ra",
	21: "Sc",
	39: "Y",
	22: "Ti",
	40: "Zr",
	72: "Hf",
	23: "V",
	41: "Nb",
	73: "Ta",
	24: "Cr",
	42: "Mo",
	74: "W",
	25: "Mn",
	43: "Tc",
	75: "Re",
	26: "Fe",
	44: "Ru",
	76: "Os",
	27: "Co",
	45: "Rh",
	77: "Ir",
	28: "Ni",
	46: "Pd",
	78: "Pt",
	29: "Cu",
	47: "Ag",
	79: "Au",
	30: "Zn",
	48: "Cd",
	80: "Hg",
	13: "Al",
	31: "Ga",
	49: "In",
	50: "Sn",
	81: "Tl",
	82: "Pb",
	83: "Bi",
};
