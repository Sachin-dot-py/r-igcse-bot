import { metals, atomicNumberToSymbol } from '@/data';

export namespace ChemInfo {
    export interface APIResponse {
        PC_Compounds: PCCompound[];
    }
      
    export interface PCCompound {
        id: PCCompoundID;
        atoms: Atoms;
        bonds: Bonds;
        coords: Coord[];
        charge: number;
        props: Prop[];
        count: Count;
    }
      
    export interface Atoms {
        aid: number[];
        element: number[];
    }
      
    export interface Bonds {
        aid1: number[];
        aid2: number[];
        order: number[];
    }
      
    export interface Coord {
        type: number[];
        aid: number[];
        conformers: Conformer[];
    }
      
    export interface Conformer {
        x: number[];
        y: number[];
    }
      
    export interface Count {
        heavy_atom: number;
        atom_chiral: number;
        atom_chiral_def: number;
        atom_chiral_undef: number;
        bond_chiral: number;
        bond_chiral_def: number;
        bond_chiral_undef: number;
        isotope_atom: number;
        covalent_unit: number;
        tautomers: number;
    }
      
    export interface PCCompoundID {
        id: IDID;
    }
      
    export interface IDID {
        cid: number;
    }
      
    export interface Prop {
        urn: Urn;
        value: Value;
    }
      
    export interface Urn {
        label: string;
        name?: string;
        datatype: number;
        release: string;
        implementation?: string;
        version?: string;
        software?: string;
        source?: string;
        parameters?: string;
    }
      
    export interface Value {
        ival?: number;
        fval?: number;
        binary?: string;
        sval?: string;
    }
      
    export interface APIErrorResponse {
        Fault: Fault;
    }
      
    export interface Fault {
        Code: string;
        Message: string;
        Details: string[];
    }
}

export namespace SynonymInfo {
    export interface InformationList {
        Information: Information[];
    }

    export interface Information {
        CID: number;
        Synonym?: string[];
    }

    export interface APIResponse {
        InformationList: InformationList;
    }
}

export namespace ExperimentalInfo {

    export interface ApiResponse {
        Record: Record;
    }

    export interface StringWithMarkup {
    String: string;
    }

    export interface Information {
    StringWithMarkup: StringWithMarkup[];
    Value: { StringWithMarkup: StringWithMarkup[]; };
    }

    export interface Property {
    TOCHeading: string;
    Information: Information[];
    }

    export interface Subsection {
    TOCHeading: string;
    Section: Property[];
    }

    export interface Section {
    TOCHeading: string;
    Section: Subsection[];
    }

    export interface Record {
    Section: Section[];
    }

    export interface ExperimentalProperties {
    description: string | null;
    color: string | null;
    }
}


export const fetchChemicalData = async (
    chemical: string,
    namespace: string
): Promise<ChemInfo.APIResponse | ChemInfo.APIErrorResponse> => {
    const res = (await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${namespace}/${chemical}/JSON`
        ).then((res) => res.json())) as ChemInfo.APIResponse | ChemInfo.APIErrorResponse;
    return res;
}


export const fetchChemicalSynonyms = async (
    cid: number
): Promise<SynonymInfo.APIResponse> => {
    const res = (await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
        ).then((res) => res.json())) as SynonymInfo.APIResponse;
    return res;
}


export const determineBonding = async (
    compound: ChemInfo.PCCompound, 
    is_element: boolean, 
    is_ion: boolean
): Promise<string | null> => {
    const atoms = compound.atoms.element.map(atomicNumber => atomicNumberToSymbol[atomicNumber] || '');

    if (is_ion) return "Can form ionic bonds";
    if (!is_element && atoms.some(atom => metals.includes(atom))) return "Ionic bonds";
    if (atoms.some(atom => metals.includes(atom))) return "Metallic bonds (Metal)";
    if (!is_element) return "Covalent bonds";

    return null;
}


export const getExperimentalProperties = async (
    cid: number
): Promise<ExperimentalInfo.ExperimentalProperties> => {
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


export const formatFormula = async (
    formula: string
): Promise<string> => {
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
