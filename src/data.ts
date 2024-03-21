import { type IGuildPreferences } from "@/mongo";

export const ywAliases = [
	"you're welcome",
	"ur welcome",
	"yw",
	"no problem",
	"np",
	"no worries",
	"nw"
];

export const tyAliases = [
	"ty",
	"thanks",
	"thank you",
	"thx",
	"tysm",
	"thank u",
	"thnks",
	"thanku",
	"tyvm",
	"tq"
];

export const practiceSubjects: Record<string, string> = {
	"0455": "Economics",
	//'0606': "Additional Mathematics",
	//'0607': "International Mathematics",
	"0620": "Chemistry",
	//"0580": "Mathematics",
	"0625": "Physics",
	"0610": "Biology"
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
		"CH 8 - International Aspects"
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
		"CH 18 - SEQUENCES AND SERIES"
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
		"CH 11 - Statistics"
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
		"CH 19 - IN THE LAB (CHEMICAL TEST& SALT ANALYSIS)"
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
		"CH 51 - DIFFERENIATION"
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
		"CH 11 - ATOMS AND RADIOACTIVITY"
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
		"CH 21 - HUMAN INFLUENCES ON ECOSYSTEMS"
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
		"CH 21 - Website Authoring"
	]
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
				"https://sites.google.com/view/igcseresources/languages/other-languages"
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
				"https://sites.google.com/view/igcseresources/humanities-and-social-sciences/pakistan-studies"
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
				"https://sites.google.com/view/igcseresources/sciences/psychology"
		},
		Mathematics: {
			Mathematics:
				"https://sites.google.com/view/igcseresources/mathematics/mathematics",
			"Additional Mathematics":
				"https://sites.google.com/view/igcseresources/mathematics/additional-mathematics",
			"International Mathematics":
				"https://sites.google.com/view/igcseresources/mathematics/international-mathematics"
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
				"https://sites.google.com/view/igcseresources/professional-and-creative/food-and-nutrition"
		}
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
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-psychology"
		},
		Mathematics: {
			Mathematics:
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-mathematics"
		},
		"Professional and Creative": {
			"Computer Science":
				"https://sites.google.com/view/igcseresources/asa-level-resources_1/asal-computer-science"
		}
	}
};

interface Preference {
	name: string;
	type: "boolean" | "channel" | "role";
	key: keyof IGuildPreferences;
	maxValues?: number;
}

export const preferences: Preference[] = [
	{
		name: "Enable reputation? (reps)",
		type: "boolean",
		key: "repEnabled"
	},
	{
		name: "Rep will not be counted in these channels",
		type: "channel",
		key: "repDisabledChannelIds",
		maxValues: 25
	},
	{
		name: "Modlog Channel",
		type: "channel",
		key: "modlogChannelId"
	},
	{
		name: "Action Required Channel (Logs users with 10+ interaction points)",
		type: "channel",
		key: "actionRequiredChannelId"
	},
	{
		name: "Welcome Channel",
		type: "channel",
		key: "welcomeChannelId"
	},
	{
		name: "Confessions Channel",
		type: "channel",
		key: "confessionsChannelId"
	},
	{
		name: "Confession Approval Channel",
		type: "channel",
		key: "confessionApprovalChannelId"
	},
	{
		name: "Counting Channel",
		type: "channel",
		key: "countingChannelId"
	},
	{
		name: "HOTM Results Channel",
		type: "channel",
		key: "hotmResultsChannelId"
	},
	{
		name: "Study Session Channel",
		type: "channel",
		key: "studySessionChannelId"
	},
	{
		name: "Modmail Create New DM Channel",
		type: "channel",
		key: "modmailCreateChannelId"
	},
	{
		name: "Modmail Threads Channel",
		type: "channel",
		key: "modmailThreadsChannelId"
	},
	{
		name: "Closed DM Channel",
		type: "channel",
		key: "closedDmChannelId"
	},
	/* {
		name: "Ban Appeal Form Link",
		type: "string",
		key: "banAppealFormLink",
	}, */
	{
		name: "Forced Mute Role",
		type: "role",
		key: "forcedMuteRoleId"
	}
];
