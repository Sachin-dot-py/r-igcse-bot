import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import type { ChemInfo } from '@/utils/apis/cheminfo';

const metals = [
  "lithium", "beryllium", "sodium", "magnesium", "aluminum", 
  "potassium", "calcium", "scandium", "titanium", "vanadium", 
  "chromium", "manganese", "iron", "cobalt", "nickel", "copper", 
  "zinc", "gallium", "strontium", "yttrium", "zirconium", 
  "niobium", "molybdenum", "ruthenium", "rhodium", "palladium", "silver", 
  "cadmium", "lanthanum", "cerium", "praseodymium", "neodymium", "promethium", 
  "samarium", "europium", "gadolinium", "terbium", "dysprosium", "holmium", "erbium"
]

const elements = [
  "hydrogen", "helium", "lithium", "beryllium", "boron", "carbon", "nitrogen", "oxygen", "fluorine", "neon", "sodium", "magnesium", "aluminum", "silicon", "phosphorus", "sulfur", "chlorine", "argon",
  "potassium", "calcium", "scandium", "titanium", "vanadium", "chromium", "manganese", "iron", "cobalt", "nickel", "copper", "zinc", "gallium", "germanium", "arsenic", "selenium", "bromine", "krypton",
  "rubidium", "strontium", "yttrium", "zirconium", "niobium", "molybdenum", "technetium", "ruthenium", "rhodium", "palladium", "silver", "cadmium", "indium", "tin", "antimony", "tellurium", "iodine", "xenon",
  "cesium", "barium", "lanthanum", "cerium", "praseodymium", "neodymium", "promethium", "samarium", "europium", "gadolinium", "terbium", "dysprosium", "holmium", "erbium", "thulium", "ytterbium", "lutetium", "hafnium", "tantalum", "tungsten", "rhenium", "osmium", "iridium", "platinum", "gold", "mercury",
  "thallium", "lead", "bismuth", "polonium", "astatine", "radon", "francium", "radium", "actinium", "thorium", "protactinium", "uranium", "neptunium", "plutonium", "americium", "curium", " berkelium", "californium", "einsteinium", "fermium", "mendelevium", "nobelium", "lawrencium", "rutherfordium", "dubnium", "seaborgium", "bohrium", "hassium",
  "h", "he", "li", "be", "b", "c", "n", "o", "f", "ne", "na", "mg", "al", "si", "p", "s", "cl", "ar",
  "k", "ca", "sc", "ti", "v", "cr", "mn", "fe", "co", "ni", "cu", "zn", "ga", "ge", "as", "se", "br", "kr",
  "rb", "sr", "y", "zr", "nb", "mo", "tc", "ru", "rh", "pd", "ag", "cd", "in", "sn", "sb", "te", "i", "xe",
  "cs", "ba", "la", "ce", "pr", "nd", "pm", "sm", "eu", "gd", "tb", "dy", "ho", "er", "tm", "yb", "lu", "hf", "ta", "w", "re", "os", "ir", "pt", "au", "hg",
  "tl", "pb", "bi", "po", "at", "rn", "fr", "ra", "ac", "th", "pa", "u", "np", "pu", "am", "cm", "bk", "cf", "es", "fm", "md", "no", "lr", "rf", "db", "sg", "bh", "hs"
]

export default class ChemInfoCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("cheminfo")
        .setDescription("Get information about a chemical")
        .addStringOption((option) =>
          option
            .setName("chemical")
            .setDescription("The chemical to get information about")
            .setRequired(true)
        )
        .setDMPermission(true)
    );
  }

async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction): Promise<void> {
            await interaction.deferReply();

            let chemical = interaction.options.getString("chemical", true).toLowerCase();

            const res = (await fetch(
                `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${chemical}/JSON`
            ).then((res) => res.json())) as ChemInfo.APIResponse | ChemInfo.APIErrorResponse;

            if ("Fault" in res) {
                await interaction.editReply(`An error occurred: ${res.Fault.Message}`);
            }
            const compound = (res as ChemInfo.APIResponse).PC_Compounds[0];

            const is_ion = compound.charge != 0; 
            const is_element = !is_ion && compound.atoms.aid.length == 1
            let bonding: string | null;

            const atoms = compound.atoms;
            const charge = compound.charge;
            const props = compound.props;

            let title = props[6].value.sval ?? ''.replace(/;/g, ' ');
			title = title.replace(/;/g, ' ');
            let synonym = props[7].value.sval ?? ''.replace(/;/g, ' ');
			synonym = synonym.replace(/;/g, ' ');

            if (!is_element && metals.some(metal => title.includes(metal))) {
              bonding = "Ionic bonds";
            } else if (metals.some(metal => title.includes(metal))) {
                bonding = "Metallic bonds (Metal)";
            } else if (!is_element) {
                bonding = "Covalent bonds";
            } else {
                bonding = null;
            }
            if (is_ion) {
                bonding = "Can form ionic bonds";
            }

			let j: number = 0;
            for (let i = 0; i < props.length; i++) {
                if (props[i].urn.label == "Molecular Weight") {
                    j = i;
                    break;
                }
            }
            let weight = Math.round(Number(props[j].value.sval));

			let k: number = 0;
			for (let i = 0; i < props.length; i++) {
				if (props[i].urn.label == "Molecular Formula") {
					k = i;
					break;
				}
			}
			const formula_label = props[k].value.sval ?? '';

			let atomic_number: string | number;
			if (elements.includes(chemical)) {
				atomic_number = atoms.element[0]; 
			} else {
				atomic_number = "N/A";
			}

			chemical = chemical.replace(/ /g, '_');
            const embed = new EmbedBuilder()
                .setTitle(`Chemical Information for ${title}`)
                .setDescription(`For more information, click [here](https://pubchem.ncbi.nlm.nih.gov/compound/${chemical})
                                Molecular Weight: ${weight} g/mol
                                Atomic Number: ${atomic_number}
                                [COLOR](https://pubchem.ncbi.nlm.nih.gov/compound/${chemical}}#section=Color-Form&fullscreen=true)
                                Formula: ${formula_label} [Alternative](https://pubchem.ncbi.nlm.nih.gov/compound/${chemical}#section=Molecular-Formula&fullscreen=true)
                                Bonding: ${bonding}
                                Charge: ${charge}
                                SYNONYM: ${synonym}`)
                .setColor("#FF0000");
            await interaction.editReply({ embeds: [embed] });
    }
}