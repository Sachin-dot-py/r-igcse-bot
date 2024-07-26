import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import BaseCommand, { type DiscordChatInputCommandInteraction } from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import type { ChemInfo, SynonymInfo, ExperimentalInfo } from "@/utils/apis/cheminfo";
import { Logger } from "@discordforge/logger";

const metals: string[] = [
    "Li", "Be", "Na", "Mg", "K", "Ca", "Rb", "Sr", "Cs", "Ba", "Fr", "Ra", "Sc", "Y",
    "Ti", "Zr", "Hf", "V", "Nb", "Ta", "Cr", "Mo", "W", "Mn", "Tc", "Re", "Fe", "Ru",
    "Os", "Co", "Rh", "Ir", "Ni", "Pd", "Pt", "Cu", "Ag", "Au", "Zn", "Cd", "Hg",
    "Al", "Ga", "In", "Sn", "Tl", "Pb", "Bi"
];

const atomicNumberToSymbol: { [key: number]: string } = {
    3: "Li", 4: "Be", 11: "Na", 12: "Mg", 19: "K", 20: "Ca", 37: "Rb", 38: "Sr",
    55: "Cs", 56: "Ba", 87: "Fr", 88: "Ra", 21: "Sc", 39: "Y", 22: "Ti", 40: "Zr",
    72: "Hf", 23: "V", 41: "Nb", 73: "Ta", 24: "Cr", 42: "Mo", 74: "W", 25: "Mn",
    43: "Tc", 75: "Re", 26: "Fe", 44: "Ru", 76: "Os", 27: "Co", 45: "Rh", 77: "Ir",
    28: "Ni", 46: "Pd", 78: "Pt", 29: "Cu", 47: "Ag", 79: "Au", 30: "Zn", 48: "Cd",
    80: "Hg", 13: "Al", 31: "Ga", 49: "In", 50: "Sn", 81: "Tl", 82: "Pb", 83: "Bi"
};

export default class ChemInfoCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("cheminfo")
                .setDescription("Get information about a chemical")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("Name of chemical compound")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("formula")
                        .setDescription("Formula of chemical compound")
                        .setRequired(false),
                )
                .setDMPermission(true),
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction
    ) {
        await interaction.deferReply();

        const formula = interaction.options.getString("formula", false) || '';
        const name = interaction.options.getString("name", false) || '';

        if (!formula && !name) {
            await interaction.reply({ content: 'Please enter a formula or name', ephemeral: true });
            return;
        }

        try {
            const res = await fetchChemicalData(name || formula, formula ? 'fastformula' : 'name');

            if ('Fault' in res) {
                await interaction.editReply(`An error occurred: ${res.Fault.Message}`);
                return;
            }

            const compound = (res as ChemInfo.APIResponse).PC_Compounds[0];
            const isIon = compound.charge !== 0;
            const isElement = !isIon && compound.atoms.aid.length === 1;

            const bonding = await determineBonding(compound, isElement, isIon);

            const molecularformula =
                compound.props.find(p => p.urn.label === "Molecular Formula")?.value.sval || '';
            const formulaLabel = await formatFormula(molecularformula);

            const cid = compound.id.id.cid;
            const synonymsResponse = await fetchChemicalSynonyms(cid);
            const synonyms =
                (synonymsResponse as SynonymInfo.APIResponse).InformationList.Information[0].Synonym;
            const filteredSynonyms = synonyms
                ? synonyms.filter(synonym => synonym !== molecularformula && !/\d/.test(synonym))
                : [];
            const synonymList =
                filteredSynonyms.length > 0 ? filteredSynonyms.slice(0, 5).join(", ") : "";

            const experimentalProperties = await getExperimentalProperties(cid);

            const weight =
                Math.round(Number(compound.props.find(p => p.urn.label === "Molecular Weight")?.value.sval || "N/A"));
            const atomicNumber = isElement ? compound.atoms.element[0] : "N/A";
            const iupacName = compound.props.find(p => p.urn.label === "IUPAC Name")?.value.sval || '';

            const embed = new EmbedBuilder()
                .setTitle(`${filteredSynonyms[0] || iupacName} (${formulaLabel})`)
                .setDescription(`For more information, [click here](https://pubchem.ncbi.nlm.nih.gov/compound/${cid})`)
                .addFields(
                    { name: "Molecular Weight", value: `${weight} g/mol`, inline: true },
                    { name: "Atomic Number", value: `${atomicNumber}`, inline: true },
                    { name: "Bonding", value: `${bonding}`, inline: true },
                    { name: "Charge", value: `${compound.charge}`, inline: true },
                    { name: "Synonyms", value: `${synonymList || "N/A"}`, inline: true },
                    { name: "Color", value: `${experimentalProperties.color || "N/A"}`, inline: true },
                    { name: "Physical Description", value:
                        `${experimentalProperties.description || "N/A"}`,
                        inline: true }
                )
                .setColor("#FF0000");

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            Logger.error("Error occurred while fetching chemical data:", error);
            await interaction.editReply("Invalid formula or name (an error occurred)");
        }
    }
}


async function fetchChemicalData(chemical: string, namespace: string):
    Promise<ChemInfo.APIResponse | ChemInfo.APIErrorResponse> {
        const res = (await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${namespace}/${chemical}/JSON`
            ).then((res) => res.json())) as ChemInfo.APIResponse | ChemInfo.APIErrorResponse;
        return res;
}


async function fetchChemicalSynonyms(
    cid: number
): Promise<SynonymInfo.APIResponse> {
    const res = (await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
        ).then((res) => res.json())) as SynonymInfo.APIResponse;
    return res;
}


async function determineBonding(
    compound: ChemInfo.PCCompound, 
    is_element: boolean, 
    is_ion: boolean
): Promise<string | null> {
    const atoms = compound.atoms.element.map(atomicNumber => atomicNumberToSymbol[atomicNumber] || '');

    if (is_ion) return "Can form ionic bonds";
    if (!is_element && atoms.some(atom => metals.includes(atom))) return "Ionic bonds";
    if (atoms.some(atom => metals.includes(atom))) return "Metallic bonds (Metal)";
    if (!is_element) return "Covalent bonds";

    return null;
}


async function getExperimentalProperties(
    cid: number
): Promise<ExperimentalInfo.ExperimentalProperties> {
    try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON/`;
        
        const response = await fetch(url);
        const data = await response.json() as ExperimentalInfo.ApiResponse;

        let mainSection = null;

        for (const section of data.Record.Section) {
            if (section.TOCHeading === "Chemical and Physical Properties") {
                mainSection = section;
                break;
            }
        }

        if (!mainSection) {
            return { description: null, color: null };
        }

        let experimentalProperties = null;

        for (const subsection of mainSection.Section) {
            if (subsection.TOCHeading === "Experimental Properties") {
                experimentalProperties = subsection;
                break;
            }
        }

        if (!experimentalProperties) {
            return { description: null, color: null };
        }

        let description = null;
        let color = null;

        for (const property of experimentalProperties.Section) {
            if (property.TOCHeading === "Physical Description") {
                description = property.Information[0].Value.StringWithMarkup[0].String;
                color = property.Information[1].Value.StringWithMarkup[0].String;
                
                if (color) {
                    color = color.split(";")[0];
                }
                break;
            }
        }

        return { description, color };
    } catch (error) {
        return { description: null, color: null };
      }
}


async function formatFormula(formula: string): Promise<string> {
    const translations: { [key: string]: string } = {
        "+1": "⁺¹",
        "+2": "⁺²",
        "+3": "⁺³",
        "+4": "⁺⁴",
        "+5": "⁺⁵",
        "+6": "⁺⁶",
        "+7": "⁺⁷",
        "-1": "⁻¹",
        "-2": "⁻²",
        "-3": "⁻³",
        "-4": "⁻⁴",
        "-5": "⁻⁵",
        "-6": "⁻⁶",
        "-7": "⁻⁷",
        "0": "₀",
        "1": "₁",
        "2": "₂",
        "3": "₃",
        "4": "₄",
        "5": "₅",
        "6": "₆",
        "7": "₇",
        "8": "₈",
        "9": "₉",
    };
    const regex_rule = new RegExp(Object.keys(translations).map(key => key.replace(/[+-]/g, '\\$&')).join("|"), "g");
    return formula.replace(regex_rule, match => translations[match]);
}