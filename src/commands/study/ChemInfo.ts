import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import BaseCommand, { type DiscordChatInputCommandInteraction } from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import type { ChemInfo, SynonymInfo, ExperimentalInfo } from "@/utils/apis/cheminfo";
import { Logger } from "@discordforge/logger";
import { 
    fetchChemicalData,
    fetchChemicalSynonyms,
    determineBonding,
    getExperimentalProperties,
    formatFormula 
} from "@/utils/apis/cheminfo";

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